import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * BILLING LOGIC (DATE-TO-DATE MODEL):
 * 
 * For each tenant:
 * - Monthly bill generates on SAME DAY as move_in_date
 * 
 * Example:
 *   move_in_date = 12 Nov 2025
 *   Bills generate on: 12 Dec 2025, 12 Jan 2026, 12 Feb 2026
 * 
 * Edge cases:
 * - If month has fewer days: bill_day = min(move_in_day, last_day_of_month)
 * 
 * Due Date:
 * - Set to 7 days after billing date (grace period for payment)
 * 
 * Visibility:
 * - Future bills (due_date > today): NOT shown in Billing page
 * - Upcoming bills (5-8 days before due): shown in Reminder page
 * - Due/Overdue bills: shown in Billing page
 * - Paid bills: shown at bottom in Billing page
 * 
 * Idempotent:
 * - Checks for existing bill before creating (tenant_id + bill_month)
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Format bill_month as date (first day of month) - DB expects DATE type
    const billMonthDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;

    console.log(`[generate-bills] Running for ${billMonthDate}, day ${currentDay}`);
    console.log(`[generate-bills] Date: ${today.toISOString()}`);

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select(`
        id,
        user_id,
        campus_id,
        rent_amount,
        move_in_date,
        full_name
      `)
      .eq("is_active", true);

    if (tenantsError) {
      console.error("[generate-bills] Error fetching tenants:", tenantsError);
      throw tenantsError;
    }

    console.log(`[generate-bills] Found ${tenants?.length || 0} active tenants`);

    let billsCreated = 0;
    let billsSkipped = 0;
    const results: Array<{ tenant: string; status: string; reason?: string }> = [];

    for (const tenant of tenants || []) {
      const moveInDate = new Date(tenant.move_in_date);
      const moveInDay = moveInDate.getDate();

      // Handle end-of-month edge cases
      // e.g., if move_in_day is 31 but current month only has 30 days
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const billingDay = Math.min(moveInDay, lastDayOfMonth);

      // Only create bill if today is the billing day for this tenant
      if (currentDay !== billingDay) {
        results.push({
          tenant: tenant.full_name,
          status: "skipped",
          reason: `Today (${currentDay}) is not billing day (${billingDay})`,
        });
        continue;
      }

      // Check if bill already exists for this tenant and month (idempotent)
      const { data: existingBill, error: checkError } = await supabase
        .from("bills")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("bill_month", billMonthDate)
        .maybeSingle();

      if (checkError) {
        console.error(`[generate-bills] Error checking existing bill for ${tenant.full_name}:`, checkError);
        results.push({
          tenant: tenant.full_name,
          status: "error",
          reason: checkError.message,
        });
        continue;
      }

      if (existingBill) {
        console.log(`[generate-bills] Bill already exists for ${tenant.full_name} (${billMonthDate})`);
        billsSkipped++;
        results.push({
          tenant: tenant.full_name,
          status: "exists",
          reason: `Bill already exists for ${billMonthDate}`,
        });
        continue;
      }

      // Calculate due date: 7 days after billing date (grace period)
      const dueDate = new Date(currentYear, currentMonth, billingDay + 7);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // Create the bill - using bill_month (DB column name)
      const { error: insertError } = await supabase.from("bills").insert({
        user_id: tenant.user_id,
        tenant_id: tenant.id,
        campus_id: tenant.campus_id,
        bill_month: billMonthDate,
        rent_amount: tenant.rent_amount,
        electricity_amount: 0,
        water_amount: 0,
        other_charges: 0,
        total_amount: tenant.rent_amount,
        due_date: dueDateStr,
        payment_status: "Pending",
      });

      if (insertError) {
        // Handle unique constraint violation gracefully
        if (insertError.code === "23505") {
          console.log(`[generate-bills] Duplicate bill prevented for ${tenant.full_name}`);
          billsSkipped++;
          results.push({
            tenant: tenant.full_name,
            status: "duplicate",
            reason: "Unique constraint prevented duplicate",
          });
        } else {
          console.error(`[generate-bills] Error creating bill for ${tenant.full_name}:`, insertError);
          results.push({
            tenant: tenant.full_name,
            status: "error",
            reason: insertError.message,
          });
        }
      } else {
        console.log(`[generate-bills] Created bill for ${tenant.full_name} (due: ${dueDateStr})`);
        billsCreated++;
        results.push({
          tenant: tenant.full_name,
          status: "created",
          reason: `Due date: ${dueDateStr}`,
        });
      }
    }

    console.log(`[generate-bills] Summary: ${billsCreated} created, ${billsSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        billsCreated,
        billsSkipped,
        billMonthDate,
        date: today.toISOString(),
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("[generate-bills] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

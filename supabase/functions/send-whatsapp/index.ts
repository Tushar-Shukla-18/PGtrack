import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * WhatsApp Cloud API Integration
 * 
 * CONSENT MODEL:
 * 1. Manager must enable whatsapp_consent in their profile
 * 2. Tenant must have whatsapp_optin = true (set via webhook when they message first)
 * 3. Only template messages are sent (no free text)
 * 
 * Templates:
 * - payment_reminder_v2: "Hello {{1}}, this is a reminder from {{4}} that your payment for {{2}} is due on {{3}}. Kindly clear it to avoid late charges. – PGtrack"
 *   Variables: {{1}}=tenant_name, {{2}}=bill_month, {{3}}=due_date, {{4}}=campus_name
 * 
 * - payment_confirmation_v2: "Hello {{1}}, we've received your payment of ₹{{2}} for {{3}}. Your invoice is attached below. Thank you for your timely payment! – PGtrack"
 *   Variables: {{1}}=tenant_name, {{2}}=amount, {{3}}=bill_month
 *   Header: Document (PDF invoice)
 */

interface SendWhatsAppRequest {
  tenantId: string;
  templateName: "payment_reminder_v2" | "payment_confirmation_v2";
  billId?: string;
  userId?: string;
  // Template-specific params
  tenantName: string;
  billMonth: string;      // e.g., "January 2025"
  dueDate?: string;       // e.g., "15 Jan 2025" (for reminder)
  campusName?: string;    // e.g., "Sunrise PG" (for reminder)
  amount?: number;        // e.g., 8500 (for confirmation)
  invoiceUrl?: string;    // PDF URL (for confirmation)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SendWhatsAppRequest = await req.json();
    const { 
      tenantId, 
      templateName, 
      billId,
      userId,
      tenantName,
      billMonth,
      dueDate,
      campusName,
      amount,
      invoiceUrl
    } = body;

    console.log("[send-whatsapp] Request:", { tenantId, templateName, billId, tenantName, billMonth });

    if (!tenantId || !templateName || !tenantName || !billMonth) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenantId, templateName, tenantName, billMonth" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate template-specific required fields
    if (templateName === "payment_reminder_v2" && (!dueDate || !campusName)) {
      return new Response(
        JSON.stringify({ error: "payment_reminder_v2 requires dueDate and campusName" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (templateName === "payment_confirmation_v2") {
      if (amount === undefined) {
        return new Response(
          JSON.stringify({ error: "payment_confirmation_v2 requires amount" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      if (!invoiceUrl) {
        return new Response(
          JSON.stringify({ 
            error: "Payment confirmation requires a PDF invoice URL. PDF generation is not yet configured.",
            code: "INVOICE_REQUIRED"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tenant details including phone and opt-in status
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, full_name, phone, whatsapp_optin, meta_optin_confirmed, user_id")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError || !tenant) {
      console.error("[send-whatsapp] Tenant lookup error:", tenantError);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const managerId = userId || tenant.user_id;

    // Check if manager has WhatsApp consent enabled
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("whatsapp_consent")
      .eq("id", managerId)
      .maybeSingle();

    if (profileError) {
      console.error("[send-whatsapp] Profile lookup error:", profileError);
    }

    if (!profile?.whatsapp_consent) {
      await supabase.from("whatsapp_logs").insert({
        user_id: managerId,
        tenant_id: tenantId,
        bill_id: billId || null,
        message_type: templateName,
        status: "blocked",
        phone: tenant.phone,
        template_name: templateName,
        error_message: "Manager WhatsApp consent not enabled",
      });

      return new Response(
        JSON.stringify({ 
          error: "WhatsApp messaging is disabled. Enable it in Profile settings.",
          code: "MANAGER_CONSENT_DISABLED"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if tenant has opted in for WhatsApp
    if (!tenant.whatsapp_optin) {
      await supabase.from("whatsapp_logs").insert({
        user_id: managerId,
        tenant_id: tenantId,
        bill_id: billId || null,
        message_type: templateName,
        status: "blocked",
        phone: tenant.phone,
        template_name: templateName,
        error_message: "Tenant has not opted in for WhatsApp messages",
      });

      return new Response(
        JSON.stringify({ 
          error: `${tenant.full_name} has not opted in for WhatsApp messages. They must send a message to your WhatsApp Business number first.`,
          code: "TENANT_NOT_OPTED_IN"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get WhatsApp API credentials
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!whatsappToken || !whatsappPhoneId) {
      await supabase.from("whatsapp_logs").insert({
        user_id: managerId,
        tenant_id: tenantId,
        bill_id: billId || null,
        message_type: templateName,
        status: "pending",
        phone: tenant.phone,
        template_name: templateName,
        error_message: "WhatsApp API credentials not configured",
      });

      console.log("[send-whatsapp] API not configured - logging as pending");
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "pending",
          message: "WhatsApp message queued. API integration pending configuration." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Format phone number (ensure it has country code for India)
    let phone = tenant.phone.replace(/\D/g, '');
    if (phone.startsWith("0")) phone = phone.slice(1);
    if (!phone.startsWith("91")) phone = `91${phone}`;

    console.log("[send-whatsapp] Sending to:", phone, "Template:", templateName);

    // Build template components based on template type
    const components: any[] = [];

    if (templateName === "payment_reminder_v2") {
      // Body: Hello {{1}}, this is a reminder from {{4}} that your payment for {{2}} is due on {{3}}.
      // Variables: {{1}}=tenant_name, {{2}}=bill_month, {{3}}=due_date, {{4}}=campus_name
      components.push({
        type: "body",
        parameters: [
          { type: "text", text: tenantName },      // {{1}} tenant name
          { type: "text", text: billMonth },       // {{2}} bill month
          { type: "text", text: dueDate },         // {{3}} due date
          { type: "text", text: campusName },      // {{4}} campus name
        ],
      });
    } else if (templateName === "payment_confirmation_v2") {
      // Header: Document (PDF invoice)
      // Body: Hello {{1}}, we've received your payment of ₹{{2}} for {{3}}.
      // Variables: {{1}}=tenant_name, {{2}}=amount, {{3}}=bill_month

      // Add document header if invoice URL is provided
      if (invoiceUrl) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: invoiceUrl,
                filename: `Invoice_${billMonth.replace(/\s+/g, '_')}.pdf`,
              },
            },
          ],
        });
      }

      components.push({
        type: "body",
        parameters: [
          { type: "text", text: tenantName },                    // {{1}} tenant name
          { type: "text", text: String(amount?.toLocaleString('en-IN')) }, // {{2}} amount
          { type: "text", text: billMonth },                     // {{3}} bill month
        ],
      });
    }

    // Send WhatsApp message via Meta Cloud API
    const requestBody = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: components,
      },
    };

    console.log("[send-whatsapp] Meta API request:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("[send-whatsapp] Meta API error:", result);
      
      await supabase.from("whatsapp_logs").insert({
        user_id: managerId,
        tenant_id: tenantId,
        bill_id: billId || null,
        message_type: templateName,
        status: "failed",
        phone: phone,
        template_name: templateName,
        error_message: result.error?.message || JSON.stringify(result.error),
      });

      return new Response(
        JSON.stringify({ 
          error: result.error?.message || "Failed to send WhatsApp message",
          code: "META_API_ERROR",
          details: result.error
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Log successful send
    await supabase.from("whatsapp_logs").insert({
      user_id: managerId,
      tenant_id: tenantId,
      bill_id: billId || null,
      message_type: templateName,
      status: "sent",
      phone: phone,
      template_name: templateName,
    });

    console.log("[send-whatsapp] Message sent successfully:", result.messages?.[0]?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: "sent",
        messageId: result.messages?.[0]?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("[send-whatsapp] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

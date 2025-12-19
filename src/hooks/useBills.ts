import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PaymentStatus = "Pending" | "Paid" | "Overdue";
export type PaymentMethod = "Cash" | "PhonePe" | "GooglePay" | "Paytm" | "BankTransfer" | "Other";

export interface Bill {
  id: string;
  user_id: string;
  tenant_id: string;
  campus_id: string;
  billing_month: string;
  rent_amount: number;
  electricity_amount: number;
  water_amount: number;
  other_charges: number;
  total_amount: number;
  due_date: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  campus_name?: string;
  room_no?: string;
  tenant_phone?: string;
}

/**
 * BILLING PAGE LOGIC:
 * 
 * Shows bills that are:
 * - Due (due_date <= today) and NOT paid
 * - Overdue (past due date) and NOT paid
 * - Paid bills (shown at bottom for reference)
 * 
 * Does NOT show:
 * - Future bills (due_date > today) - these go to Reminders page
 * 
 * Sorting:
 * - Unpaid first (overdue, then pending)
 * - Paid at bottom
 * - Most recent due dates first within each group
 */
export function useBills(campusId?: string, status?: string) {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    if (!user) return;

    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Build query - only get bills where due_date <= today (not future bills)
    let query = supabase
      .from("bills")
      .select(`
        *,
        tenants(full_name, phone, rooms(room_no)),
        campuses(name)
      `)
      .lte("due_date", todayStr) // Only bills due today or before
      .order("payment_status", { ascending: true }) // Pending/Overdue before Paid
      .order("due_date", { ascending: false }); // Most recent first

    if (campusId && campusId !== "all") {
      query = query.eq("campus_id", campusId);
    }

    if (status && status !== "all") {
      query = query.eq("payment_status", status);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch bills");
      console.error("[useBills] Error:", error);
    } else {
      // Map bills and update overdue status
      const mappedBills = (data || []).map((bill: any) => {
        const dueDate = new Date(bill.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        // Update status to Overdue if past due and not paid
        let paymentStatus = bill.payment_status;
        if (paymentStatus !== "Paid" && dueDate < today) {
          paymentStatus = "Overdue";
        }

        return {
          ...bill,
          // DB column is bill_month; UI expects billing_month
          billing_month: bill.bill_month ?? bill.billing_month,
          payment_status: paymentStatus,
          tenant_name: bill.tenants?.full_name,
          tenant_phone: bill.tenants?.phone,
          room_no: bill.tenants?.rooms?.room_no,
          campus_name: bill.campuses?.name,
        };
      });

      // Sort: Overdue first, then Pending, then Paid
      mappedBills.sort((a: Bill, b: Bill) => {
        const statusOrder = { Overdue: 0, Pending: 1, Paid: 2 };
        const aOrder = statusOrder[a.payment_status] ?? 1;
        const bOrder = statusOrder[b.payment_status] ?? 1;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // Within same status, sort by due date (most recent first)
        return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      });

      setBills(mappedBills);
    }
    setLoading(false);
  };

  const addBill = async (data: {
    tenant_id: string;
    campus_id: string;
    billing_month: string;
    rent_amount: number;
    electricity_amount?: number;
    water_amount?: number;
    other_charges?: number;
    due_date: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const total = data.rent_amount + (data.electricity_amount || 0) + (data.water_amount || 0) + (data.other_charges || 0);

    // Convert billing_month to bill_month (first day of month as date)
    const billMonth = data.billing_month.length === 7 
      ? `${data.billing_month}-01` 
      : data.billing_month;

    const { error } = await supabase.from("bills").insert([
      {
        user_id: user.id,
        tenant_id: data.tenant_id,
        campus_id: data.campus_id,
        bill_month: billMonth,
        due_date: data.due_date,
        rent_amount: data.rent_amount,
        electricity_amount: data.electricity_amount || 0,
        water_amount: data.water_amount || 0,
        other_charges: data.other_charges || 0,
        total_amount: total,
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        toast.error("A bill for this month already exists for this tenant");
      } else {
        toast.error("Failed to add bill");
        console.error("[addBill] Error:", error);
      }
      return { error: new Error(error.message) };
    }

    toast.success("Bill created successfully");
    await fetchBills();
    return { error: null };
  };

  const markAsPaid = async (id: string, paymentMethod: PaymentMethod) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("bills").update({
      payment_status: "Paid" as PaymentStatus,
      payment_method: paymentMethod,
      payment_date: new Date().toISOString().split("T")[0],
    }).eq("id", id);

    if (error) {
      toast.error("Failed to update bill");
      console.error("[markAsPaid] Error:", error);
      return { error: new Error(error.message) };
    }

    toast.success("Bill marked as paid");
    await fetchBills();
    return { error: null };
  };

  const updateBill = async (id: string, data: Partial<Bill>) => {
    const { billing_month, ...rest } = data as any;
    const payload: any = { ...rest };
    
    // Convert billing_month to bill_month if provided
    if (billing_month !== undefined) {
      payload.bill_month = billing_month.length === 7 
        ? `${billing_month}-01` 
        : billing_month;
    }

    const { error } = await supabase.from("bills").update(payload).eq("id", id);

    if (error) {
      toast.error("Failed to update bill");
      console.error("[updateBill] Error:", error);
      return { error: new Error(error.message) };
    }

    toast.success("Bill updated successfully");
    await fetchBills();
    return { error: null };
  };

  // Send payment confirmation via WhatsApp
  const sendPaymentConfirmation = async (billId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      // IMPORTANT: Fetch fresh bill data to avoid stale state issues
      // This prevents sending confirmation to wrong tenant due to React state race conditions
      const { data: freshBill, error: fetchError } = await supabase
        .from("bills")
        .select(`
          *,
          tenants(full_name, phone),
          campuses(name)
        `)
        .eq("id", billId)
        .single();

      if (fetchError || !freshBill) {
        console.error("[sendPaymentConfirmation] Failed to fetch bill:", fetchError);
        return { error: fetchError || new Error("Bill not found") };
      }

      console.log("[sendPaymentConfirmation] Fresh bill data:", {
        billId: freshBill.id,
        tenantId: freshBill.tenant_id,
        tenantName: freshBill.tenants?.full_name,
      });

      // First, generate the invoice PDF
      console.log("[sendPaymentConfirmation] Generating invoice...");
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke("generate-invoice", {
        body: { billId: freshBill.id },
      });

      if (invoiceError) {
        console.error("[sendPaymentConfirmation] Invoice generation error:", invoiceError);
        toast.error("Failed to generate invoice");
        return { error: invoiceError };
      }

      if (!invoiceData?.invoiceUrl) {
        console.error("[sendPaymentConfirmation] No invoice URL returned");
        toast.error("Invoice generation failed - no URL");
        return { error: new Error("No invoice URL") };
      }

      console.log("[sendPaymentConfirmation] Invoice generated:", invoiceData.invoiceUrl);

      // Format bill month
      const billMonthDate = new Date(freshBill.bill_month);
      const formattedBillMonth = billMonthDate.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });

      // Send WhatsApp with invoice - using fresh data from DB
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          tenantId: freshBill.tenant_id,
          templateName: "payment_confirmation_v2",
          billId: freshBill.id,
          userId: user.id,
          // Template variables - use fresh data
          tenantName: freshBill.tenants?.full_name || "Tenant",
          billMonth: formattedBillMonth,
          amount: freshBill.total_amount,
          invoiceUrl: invoiceData.invoiceUrl,
        },
      });

      if (error) {
        console.error("[sendPaymentConfirmation] WhatsApp error:", error);
        return { error };
      }

      if (data?.status === "sent") {
        toast.success("Payment confirmation sent with invoice");
      } else if (data?.status === "pending") {
        toast.info("Confirmation queued - WhatsApp API pending");
      }

      return { error: null };
    } catch (error) {
      console.error("[sendPaymentConfirmation] Error:", error);
      return { error: error as Error };
    }
  };

  useEffect(() => {
    fetchBills();
  }, [user, campusId, status]);

  return {
    bills,
    loading,
    fetchBills,
    addBill,
    markAsPaid,
    updateBill,
    sendPaymentConfirmation,
  };
}

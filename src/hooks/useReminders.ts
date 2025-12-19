import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Reminder {
  id: string;
  tenantId: string;
  tenantName: string;
  phone: string;
  campus: string;
  campusId: string;
  roomNo: string;
  rentAmount: number;
  dueDate: string;
  status: "upcoming" | "due-today" | "overdue";
  daysLabel: string;
  lastReminderSent: string | null;
  whatsappOptin: boolean;
}

/**
 * REMINDER PAGE LOGIC:
 * 
 * Shows bills that are:
 * - 5-8 days BEFORE due date (upcoming window for reminders)
 * - Due today
 * - Overdue (still need reminders)
 * 
 * Sorting: Nearest due date first
 * 
 * NO auto-sending - all sends are explicit user clicks
 */
export function useReminders(campusId?: string) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    if (!user) return;

    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate date range: 8 days in the future to catch upcoming reminders
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 8);
    const futureDateStr = futureDate.toISOString().split("T")[0];
    
    // Get bills that are not paid and within reminder window
    let query = supabase
      .from("bills")
      .select(`
        *,
        tenants(id, full_name, phone, whatsapp_optin, rooms(room_no)),
        campuses(name)
      `)
      .neq("payment_status", "Paid")
      .lte("due_date", futureDateStr) // Due date within next 8 days or already passed
      .order("due_date", { ascending: true });

    if (campusId && campusId !== "all") {
      query = query.eq("campus_id", campusId);
    }

    const { data: bills, error } = await query;

    if (error) {
      toast.error("Failed to fetch reminders");
      console.error("[useReminders] Error:", error);
      setLoading(false);
      return;
    }

    // Get last WhatsApp reminder sent for each tenant
    const tenantIds = (bills || []).map((b: any) => b.tenant_id).filter(Boolean);
    let lastReminders: Record<string, string> = {};

    if (tenantIds.length > 0) {
      const { data: logs } = await supabase
        .from("whatsapp_logs")
        .select("tenant_id, created_at")
        .in("tenant_id", tenantIds)
        .eq("message_type", "payment_reminder_v2")
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      // Get the most recent reminder for each tenant
      (logs || []).forEach((log: any) => {
        if (!lastReminders[log.tenant_id]) {
          lastReminders[log.tenant_id] = log.created_at;
        }
      });
    }

    const mappedReminders: Reminder[] = (bills || []).map((bill: any) => {
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status: "upcoming" | "due-today" | "overdue";
      let daysLabel: string;

      if (diffDays < 0) {
        status = "overdue";
        daysLabel = `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`;
      } else if (diffDays === 0) {
        status = "due-today";
        daysLabel = "Due Today";
      } else {
        status = "upcoming";
        daysLabel = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
      }

      const lastSent = lastReminders[bill.tenant_id];

      return {
        id: bill.id,
        tenantId: bill.tenant_id,
        tenantName: bill.tenants?.full_name || "Unknown",
        phone: bill.tenants?.phone || "",
        campus: bill.campuses?.name || "Unknown",
        campusId: bill.campus_id,
        roomNo: bill.tenants?.rooms?.room_no || "-",
        rentAmount: Number(bill.total_amount),
        dueDate: bill.due_date,
        status,
        daysLabel,
        lastReminderSent: lastSent ? new Date(lastSent).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) : null,
        whatsappOptin: bill.tenants?.whatsapp_optin || false,
      };
    });

    setReminders(mappedReminders);
    setLoading(false);
  };

  const sendReminder = async (reminder: Reminder) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      // Format due date for template
      const dueDateObj = new Date(reminder.dueDate);
      const formattedDueDate = dueDateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Format bill month
      const billMonth = dueDateObj.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });

      // Call the edge function to send WhatsApp
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          tenantId: reminder.tenantId,
          templateName: "payment_reminder_v2",
          billId: reminder.id,
          userId: user.id,
          // Template variables
          tenantName: reminder.tenantName,
          billMonth: billMonth,
          dueDate: formattedDueDate,
          campusName: reminder.campus,
        },
      });

      // Handle error responses - the edge function returns error details in the response
      if (error) {
        console.error("[sendReminder] Function error:", error);
        
        // Try to get the actual error message from the response
        // When edge function returns 4xx, the error context may contain the response
        let errorMessage = "Failed to send reminder";
        
        // Check if it's an opt-in issue based on the error
        if (!reminder.whatsappOptin) {
          errorMessage = `${reminder.tenantName} hasn't opted in for WhatsApp. They must message your business number first.`;
        }
        
        toast.error(errorMessage);
        return { error };
      }

      // Handle response based on status
      if (data?.status === "sent") {
        toast.success(`Reminder sent to ${reminder.tenantName}`);
      } else if (data?.status === "pending") {
        toast.info("Reminder queued - WhatsApp API pending configuration");
      } else if (data?.error) {
        // Show specific error messages
        if (data.code === "TENANT_NOT_OPTED_IN") {
          toast.error(`${reminder.tenantName} hasn't opted in for WhatsApp`);
        } else if (data.code === "MANAGER_CONSENT_DISABLED") {
          toast.error("Enable WhatsApp in your Profile settings first");
        } else {
          toast.error(data.error);
        }
        return { error: new Error(data.error) };
      }

      await fetchReminders();
      return { error: null };
    } catch (error) {
      console.error("[sendReminder] Error:", error);
      toast.error("Failed to send reminder");
      return { error: error as Error };
    }
  };

  const sendBulkReminders = async (reminderIds: string[]) => {
    const selectedReminders = reminders.filter(r => reminderIds.includes(r.id));
    let sent = 0;
    let failed = 0;
    
    for (const reminder of selectedReminders) {
      const result = await sendReminder(reminder);
      if (result.error) {
        failed++;
      } else {
        sent++;
      }
    }

    if (failed > 0) {
      toast.warning(`${sent} sent, ${failed} failed`);
    } else {
      toast.success(`${sent} reminders sent`);
    }
    
    return { error: null };
  };

  useEffect(() => {
    fetchReminders();
  }, [user, campusId]);

  return {
    reminders,
    loading,
    fetchReminders,
    sendReminder,
    sendBulkReminders,
  };
}

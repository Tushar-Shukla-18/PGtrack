import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays, format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Bill {
  id: string;
  tenantId?: string;
  tenantName: string;
  roomNo: string;
  campus?: string;
  campusId?: string;
  amount: number;
  dueDate: string;
  phone?: string;
  whatsappOptin?: boolean;
}

interface BillsTableProps {
  title: string;
  bills: Bill[];
  type: "upcoming" | "overdue";
  onSendReminder?: (bill: Bill) => Promise<{ error: Error | null }>;
}

export function BillsTable({ title, bills, type, onSendReminder }: BillsTableProps) {
  const today = new Date();
  const navigate = useNavigate();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const getStatusInfo = (dueDate: string) => {
    const due = new Date(dueDate);
    const diff = differenceInDays(due, today);
    
    if (type === "overdue") {
      const overdueDays = Math.abs(diff);
      return {
        status: "overdue" as const,
        label: `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`,
      };
    } else {
      if (diff === 0) {
        return { status: "due-today" as const, label: "Due Today" };
      }
      return {
        status: "upcoming" as const,
        label: `${diff} day${diff !== 1 ? 's' : ''} left`,
      };
    }
  };

  const handleSendReminder = async (bill: Bill) => {
    if (!onSendReminder) return;
    setSendingId(bill.id);
    await onSendReminder(bill);
    setSendingId(null);
  };

  const handleViewBill = (bill: Bill) => {
    navigate("/billing");
  };

  if (bills.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-card animate-slide-up overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          No {type} bills
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-card animate-slide-up overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Tenant
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Room
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Amount
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Due Date
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bills.map((bill) => {
              const { status, label } = getStatusInfo(bill.dueDate);
              const isSending = sendingId === bill.id;
              return (
                <tr
                  key={bill.id}
                  className="hover:bg-muted/30 transition-colors duration-150"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {bill.tenantName}
                      </p>
                      {bill.campus && (
                        <p className="text-xs text-muted-foreground">
                          {bill.campus}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">{bill.roomNo || "-"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-foreground">
                      ₹{bill.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(bill.dueDate), "dd MMM yyyy")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        status === "overdue" &&
                          "border-destructive/50 bg-destructive/10 text-destructive",
                        status === "due-today" &&
                          "border-warning/50 bg-warning/10 text-warning",
                        status === "upcoming" &&
                          "border-primary/50 bg-primary/10 text-primary"
                      )}
                    >
                      {label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10"
                        onClick={() => handleSendReminder(bill)}
                        disabled={isSending || !onSendReminder}
                        title="Send WhatsApp reminder"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MessageCircle className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => handleViewBill(bill)}
                        title="View bill details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

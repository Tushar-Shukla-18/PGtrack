import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Eye,
  CheckCircle,
  MessageCircle,
  MoreHorizontal,
  Download,
  IndianRupee,
  Clock,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBills, type PaymentMethod, type Bill } from "@/hooks/useBills";
import { PaymentModal } from "@/components/modals/PaymentModal";
import { ManualBillModal } from "@/components/modals/ManualBillModal";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Billing() {
  const { user } = useAuth();
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null);
  const [isManualBillModalOpen, setIsManualBillModalOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const campusId = selectedCampus === "all" ? undefined : selectedCampus;
  const { bills, loading, markAsPaid, addBill, fetchBills, sendPaymentConfirmation } = useBills(campusId);

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      (bill.tenant_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bill.room_no || "").includes(searchQuery);
    const matchesStatus =
      statusFilter === "all" || bill.payment_status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalBills = bills.length;
  const paidAmount = bills
    .filter((b) => b.payment_status === "Paid")
    .reduce((sum, b) => sum + b.total_amount, 0);
  const pendingAmount = bills
    .filter((b) => b.payment_status === "Pending" || b.payment_status === "Overdue")
    .reduce((sum, b) => sum + b.total_amount, 0);
  const overdueCount = bills.filter((b) => b.payment_status === "Overdue").length;

  const handleMarkAsPaid = (bill: any) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (paymentMethod: PaymentMethod) => {
    if (!selectedBill) return { error: new Error("No bill selected") };
    const billId = selectedBill.id; // Capture bill ID before any state changes
    const result = await markAsPaid(billId, paymentMethod);
    if (!result.error) {
      // Send payment confirmation via WhatsApp (non-blocking)
      // Pass billId instead of stale bill object to avoid sending to wrong tenant
      sendPaymentConfirmation(billId);
      setIsPaymentModalOpen(false);
      setSelectedBill(null);
    }
    return result;
  };

  const handleViewInvoice = async (billId: string) => {
    setLoadingInvoice(billId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { billId, returnBase64: true },
      });

      if (error) throw error;

      if (!data?.pdfBase64) {
        throw new Error("No PDF data returned");
      }

      // Use base64 -> blob to avoid ad blockers blocking storage URLs
      const bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      console.error("Invoice error:", error);
      toast.error("Failed to open invoice");
    } finally {
      setLoadingInvoice(null);
    }
  };

  const handleDownloadPDF = async (billId: string) => {
    setLoadingInvoice(billId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { billId, returnBase64: true },
      });

      if (error) throw error;

      if (!data?.pdfBase64) {
        throw new Error("No PDF data returned");
      }

      const bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `invoice_${billId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success("Invoice downloaded");
    } catch (error) {
      console.error("PDF error:", error);
      toast.error("Failed to download PDF");
    } finally {
      setLoadingInvoice(null);
    }
  };

  const handleSendReminder = async (bill: Bill) => {
    if (!user) return;
    setSendingReminder(bill.id);
    try {
      // Format due date for template
      const dueDateObj = new Date(bill.due_date);
      const formattedDueDate = dueDateObj.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Format bill month
      const billMonthDate = new Date(bill.billing_month);
      const formattedBillMonth = billMonthDate.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          tenantId: bill.tenant_id,
          templateName: "payment_reminder_v2",
          billId: bill.id,
          userId: user.id,
          // Template variables
          tenantName: bill.tenant_name || "Tenant",
          billMonth: formattedBillMonth,
          dueDate: formattedDueDate,
          campusName: bill.campus_name || "PG",
        },
      });

      if (error) throw error;
      
      if (data?.status === "sent") {
        toast.success(`Reminder sent to ${bill.tenant_name}`);
      } else if (data?.status === "pending") {
        toast.info("Reminder queued - WhatsApp API pending configuration");
      } else if (data?.error) {
        if (data.code === "TENANT_NOT_OPTED_IN") {
          toast.error(`${bill.tenant_name} hasn't opted in for WhatsApp`);
        } else if (data.code === "MANAGER_CONSENT_DISABLED") {
          toast.error("Enable WhatsApp in your Profile settings first");
        } else {
          toast.error(data.error);
        }
      }
    } catch (error) {
      console.error("WhatsApp error:", error);
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Billing" subtitle="Manage rent bills and payments" selectedCampus={selectedCampus} onCampusChange={setSelectedCampus} />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Billing"
        subtitle="Manage rent bills and payments"
        selectedCampus={selectedCampus}
        onCampusChange={setSelectedCampus}
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-xl font-bold text-foreground">{totalBills}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="text-xl font-bold text-success">₹{paidAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-accent">₹{pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold text-destructive">{overdueCount} bills</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-card border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsManualBillModalOpen(true)} className="gap-2">
              <FileText className="w-4 h-4" />
              Manual Bill
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">S.No</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Tenant</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Room</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Billing Month</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Due Date</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill, index) => (
                    <tr key={bill.id} className="hover:bg-muted/30 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{bill.tenant_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{bill.campus_name || "-"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-foreground">{bill.room_no || "-"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {format(new Date(bill.billing_month), "MMMM yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">₹{bill.total_amount.toLocaleString()}</p>
                          {(bill.electricity_amount || 0) + (bill.other_charges || 0) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ₹{bill.rent_amount.toLocaleString()} + ₹{((bill.electricity_amount || 0) + (bill.other_charges || 0)).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(bill.due_date), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            bill.payment_status === "Paid" && "border-success/50 bg-success/10 text-success",
                            bill.payment_status === "Pending" && "border-accent/50 bg-accent/10 text-accent",
                            bill.payment_status === "Overdue" && "border-destructive/50 bg-destructive/10 text-destructive"
                          )}
                        >
                          {bill.payment_status === "Paid" && bill.payment_method
                            ? `Paid (${bill.payment_method})`
                            : bill.payment_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {bill.payment_status !== "Paid" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10"
                              title="Send WhatsApp Reminder"
                              onClick={() => handleSendReminder(bill)}
                              disabled={sendingReminder === bill.id}
                            >
                              {sendingReminder === bill.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MessageCircle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                {loadingInvoice === bill.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              {bill.payment_status !== "Paid" && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(bill)} className="cursor-pointer gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleViewInvoice(bill.id)} 
                                className="cursor-pointer gap-2"
                                disabled={loadingInvoice === bill.id}
                              >
                                <Eye className="w-4 h-4" />
                                View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDownloadPDF(bill.id)} 
                                className="cursor-pointer gap-2"
                                disabled={loadingInvoice === bill.id}
                              >
                                <Download className="w-4 h-4" />
                                Download PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PaymentModal
        open={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedBill(null);
        }}
        onSubmit={handlePaymentSubmit}
        bill={selectedBill}
      />

      <ManualBillModal
        open={isManualBillModalOpen}
        onClose={() => setIsManualBillModalOpen(false)}
        onSubmit={async (data) => {
          const result = await addBill(data);
          if (!result.error) {
            fetchBills();
          }
          return result;
        }}
      />
    </DashboardLayout>
  );
}

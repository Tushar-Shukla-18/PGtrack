import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MessageCircle, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReminders } from "@/hooks/useReminders";
import { format } from "date-fns";

export default function Reminders() {
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { reminders, loading, sendReminder, sendBulkReminders } = useReminders(selectedCampus);

  const filteredReminders = reminders.filter((reminder) => {
    const matchesSearch =
      reminder.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.phone.includes(searchQuery);
    const matchesStatus =
      statusFilter === "all" || reminder.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredReminders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReminders.map((r) => r.id));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSendBulk = async () => {
    setSending(true);
    await sendBulkReminders(selectedIds);
    setSelectedIds([]);
    setSending(false);
  };

  const handleSendSingle = async (reminder: typeof reminders[0]) => {
    await sendReminder(reminder);
  };

  const stats = {
    total: reminders.length,
    upcoming: reminders.filter((r) => r.status === "upcoming").length,
    dueToday: reminders.filter((r) => r.status === "due-today").length,
    overdue: reminders.filter((r) => r.status === "overdue").length,
  };

  return (
    <DashboardLayout>
      <Header
        title="Reminders"
        subtitle="Send WhatsApp payment reminders"
        selectedCampus={selectedCampus}
        onCampusChange={setSelectedCampus}
      />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
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
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="due-today">Due Today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            disabled={selectedIds.length === 0 || sending}
            onClick={handleSendBulk}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send to Selected ({selectedIds.length})
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="ml-2 font-semibold text-foreground">
              {stats.total}
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Upcoming:</span>
            <span className="ml-2 font-semibold text-primary">
              {stats.upcoming}
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Due Today:</span>
            <span className="ml-2 font-semibold text-warning">
              {stats.dueToday}
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Overdue:</span>
            <span className="ml-2 font-semibold text-destructive">
              {stats.overdue}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pending reminders found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      <Checkbox
                        checked={
                          selectedIds.length === filteredReminders.length &&
                          filteredReminders.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Tenant
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Campus
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Amount
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Due Date
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Last Sent
                    </th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredReminders.map((reminder) => (
                    <tr
                      key={reminder.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors duration-150",
                        selectedIds.includes(reminder.id) && "bg-primary/5"
                      )}
                    >
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedIds.includes(reminder.id)}
                          onCheckedChange={() => handleSelect(reminder.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {reminder.tenantName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Room {reminder.roomNo}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {reminder.campus}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        ₹{reminder.rentAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(reminder.dueDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            reminder.status === "upcoming" &&
                              "border-primary/50 bg-primary/10 text-primary",
                            reminder.status === "due-today" &&
                              "border-warning/50 bg-warning/10 text-warning",
                            reminder.status === "overdue" &&
                              "border-destructive/50 bg-destructive/10 text-destructive"
                          )}
                        >
                          {reminder.daysLabel}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {reminder.lastReminderSent || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-success hover:text-success hover:bg-success/10"
                            onClick={() => handleSendSingle(reminder)}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Send
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

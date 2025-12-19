import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { KPICard } from "@/components/dashboard/KPICard";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { BillsTable } from "@/components/dashboard/BillsTable";
import { Users, IndianRupee, Wallet, AlertCircle } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useReminders } from "@/hooks/useReminders";

export default function Dashboard() {
  const [selectedCampus, setSelectedCampus] = useState("all");
  const { stats, loading: statsLoading } = useDashboardStats(selectedCampus === "all" ? undefined : selectedCampus);
  const { sendReminder } = useReminders(selectedCampus === "all" ? undefined : selectedCampus);

  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toLocaleString()}`;
  };

  // Wrapper to convert bill format to reminder format for sendReminder
  const handleSendReminder = async (bill: {
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
  }) => {
    return sendReminder({
      id: bill.id,
      tenantId: bill.tenantId || "",
      tenantName: bill.tenantName,
      phone: bill.phone || "",
      campus: bill.campus || "",
      campusId: bill.campusId || "",
      roomNo: bill.roomNo,
      rentAmount: bill.amount,
      dueDate: bill.dueDate,
      status: "upcoming",
      daysLabel: "",
      lastReminderSent: null,
      whatsappOptin: bill.whatsappOptin || false,
    });
  };

  return (
    <DashboardLayout>
      <Header
        title="Dashboard"
        subtitle="Welcome back!"
        selectedCampus={selectedCampus}
        onCampusChange={setSelectedCampus}
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Occupancy Rate"
            value={statsLoading ? "..." : `${stats.occupancyRate}%`}
            change={`${stats.occupiedBeds}/${stats.totalBeds} beds`}
            changeType="neutral"
            icon={Users}
            iconColor="text-primary"
            iconBgColor="bg-primary/10"
          />
          <KPICard
            title="Monthly Revenue"
            value={statsLoading ? "..." : formatCurrency(stats.monthlyRevenue)}
            change="This month's collections"
            changeType="positive"
            icon={IndianRupee}
            iconColor="text-success"
            iconBgColor="bg-success/10"
          />
          <KPICard
            title="Monthly Expenses"
            value={statsLoading ? "..." : formatCurrency(stats.monthlyExpenses)}
            change="This month's expenses"
            changeType="negative"
            icon={Wallet}
            iconColor="text-accent"
            iconBgColor="bg-accent/10"
          />
          <KPICard
            title="Pending Amount"
            value={statsLoading ? "..." : formatCurrency(stats.pendingAmount)}
            change={`${stats.overdueCount} bills overdue`}
            changeType="negative"
            icon={AlertCircle}
            iconColor="text-destructive"
            iconBgColor="bg-destructive/10"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <OccupancyChart 
              occupancyRate={stats.occupancyRate}
              occupiedBeds={stats.occupiedBeds}
              totalBeds={stats.totalBeds}
            />
          </div>
          <div className="lg:col-span-2">
            <RevenueChart data={stats.revenueExpenseData} />
          </div>
        </div>

        {/* Bills Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BillsTable
            title="Upcoming Bills"
            bills={stats.upcomingBills}
            type="upcoming"
            onSendReminder={handleSendReminder}
          />
          <BillsTable
            title="Overdue Bills"
            bills={stats.overdueBills}
            type="overdue"
            onSendReminder={handleSendReminder}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

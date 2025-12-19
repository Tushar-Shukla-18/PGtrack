import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

interface DashboardStats {
  occupancyRate: number;
  totalBeds: number;
  occupiedBeds: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  pendingAmount: number;
  overdueCount: number;
  upcomingBills: any[];
  overdueBills: any[];
  revenueExpenseData: MonthlyData[];
}

export function useDashboardStats(campusId?: string) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    occupancyRate: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    pendingAmount: 0,
    overdueCount: 0,
    upcomingBills: [],
    overdueBills: [],
    revenueExpenseData: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) return;

    setLoading(true);
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];
    // Get 6 months ago for chart data
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().split("T")[0];

    try {
      // Build queries with campus filter
      let roomsQuery = supabase.from("rooms").select("capacity").eq("is_active", true);
      let tenantsQuery = supabase.from("tenants").select("id", { count: "exact" }).eq("is_active", true);
      let billsQuery = supabase.from("bills").select("*");
      let expensesQuery = supabase.from("expenses").select("amount, expense_date").gte("expense_date", sixMonthsAgo);

      if (campusId && campusId !== "all") {
        roomsQuery = roomsQuery.eq("campus_id", campusId);
        tenantsQuery = tenantsQuery.eq("campus_id", campusId);
        billsQuery = billsQuery.eq("campus_id", campusId);
        expensesQuery = expensesQuery.eq("campus_id", campusId);
      }

      const [roomsResult, tenantsResult, billsResult, expensesResult] = await Promise.all([
        roomsQuery,
        tenantsQuery,
        billsQuery,
        expensesQuery,
      ]);

      const totalBeds = (roomsResult.data || []).reduce((sum: number, room: any) => sum + room.capacity, 0);
      const occupiedBeds = tenantsResult.count || 0;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      const bills = billsResult.data || [];
      const monthlyRevenue = bills
        .filter((b: any) => b.payment_status === "Paid" && b.payment_date >= firstDayOfMonth && b.payment_date <= lastDayOfMonth)
        .reduce((sum: number, b: any) => sum + Number(b.total_amount), 0);

      const pendingBills = bills.filter((b: any) => b.payment_status !== "Paid");
      const pendingAmount = pendingBills.reduce((sum: number, b: any) => sum + Number(b.total_amount), 0);
      
      const overdueBills = pendingBills.filter((b: any) => b.due_date < todayStr);
      const overdueCount = overdueBills.length;

      const monthlyExpenses = (expensesResult.data || [])
        .filter((e: any) => e.expense_date >= firstDayOfMonth && e.expense_date <= lastDayOfMonth)
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      // Get upcoming and overdue bills with tenant info
      let upcomingQuery = supabase
        .from("bills")
        .select(`
          *,
          tenants(id, full_name, phone, whatsapp_optin, rooms(room_no)),
          campuses(name)
        `)
        .neq("payment_status", "Paid")
        .gte("due_date", todayStr)
        .order("due_date", { ascending: true })
        .limit(5);

      let overdueQuery = supabase
        .from("bills")
        .select(`
          *,
          tenants(id, full_name, phone, whatsapp_optin, rooms(room_no)),
          campuses(name)
        `)
        .neq("payment_status", "Paid")
        .lt("due_date", todayStr)
        .order("due_date", { ascending: false })
        .limit(5);

      if (campusId && campusId !== "all") {
        upcomingQuery = upcomingQuery.eq("campus_id", campusId);
        overdueQuery = overdueQuery.eq("campus_id", campusId);
      }

      const [upcomingResult, overdueResult] = await Promise.all([upcomingQuery, overdueQuery]);

      const mapBill = (bill: any) => ({
        id: bill.id,
        tenantId: bill.tenant_id,
        tenantName: bill.tenants?.full_name,
        roomNo: bill.tenants?.rooms?.room_no,
        campus: bill.campuses?.name,
        campusId: bill.campus_id,
        amount: Number(bill.total_amount),
        dueDate: bill.due_date,
        phone: bill.tenants?.phone,
        whatsappOptin: bill.tenants?.whatsapp_optin,
      });

      // Calculate last 6 months revenue vs expenses
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const revenueExpenseData: MonthlyData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0];
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split("T")[0];
        
        const monthRevenue = bills
          .filter((b: any) => b.payment_status === "Paid" && b.payment_date >= monthStart && b.payment_date <= monthEnd)
          .reduce((sum: number, b: any) => sum + Number(b.total_amount), 0);
        
        const monthExpenses = (expensesResult.data || [])
          .filter((e: any) => e.expense_date >= monthStart && e.expense_date <= monthEnd)
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        
        revenueExpenseData.push({
          month: monthNames[date.getMonth()],
          revenue: monthRevenue,
          expenses: monthExpenses,
        });
      }

      setStats({
        occupancyRate,
        totalBeds,
        occupiedBeds,
        monthlyRevenue,
        monthlyExpenses,
        pendingAmount,
        overdueCount,
        upcomingBills: (upcomingResult.data || []).map(mapBill),
        overdueBills: (overdueResult.data || []).map(mapBill),
        revenueExpenseData,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [user, campusId]);

  return { stats, loading, refetch: fetchStats };
}

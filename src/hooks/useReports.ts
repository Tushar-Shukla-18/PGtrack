import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface CampusData {
  id: string;
  name: string;
  revenue: number;
}

interface ReportStats {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  revenueChange: number;
  expenseChange: number;
  profitChange: number;
  monthlyData: MonthlyData[];
  campusData: CampusData[];
}

export function useReports(campusId?: string, months: number = 6) {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    revenueChange: 0,
    expenseChange: 0,
    profitChange: 0,
    monthlyData: [],
    campusData: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    if (!user) return;

    setLoading(true);
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
    const startDateStr = startDate.toISOString().split("T")[0];

    try {
      // Fetch paid bills for revenue
      let billsQuery = supabase
        .from("bills")
        .select("*, campuses(name)")
        .eq("payment_status", "Paid")
        .gte("payment_date", startDateStr);

      // Fetch expenses
      let expensesQuery = supabase
        .from("expenses")
        .select("*, campuses(name)")
        .gte("expense_date", startDateStr);

      if (campusId && campusId !== "all") {
        billsQuery = billsQuery.eq("campus_id", campusId);
        expensesQuery = expensesQuery.eq("campus_id", campusId);
      }

      const [billsResult, expensesResult] = await Promise.all([billsQuery, expensesQuery]);

      const bills = billsResult.data || [];
      const expenses = expensesResult.data || [];

      // Group by month
      const monthlyMap: Record<string, { revenue: number; expenses: number }> = {};
      const campusRevenueMap: Record<string, { id: string; name: string; revenue: number }> = {};

      // Initialize months
      for (let i = 0; i < months; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - months + 1 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = { revenue: 0, expenses: 0 };
      }

      // Aggregate revenue
      bills.forEach((bill: any) => {
        if (bill.payment_date) {
          const [year, month] = bill.payment_date.split("-");
          const key = `${year}-${month}`;
          if (monthlyMap[key]) {
            monthlyMap[key].revenue += Number(bill.total_amount);
          }

          // Campus aggregation
          if (bill.campus_id) {
            if (!campusRevenueMap[bill.campus_id]) {
              campusRevenueMap[bill.campus_id] = {
                id: bill.campus_id,
                name: bill.campuses?.name || "Unknown",
                revenue: 0,
              };
            }
            campusRevenueMap[bill.campus_id].revenue += Number(bill.total_amount);
          }
        }
      });

      // Aggregate expenses
      expenses.forEach((expense: any) => {
        if (expense.expense_date) {
          const [year, month] = expense.expense_date.split("-");
          const key = `${year}-${month}`;
          if (monthlyMap[key]) {
            monthlyMap[key].expenses += Number(expense.amount);
          }
        }
      });

      // Convert to array
      const monthlyData: MonthlyData[] = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => {
          const [year, month] = key.split("-");
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return {
            month: key,
            monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.revenue - data.expenses,
          };
        });

      const campusData = Object.values(campusRevenueMap).sort((a, b) => b.revenue - a.revenue);

      const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
      const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
      const totalProfit = totalRevenue - totalExpenses;

      // Calculate change percentage (compare current period to previous)
      const halfMonths = Math.floor(months / 2);
      const recentRevenue = monthlyData.slice(-halfMonths).reduce((sum, m) => sum + m.revenue, 0);
      const previousRevenue = monthlyData.slice(0, halfMonths).reduce((sum, m) => sum + m.revenue, 0);
      const recentExpenses = monthlyData.slice(-halfMonths).reduce((sum, m) => sum + m.expenses, 0);
      const previousExpenses = monthlyData.slice(0, halfMonths).reduce((sum, m) => sum + m.expenses, 0);
      const recentProfit = monthlyData.slice(-halfMonths).reduce((sum, m) => sum + m.profit, 0);
      const previousProfit = monthlyData.slice(0, halfMonths).reduce((sum, m) => sum + m.profit, 0);

      const calcChange = (recent: number, previous: number) => {
        if (previous === 0) return recent > 0 ? 100 : 0;
        return Math.round(((recent - previous) / previous) * 100);
      };

      setStats({
        totalRevenue,
        totalExpenses,
        totalProfit,
        revenueChange: calcChange(recentRevenue, previousRevenue),
        expenseChange: calcChange(recentExpenses, previousExpenses),
        profitChange: calcChange(recentProfit, previousProfit),
        monthlyData,
        campusData,
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [user, campusId, months]);

  return { stats, loading, refetch: fetchReports };
}

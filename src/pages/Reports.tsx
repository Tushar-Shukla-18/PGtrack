import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Wallet,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useReports } from "@/hooks/useReports";

export default function Reports() {
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [dateRange, setDateRange] = useState("6");

  const { stats, loading } = useReports(selectedCampus, parseInt(dateRange));

  const handleExport = () => {
    // Create CSV data
    const headers = ["Month", "Revenue", "Expenses", "Profit", "Margin"];
    const rows = stats.monthlyData.map((m) => [
      m.monthLabel,
      m.revenue,
      m.expenses,
      m.profit,
      m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) + "%" : "0%",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <Header
        title="Reports"
        subtitle="Financial analytics and insights"
        selectedCampus={selectedCampus}
        onCampusChange={setSelectedCampus}
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 bg-card border-border">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <IndianRupee className="w-6 h-6 text-success" />
                  </div>
                  {stats.revenueChange >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{stats.totalRevenue.toLocaleString()}
                </p>
                <p
                  className={`text-xs mt-2 ${
                    stats.revenueChange >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {stats.revenueChange >= 0 ? "+" : ""}
                  {stats.revenueChange}% from previous period
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Wallet className="w-6 h-6 text-accent" />
                  </div>
                  {stats.expenseChange >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-destructive" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-success" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{stats.totalExpenses.toLocaleString()}
                </p>
                <p
                  className={`text-xs mt-2 ${
                    stats.expenseChange >= 0 ? "text-destructive" : "text-success"
                  }`}
                >
                  {stats.expenseChange >= 0 ? "+" : ""}
                  {stats.expenseChange}% from previous period
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  {stats.profitChange >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{stats.totalProfit.toLocaleString()}
                </p>
                <p
                  className={`text-xs mt-2 ${
                    stats.profitChange >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {stats.profitChange >= 0 ? "+" : ""}
                  {stats.profitChange}% from previous period
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue vs Expenses Trend */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Monthly Trend
                </h3>
                <div className="h-72">
                  {stats.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.monthlyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="monthLabel"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(value) => `₹${value / 1000}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [
                            `₹${value.toLocaleString()}`,
                            "",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--success))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--success))", strokeWidth: 0, r: 4 }}
                          name="Revenue"
                        />
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--accent))", strokeWidth: 0, r: 4 }}
                          name="Expenses"
                        />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                          name="Profit"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm text-muted-foreground">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span className="text-sm text-muted-foreground">Expenses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm text-muted-foreground">Profit</span>
                  </div>
                </div>
              </div>

              {/* Campus Comparison */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Campus Revenue Comparison
                </h3>
                <div className="h-72">
                  {stats.campusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.campusData} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(value) => `₹${value / 1000}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [
                            `₹${value.toLocaleString()}`,
                            "Revenue",
                          ]}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No campus data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  Monthly Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Month
                      </th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Revenue
                      </th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Expenses
                      </th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Profit
                      </th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.monthlyData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No data available for the selected period
                        </td>
                      </tr>
                    ) : (
                      stats.monthlyData.map((month) => (
                        <tr
                          key={month.month}
                          className="hover:bg-muted/30 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            {month.monthLabel}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-success font-medium">
                            ₹{month.revenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-accent font-medium">
                            ₹{month.expenses.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-foreground font-semibold">
                            ₹{month.profit.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-primary font-medium">
                            {month.revenue > 0
                              ? Math.round((month.profit / month.revenue) * 100)
                              : 0}
                            %
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

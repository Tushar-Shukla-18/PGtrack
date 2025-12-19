import { useState, useEffect } from "react";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { Header } from "@/components/layout/Header";
import { Users, Building2, Home, Clock, IndianRupee, MessageCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface OverviewStats {
  totalManagers: number;
  totalCampuses: number;
  totalTenants: number;
  pendingRequests: number;
  totalBills: number;
  paidBills: number;
  pendingAmount: number;
  whatsappSent: number;
  whatsappFailed: number;
}

export default function SuperAdminOverview() {
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<OverviewStats>({
    totalManagers: 0,
    totalCampuses: 0,
    totalTenants: 0,
    pendingRequests: 0,
    totalBills: 0,
    paidBills: 0,
    pendingAmount: 0,
    whatsappSent: 0,
    whatsappFailed: 0,
  });
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === "super_admin";

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !isSuperAdmin) return;

      try {
        // Fetch managers count
        const { count: managersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "manager");

        // Fetch campuses count
        const { count: campusesCount } = await supabase
          .from("campuses")
          .select("*", { count: "exact", head: true });

        // Fetch tenants count
        const { count: tenantsCount } = await supabase
          .from("tenants")
          .select("*", { count: "exact", head: true });

        // Fetch pending requests count
        const { count: pendingCount } = await supabase
          .from("pending_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Fetch bills stats
        const { count: totalBillsCount } = await supabase
          .from("bills")
          .select("*", { count: "exact", head: true });

        const { count: paidBillsCount } = await supabase
          .from("bills")
          .select("*", { count: "exact", head: true })
          .eq("payment_status", "Paid");

        // Fetch pending amount
        const { data: pendingBills } = await supabase
          .from("bills")
          .select("total_amount")
          .neq("payment_status", "Paid");

        const pendingAmount = (pendingBills || []).reduce((sum, b) => sum + Number(b.total_amount), 0);

        // Fetch WhatsApp stats (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: whatsappSentCount } = await supabase
          .from("whatsapp_logs")
          .select("*", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("created_at", thirtyDaysAgo.toISOString());

        const { count: whatsappFailedCount } = await supabase
          .from("whatsapp_logs")
          .select("*", { count: "exact", head: true })
          .in("status", ["failed", "blocked"])
          .gte("created_at", thirtyDaysAgo.toISOString());

        setStats({
          totalManagers: managersCount || 0,
          totalCampuses: campusesCount || 0,
          totalTenants: tenantsCount || 0,
          pendingRequests: pendingCount || 0,
          totalBills: totalBillsCount || 0,
          paidBills: paidBillsCount || 0,
          pendingAmount,
          whatsappSent: whatsappSentCount || 0,
          whatsappFailed: whatsappFailedCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isSuperAdmin) {
      fetchStats();
    }
  }, [user, isSuperAdmin, authLoading]);

  // Loading state
  if (authLoading) {
    return (
      <SuperAdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </SuperAdminLayout>
    );
  }

  // Not super admin - redirect
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SuperAdminLayout>
      <Header title="Overview" subtitle="Platform statistics at a glance" />

      <div className="p-6 space-y-6">
        {/* Primary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Managers */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Managers</p>
                <p className="text-3xl font-bold text-foreground">
                  {loading ? "-" : stats.totalManagers}
                </p>
              </div>
            </div>
          </div>

          {/* Total Campuses */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Building2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Campuses</p>
                <p className="text-3xl font-bold text-foreground">
                  {loading ? "-" : stats.totalCampuses}
                </p>
              </div>
            </div>
          </div>

          {/* Total Tenants */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Home className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-3xl font-bold text-foreground">
                  {loading ? "-" : stats.totalTenants}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-3xl font-bold text-foreground">
                  {loading ? "-" : stats.pendingRequests}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Stats */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Billing Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <IndianRupee className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bills</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "-" : stats.totalBills}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {loading ? "" : `${stats.paidBills} paid`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-2xl font-bold text-destructive">
                    {loading ? "-" : `₹${stats.pendingAmount.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <MessageCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp (30d)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "-" : stats.whatsappSent}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {loading ? "" : `${stats.whatsappFailed} failed`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Welcome, Super Admin</h3>
          <p className="text-muted-foreground">
            Use the sidebar to navigate between sections. You can review access requests, 
            manage managers (enable/disable accounts, reset passwords), and view all campuses from this dashboard.
          </p>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

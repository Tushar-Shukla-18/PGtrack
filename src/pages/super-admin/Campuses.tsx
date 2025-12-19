import { useState, useEffect } from "react";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { Header } from "@/components/layout/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";

interface Campus {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  created_at: string;
  user_id: string;
  manager_name?: string;
  manager_email?: string;
}

export default function SuperAdminCampuses() {
  const { user, profile, loading: authLoading } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === "super_admin";

  // Fetch all campuses with manager info
  useEffect(() => {
    const fetchCampuses = async () => {
      if (!user || !isSuperAdmin) return;

      setLoading(true);
      try {
        // First fetch all campuses
        const { data: campusesData, error: campusesError } = await supabase
          .from("campuses")
          .select("*")
          .order("created_at", { ascending: false });

        if (campusesError) throw campusesError;

        // Get unique user_ids
        const userIds = [...new Set(campusesData?.map((c) => c.user_id) || [])];

        // Fetch manager profiles
        const { data: managersData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        // Map manager info to campuses
        const campusesWithManagers = campusesData?.map((campus) => {
          const manager = managersData?.find((m) => m.id === campus.user_id);
          return {
            ...campus,
            manager_name: manager?.full_name || null,
            manager_email: manager?.email || null,
          };
        });

        setCampuses(campusesWithManagers || []);
      } catch (error) {
        console.error("Error fetching campuses:", error);
        toast.error("Failed to fetch campuses");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isSuperAdmin) {
      fetchCampuses();
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
      <Header title="Campuses" subtitle="View all campuses across the platform" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="bg-card border border-border rounded-xl p-4 inline-flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Building2 className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Campuses</p>
            <p className="text-2xl font-bold text-foreground">{campuses.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Campus Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No campuses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  campuses.map((campus) => (
                    <TableRow key={campus.id}>
                      <TableCell className="font-medium">{campus.name}</TableCell>
                      <TableCell>{campus.city || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {campus.address || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campus.manager_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{campus.manager_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(campus.created_at), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

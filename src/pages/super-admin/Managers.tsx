import { useState, useEffect } from "react";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RotateCcw, Eye, Loader2, UserX, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";

interface Manager {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  is_disabled?: boolean;
}

interface ManagerCampus {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
}

export default function SuperAdminManagers() {
  const { user, profile, loading: authLoading } = useAuth();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [managerCampuses, setManagerCampuses] = useState<ManagerCampus[]>([]);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isViewCampusesModalOpen, setIsViewCampusesModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loadingCampuses, setLoadingCampuses] = useState(false);
  const [togglingManager, setTogglingManager] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === "super_admin";

  // Fetch managers
  const fetchManagers = async () => {
    if (!user || !isSuperAdmin) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "manager")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch managers");
      console.error(error);
    } else {
      setManagers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchManagers();
    }
  }, [user, isSuperAdmin, authLoading]);

  const handleViewCampuses = async (manager: Manager) => {
    setSelectedManager(manager);
    setIsViewCampusesModalOpen(true);
    setLoadingCampuses(true);

    try {
      const { data, error } = await supabase
        .from("campuses")
        .select("id, name, address, city")
        .eq("user_id", manager.id);

      if (error) throw error;
      setManagerCampuses(data || []);
    } catch (error) {
      console.error("Error fetching campuses:", error);
      toast.error("Failed to fetch campuses");
    } finally {
      setLoadingCampuses(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedManager || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-requests", {
        body: {
          action: "reset-password",
          userId: selectedManager.id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully!");
      setIsResetPasswordModalOpen(false);
      setSelectedManager(null);
      setNewPassword("");
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Failed to reset password");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleManager = async (manager: Manager) => {
    setTogglingManager(manager.id);
    const newDisabledState = !manager.is_disabled;

    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-requests", {
        body: {
          action: newDisabledState ? "disable-manager" : "enable-manager",
          userId: manager.id,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "Failed to update manager status");
        return;
      }

      toast.success(newDisabledState ? "Manager disabled" : "Manager enabled");
      await fetchManagers();
    } catch (error) {
      console.error("Toggle manager error:", error);
      toast.error("Failed to update manager status");
    } finally {
      setTogglingManager(null);
    }
  };

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

  const activeManagers = managers.filter(m => !m.is_disabled).length;
  const disabledManagers = managers.filter(m => m.is_disabled).length;

  return (
    <SuperAdminLayout>
      <Header title="Managers" subtitle="View and manage all platform managers" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total Managers</p>
            <p className="text-2xl font-bold text-foreground">{managers.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-success">{activeManagers}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Disabled</p>
            <p className="text-2xl font-bold text-destructive">{disabledManagers}</p>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No managers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  managers.map((manager) => (
                    <TableRow key={manager.id} className={manager.is_disabled ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{manager.full_name || "-"}</TableCell>
                      <TableCell>{manager.email}</TableCell>
                      <TableCell>{manager.phone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(manager.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={manager.is_disabled 
                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                            : "border-success/50 bg-success/10 text-success"
                          }
                        >
                          {manager.is_disabled ? "Disabled" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View Campuses"
                            onClick={() => handleViewCampuses(manager)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Reset Password"
                            onClick={() => {
                              setSelectedManager(manager);
                              setIsResetPasswordModalOpen(true);
                            }}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${manager.is_disabled ? "text-success hover:text-success" : "text-destructive hover:text-destructive"}`}
                            title={manager.is_disabled ? "Enable Manager" : "Disable Manager"}
                            onClick={() => handleToggleManager(manager)}
                            disabled={togglingManager === manager.id}
                          >
                            {togglingManager === manager.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : manager.is_disabled ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* View Campuses Modal */}
      <Dialog open={isViewCampusesModalOpen} onOpenChange={setIsViewCampusesModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              Campuses - {selectedManager?.full_name || selectedManager?.email}
            </DialogTitle>
          </DialogHeader>
          {loadingCampuses ? (
            <div className="py-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : managerCampuses.length === 0 ? (
            <p className="text-muted-foreground py-4">No campuses found for this manager.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {managerCampuses.map((campus) => (
                <div key={campus.id} className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{campus.name}</p>
                  {(campus.address || campus.city) && (
                    <p className="text-sm text-muted-foreground">
                      {[campus.address, campus.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Reset Manager Password</DialogTitle>
          </DialogHeader>
          {selectedManager && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Reset password for <strong>{selectedManager.full_name || selectedManager.email}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="text"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={processing || !newPassword || newPassword.length < 6}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}

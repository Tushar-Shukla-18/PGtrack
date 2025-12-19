import { useState, useEffect } from "react";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  Eye,
  Clock,
  UserCheck,
  UserX,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";

interface PendingRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  reason: string | null;
  status: string;
  created_at: string;
}

export default function SuperAdminAccessRequests() {
  const { user, profile, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const isSuperAdmin = profile?.role === "super_admin";

  // Fetch requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user || !isSuperAdmin) return;

      setLoading(true);
      let query = supabase
        .from("pending_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("Failed to fetch access requests");
        console.error(error);
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    };

    if (!authLoading && isSuperAdmin) {
      fetchRequests();
    }
  }, [user, isSuperAdmin, statusFilter, authLoading]);

  const handleApprove = async () => {
    if (!selectedRequest || !tempPassword) return;

    if (tempPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-requests", {
        body: {
          action: "approve",
          requestId: selectedRequest.id,
          temporaryPassword: tempPassword,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "Failed to approve request");
        return;
      }

      toast.success("Access request approved! Manager account created.");
      setIsApproveModalOpen(false);
      setSelectedRequest(null);
      setTempPassword("");

      // Refresh requests
      const { data: updatedData } = await supabase
        .from("pending_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (updatedData) setRequests(updatedData);
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve request");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-requests", {
        body: {
          action: "reject",
          requestId: selectedRequest.id,
          reason: rejectReason || undefined,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "Failed to reject request");
        return;
      }

      toast.success("Access request rejected.");
      setIsRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectReason("");

      // Refresh list
      const { data: updatedData } = await supabase
        .from("pending_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (updatedData) setRequests(updatedData);
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Failed to reject request");
    } finally {
      setProcessing(false);
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

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <SuperAdminLayout>
      <Header title="Access Requests" subtitle="Review and manage access requests" />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <UserCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-xl font-bold text-success">{approvedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-xl font-bold text-destructive">{rejectedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No access requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.full_name}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{request.phone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(request.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            request.status === "pending" && "border-warning/50 bg-warning/10 text-warning",
                            request.status === "approved" && "border-success/50 bg-success/10 text-success",
                            request.status === "rejected" && "border-destructive/50 bg-destructive/10 text-destructive"
                          )}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsApproveModalOpen(true);
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsRejectModalOpen(true);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Access Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedRequest.full_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{selectedRequest.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="font-medium">{selectedRequest.phone || "Not provided"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="font-medium">{selectedRequest.reason || "No message"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="font-medium">
                  {format(new Date(selectedRequest.created_at), "PPpp")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Create manager account for <strong>{selectedRequest.full_name}</strong> ({selectedRequest.email})
              </p>
              <div className="space-y-2">
                <Label htmlFor="tempPassword">Temporary Password</Label>
                <Input
                  id="tempPassword"
                  type="text"
                  placeholder="Enter temporary password (min 6 chars)"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Manager will use this password to login initially
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing || !tempPassword || tempPassword.length < 6}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Approve & Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Reject Access Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Reject request from <strong>{selectedRequest.full_name}</strong>?
              </p>
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Reason (optional)</Label>
                <Input
                  id="rejectReason"
                  type="text"
                  placeholder="Enter rejection reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}

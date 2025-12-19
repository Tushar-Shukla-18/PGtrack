import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit,
  UserMinus,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTenants } from "@/hooks/useTenants";
import { useCampuses } from "@/hooks/useCampuses";
import { useRooms } from "@/hooks/useRooms";
import { TenantModal } from "@/components/modals/TenantModal";
import { format } from "date-fns";

export default function Tenants() {
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const campusId = selectedCampus === "all" ? undefined : selectedCampus;
  const { tenants, loading, addTenant, updateTenant, deactivateTenant } = useTenants(campusId);
  const { campuses } = useCampuses();
  const { rooms } = useRooms();

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone.includes(searchQuery) ||
      (tenant.room_no || "").includes(searchQuery);
    return matchesSearch;
  });

  const activeTenants = tenants.filter((t) => t.is_active);
  const movedOutTenants = tenants.filter((t) => !t.is_active);

  const handleAddTenant = () => {
    setEditingTenant(null);
    setIsModalOpen(true);
  };

  const handleEditTenant = (tenant: any) => {
    setEditingTenant(tenant);
    setIsModalOpen(true);
  };

  const handleMoveOut = async (tenant: any) => {
    await deactivateTenant(tenant.id);
  };

  const handleSaveTenant = async (data: any) => {
    if (editingTenant) {
      return updateTenant(editingTenant.id, data);
    } else {
      return addTenant(data);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Tenants" subtitle="Manage all your tenants" selectedCampus={selectedCampus} onCampusChange={setSelectedCampus} />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Tenants"
        subtitle="Manage all your tenants"
        selectedCampus={selectedCampus}
        onCampusChange={setSelectedCampus}
      />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants by name, phone, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button onClick={handleAddTenant} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Tenant
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="ml-2 font-semibold text-foreground">{tenants.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            <span className="ml-2 font-semibold text-success">{activeTenants.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Moved Out:</span>
            <span className="ml-2 font-semibold text-muted-foreground">{movedOutTenants.length}</span>
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
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Phone</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Room</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Campus</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Move-in</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Rent</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                      No tenants found. Add your first tenant to get started.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant, index) => (
                    <tr key={tenant.id} className="hover:bg-muted/30 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{tenant.full_name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.tenant_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{tenant.phone}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-foreground bg-muted px-2 py-1 rounded">
                          {tenant.room_no || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{tenant.campus_name || "-"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(tenant.move_in_date), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        ₹{tenant.rent_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            tenant.is_active
                              ? "border-success/50 bg-success/10 text-success"
                              : "border-muted-foreground/50 bg-muted text-muted-foreground"
                          )}
                        >
                          {tenant.is_active ? "Active" : "Moved Out"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem onClick={() => handleEditTenant(tenant)} className="cursor-pointer gap-2">
                                <Edit className="w-4 h-4" />
                                Edit
                              </DropdownMenuItem>
                              {tenant.is_active && (
                                <DropdownMenuItem onClick={() => handleMoveOut(tenant)} className="cursor-pointer gap-2 text-destructive">
                                  <UserMinus className="w-4 h-4" />
                                  Move Out
                                </DropdownMenuItem>
                              )}
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

      <TenantModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveTenant}
        tenant={editingTenant}
        campuses={campuses}
        rooms={rooms}
      />
    </DashboardLayout>
  );
}

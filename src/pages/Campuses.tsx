import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  MapPin,
  Building,
  Users,
  DoorOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCampuses } from "@/hooks/useCampuses";
import { CampusModal } from "@/components/modals/CampusModal";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Campuses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<any>(null);

  const { campuses, loading, addCampus, updateCampus, deleteCampus } = useCampuses();

  const filteredCampuses = campuses.filter(
    (campus) =>
      campus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campus.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campus.city || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCampus = () => {
    setEditingCampus(null);
    setIsModalOpen(true);
  };

  const handleEditCampus = (campus: any) => {
    setEditingCampus(campus);
    setIsModalOpen(true);
  };

  const handleDeleteCampus = async (campus: any) => {
    if ((campus.room_count || 0) > 0 || (campus.tenant_count || 0) > 0) {
      toast.error("Cannot delete campus with rooms or tenants");
      return;
    }
    await deleteCampus(campus.id);
  };

  const handleSaveCampus = async (data: any) => {
    if (editingCampus) {
      return updateCampus(editingCampus.id, data);
    } else {
      return addCampus(data);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Campuses" subtitle="Manage your PG locations" showCampusFilter={false} />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Campuses"
        subtitle="Manage your PG locations"
        showCampusFilter={false}
      />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search campuses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button onClick={handleAddCampus} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Campus
          </Button>
        </div>

        {/* Campus Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampuses.map((campus, index) => (
            <div
              key={campus.id}
              className="bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-soft transition-shadow duration-300"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{campus.name}</h3>
                      <p className="text-sm text-muted-foreground">S.No: {index + 1}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => handleEditCampus(campus)} className="cursor-pointer gap-2">
                        <Edit className="w-4 h-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteCampus(campus)} className="cursor-pointer gap-2 text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-foreground">{campus.address || "No address"}</p>
                      <p className="text-muted-foreground">{campus.city || "-"}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">{campus.room_count || 0} rooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-success" />
                      <span className="text-sm text-foreground">{campus.tenant_count || 0} tenants</span>
                    </div>
                  </div>

                  {campus.notes && (
                    <p className="text-xs text-muted-foreground italic pt-2">{campus.notes}</p>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 bg-muted/30 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Created: {format(new Date(campus.created_at), "dd MMM yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredCampuses.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No campuses found</h3>
            <p className="text-muted-foreground mb-4">Add your first campus to get started</p>
            <Button onClick={handleAddCampus} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Campus
            </Button>
          </div>
        )}
      </div>

      <CampusModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveCampus}
        campus={editingCampus}
      />
    </DashboardLayout>
  );
}

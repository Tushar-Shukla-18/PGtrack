import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, IndianRupee, Calendar, Home } from "lucide-react";
import type { Tenant, TenantType } from "@/hooks/useTenants";
import type { Campus } from "@/hooks/useCampuses";
import type { Room } from "@/hooks/useRooms";

interface TenantModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    campus_id: string;
    room_id: string;
    full_name: string;
    phone: string;
    tenant_type: TenantType;
    move_in_date: string;
    rent_amount: number;
    security_deposit?: number;
  }) => Promise<{ error: Error | null }>;
  tenant?: Tenant | null;
  campuses: Campus[];
  rooms: Room[];
}

export function TenantModal({ open, onClose, onSubmit, tenant, campuses, rooms }: TenantModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    campus_id: "",
    room_id: "",
    full_name: "",
    phone: "",
    tenant_type: "Other" as TenantType,
    move_in_date: new Date().toISOString().split("T")[0],
    rent_amount: "",
    security_deposit: "",
  });

  const filteredRooms = rooms.filter((room) => {
    if (!formData.campus_id) return false;
    if (room.campus_id !== formData.campus_id) return false;
    // Only show rooms with available capacity (or current tenant's room)
    if (tenant?.room_id === room.id) return true;
    return (room.occupied_count || 0) < room.capacity;
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        campus_id: tenant.campus_id,
        room_id: tenant.room_id || "",
        full_name: tenant.full_name,
        phone: tenant.phone,
        tenant_type: tenant.tenant_type,
        move_in_date: tenant.move_in_date,
        rent_amount: String(tenant.rent_amount),
        security_deposit: String(tenant.security_deposit),
      });
    } else {
      setFormData({
        campus_id: "",
        room_id: "",
        full_name: "",
        phone: "",
        tenant_type: "Other",
        move_in_date: new Date().toISOString().split("T")[0],
        rent_amount: "",
        security_deposit: "",
      });
    }
  }, [tenant, open]);

  // Auto-fill rent when room is selected
  useEffect(() => {
    if (formData.room_id && !tenant) {
      const selectedRoom = rooms.find((r) => r.id === formData.room_id);
      if (selectedRoom) {
        setFormData((prev) => ({ ...prev, rent_amount: String(selectedRoom.rent_amount) }));
      }
    }
  }, [formData.room_id, rooms, tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.campus_id || !formData.room_id) return;

    setLoading(true);
    const { error } = await onSubmit({
      campus_id: formData.campus_id,
      room_id: formData.room_id,
      full_name: formData.full_name,
      phone: formData.phone,
      tenant_type: formData.tenant_type,
      move_in_date: formData.move_in_date,
      rent_amount: Number(formData.rent_amount) || 0,
      security_deposit: Number(formData.security_deposit) || 0,
    });
    setLoading(false);

    if (!error) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {tenant ? "Edit Tenant" : "Add Tenant"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name *
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Tenant name"
                className="bg-background border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone *
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="9876543210"
                className="bg-background border-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campus *</Label>
              <Select
                value={formData.campus_id}
                onValueChange={(value) => setFormData({ ...formData, campus_id: value, room_id: "" })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Home className="w-4 h-4 text-muted-foreground" />
                Room *
              </Label>
              <Select
                value={formData.room_id}
                onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                disabled={!formData.campus_id}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {filteredRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.room_no} ({room.room_type}) - ₹{room.rent_amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tenant Type</Label>
              <Select
                value={formData.tenant_type}
                onValueChange={(value: TenantType) => setFormData({ ...formData, tenant_type: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Working">Working</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="move_in_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Move-in Date
              </Label>
              <Input
                id="move_in_date"
                type="date"
                value={formData.move_in_date}
                onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent_amount" className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                Rent Amount *
              </Label>
              <Input
                id="rent_amount"
                type="number"
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                placeholder="8500"
                className="bg-background border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="security_deposit">Security Deposit</Label>
              <Input
                id="security_deposit"
                type="number"
                value={formData.security_deposit}
                onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                placeholder="10000"
                className="bg-background border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? "Saving..." : tenant ? "Update" : "Add Tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { DoorOpen, IndianRupee, Users } from "lucide-react";
import type { Room, RoomType } from "@/hooks/useRooms";
import type { Campus } from "@/hooks/useCampuses";

interface RoomModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    campus_id: string;
    room_no: string;
    room_type: RoomType;
    capacity: number;
    rent_amount: number;
  }) => Promise<{ error: Error | null }>;
  room?: Room | null;
  campuses: Campus[];
}

export function RoomModal({ open, onClose, onSubmit, room, campuses }: RoomModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    campus_id: "",
    room_no: "",
    room_type: "Single" as RoomType,
    capacity: "1",
    rent_amount: "",
  });

  useEffect(() => {
    if (room) {
      setFormData({
        campus_id: room.campus_id,
        room_no: room.room_no,
        room_type: room.room_type,
        capacity: String(room.capacity),
        rent_amount: String(room.rent_amount),
      });
    } else {
      setFormData({
        campus_id: campuses[0]?.id || "",
        room_no: "",
        room_type: "Single",
        capacity: "1",
        rent_amount: "",
      });
    }
  }, [room, open, campuses]);

  // Update capacity when room type changes
  useEffect(() => {
    if (!room) {
      const capacityMap: Record<RoomType, number> = {
        Single: 1,
        Double: 2,
        Triple: 3,
        Quad: 4,
        Dormitory: 6,
      };
      setFormData((prev) => ({ ...prev, capacity: String(capacityMap[prev.room_type]) }));
    }
  }, [formData.room_type, room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.room_no.trim() || !formData.campus_id || !formData.rent_amount) return;

    setLoading(true);
    const { error } = await onSubmit({
      campus_id: formData.campus_id,
      room_no: formData.room_no,
      room_type: formData.room_type,
      capacity: Number(formData.capacity) || 1,
      rent_amount: Number(formData.rent_amount) || 0,
    });
    setLoading(false);

    if (!error) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {room ? "Edit Room" : "Add Room"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Campus *</Label>
            <Select
              value={formData.campus_id}
              onValueChange={(value) => setFormData({ ...formData, campus_id: value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room_no" className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-muted-foreground" />
                Room Number *
              </Label>
              <Input
                id="room_no"
                value={formData.room_no}
                onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                placeholder="e.g., 101"
                className="bg-background border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Room Type *</Label>
              <Select
                value={formData.room_type}
                onValueChange={(value: RoomType) => setFormData({ ...formData, room_type: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Double">Double</SelectItem>
                  <SelectItem value="Triple">Triple</SelectItem>
                  <SelectItem value="Quad">Quad</SelectItem>
                  <SelectItem value="Dormitory">Dormitory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity" className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Capacity *
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="bg-background border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rent_amount" className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                Base Rent *
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? "Saving..." : room ? "Update" : "Add Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

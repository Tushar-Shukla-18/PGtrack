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
  Trash2,
  Users,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import { useCampuses } from "@/hooks/useCampuses";
import { RoomModal } from "@/components/modals/RoomModal";

export default function Rooms() {
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  const campusId = selectedCampus === "all" ? undefined : selectedCampus;
  const { rooms, loading, addRoom, updateRoom, deleteRoom } = useRooms(campusId);
  const { campuses } = useCampuses();

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_no.includes(searchQuery);
    return matchesSearch;
  });

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const totalOccupied = rooms.reduce((sum, room) => sum + (room.occupied_count || 0), 0);

  const handleAddRoom = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const handleEditRoom = (room: any) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleDeleteRoom = async (room: any) => {
    if ((room.occupied_count || 0) > 0) {
      return;
    }
    await deleteRoom(room.id);
  };

  const handleSaveRoom = async (data: any) => {
    if (editingRoom) {
      return updateRoom(editingRoom.id, data);
    } else {
      return addRoom(data);
    }
  };

  const getStatus = (room: any) => {
    if (!room.is_active) return "disabled";
    if ((room.occupied_count || 0) >= room.capacity) return "full";
    return "available";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Rooms" subtitle="Manage rooms across all campuses" selectedCampus={selectedCampus} onCampusChange={setSelectedCampus} />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Rooms"
        subtitle="Manage rooms across all campuses"
        selectedCampus={selectedCampus}
        onCampusChange={setSelectedCampus}
      />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by room number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button onClick={handleAddRoom} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Room
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Total Rooms:</span>
            <span className="ml-2 font-semibold text-foreground">{rooms.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Total Beds:</span>
            <span className="ml-2 font-semibold text-foreground">{totalCapacity}</span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Occupied:</span>
            <span className="ml-2 font-semibold text-success">{totalOccupied}</span>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Vacant:</span>
            <span className="ml-2 font-semibold text-primary">{totalCapacity - totalOccupied}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">S.No</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Room No</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Type</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Campus</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Rent</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Occupancy</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      No rooms found. Add your first room to get started.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room, index) => {
                    const status = getStatus(room);
                    const occupied = room.occupied_count || 0;
                    return (
                      <tr key={room.id} className="hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-foreground bg-primary/10 text-primary px-3 py-1 rounded-lg">
                            {room.room_no}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{room.room_type}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{room.campus_name || "-"}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          ₹{room.rent_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">{occupied}/{room.capacity}</span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${(occupied / room.capacity) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              status === "available" && "border-primary/50 bg-primary/10 text-primary",
                              status === "full" && "border-success/50 bg-success/10 text-success",
                              status === "disabled" && "border-muted-foreground/50 bg-muted text-muted-foreground"
                            )}
                          >
                            {status === "available" ? "Available" : status === "full" ? "Full" : "Disabled"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem onClick={() => handleEditRoom(room)} className="cursor-pointer gap-2">
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteRoom(room)} className="cursor-pointer gap-2 text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RoomModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveRoom}
        room={editingRoom}
        campuses={campuses}
      />
    </DashboardLayout>
  );
}

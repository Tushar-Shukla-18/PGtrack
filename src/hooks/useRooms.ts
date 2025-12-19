import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type RoomType = "Single" | "Double" | "Triple" | "Quad" | "Dormitory";

export interface Room {
  id: string;
  user_id: string;
  campus_id: string;
  room_no: string;
  room_type: RoomType;
  capacity: number;
  rent_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  campus_name?: string;
  occupied_count?: number;
}

export function useRooms(campusId?: string) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from("rooms")
      .select(`
        *,
        campuses(name)
      `)
      .eq("is_active", true)
      .order("room_no", { ascending: true });

    if (campusId && campusId !== "all") {
      query = query.eq("campus_id", campusId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch rooms");
      console.error(error);
    } else {
      // Fetch tenant counts for each room
      const roomsWithCounts = await Promise.all(
        (data || []).map(async (room: any) => {
          const { count } = await supabase
            .from("tenants")
            .select("id", { count: "exact" })
            .eq("room_id", room.id)
            .eq("is_active", true);

          return {
            ...room,
            campus_name: room.campuses?.name,
            occupied_count: count || 0,
          };
        })
      );

      setRooms(roomsWithCounts);
    }
    setLoading(false);
  };

  const addRoom = async (data: {
    campus_id: string;
    room_no: string;
    room_type: RoomType;
    capacity: number;
    rent_amount: number;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("rooms").insert({
      user_id: user.id,
      ...data,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("A room with this number already exists in this campus");
      } else {
        toast.error("Failed to add room");
      }
      return { error: new Error(error.message) };
    }

    toast.success("Room added successfully");
    await fetchRooms();
    return { error: null };
  };

  const updateRoom = async (id: string, data: Partial<Room>) => {
    const { error } = await supabase.from("rooms").update(data).eq("id", id);

    if (error) {
      toast.error("Failed to update room");
      return { error: new Error(error.message) };
    }

    toast.success("Room updated successfully");
    await fetchRooms();
    return { error: null };
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").update({ is_active: false }).eq("id", id);

    if (error) {
      toast.error("Failed to delete room");
      return { error: new Error(error.message) };
    }

    toast.success("Room deleted successfully");
    await fetchRooms();
    return { error: null };
  };

  useEffect(() => {
    fetchRooms();
  }, [user, campusId]);

  return {
    rooms,
    loading,
    fetchRooms,
    addRoom,
    updateRoom,
    deleteRoom,
  };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Campus {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  room_count?: number;
  tenant_count?: number;
}

export function useCampuses() {
  const { user } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampuses = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("campuses")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to fetch campuses");
      console.error(error);
    } else {
      // Fetch room and tenant counts for each campus
      const campusesWithCounts = await Promise.all(
        (data || []).map(async (campus) => {
          const [roomResult, tenantResult] = await Promise.all([
            supabase.from("rooms").select("id", { count: "exact" }).eq("campus_id", campus.id),
            supabase.from("tenants").select("id", { count: "exact" }).eq("campus_id", campus.id).eq("is_active", true),
          ]);
          
          return {
            ...campus,
            room_count: roomResult.count || 0,
            tenant_count: tenantResult.count || 0,
          };
        })
      );
      
      setCampuses(campusesWithCounts);
    }
    setLoading(false);
  };

  const addCampus = async (data: { name: string; address?: string; city?: string; notes?: string }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("campuses").insert({
      user_id: user.id,
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      notes: data.notes || null,
    });

    if (error) {
      toast.error("Failed to add campus");
      return { error: new Error(error.message) };
    }

    toast.success("Campus added successfully");
    await fetchCampuses();
    return { error: null };
  };

  const updateCampus = async (id: string, data: Partial<Campus>) => {
    const { error } = await supabase.from("campuses").update(data).eq("id", id);

    if (error) {
      toast.error("Failed to update campus");
      return { error: new Error(error.message) };
    }

    toast.success("Campus updated successfully");
    await fetchCampuses();
    return { error: null };
  };

  const deleteCampus = async (id: string) => {
    const { error } = await supabase.from("campuses").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete campus");
      return { error: new Error(error.message) };
    }

    toast.success("Campus deleted successfully");
    await fetchCampuses();
    return { error: null };
  };

  useEffect(() => {
    fetchCampuses();
  }, [user]);

  return {
    campuses,
    loading,
    fetchCampuses,
    addCampus,
    updateCampus,
    deleteCampus,
  };
}

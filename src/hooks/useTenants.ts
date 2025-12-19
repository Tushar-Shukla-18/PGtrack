import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TenantType = "Student" | "Working" | "Other";

export interface Tenant {
  id: string;
  user_id: string;
  campus_id: string;
  room_id: string | null;
  full_name: string;
  phone: string;
  tenant_type: TenantType;
  move_in_date: string;
  rent_amount: number;
  security_deposit: number;
  is_active: boolean;
  whatsapp_optin: boolean;
  created_at: string;
  updated_at: string;
  campus_name?: string;
  room_no?: string;
}

export function useTenants(campusId?: string, showInactive = false) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from("tenants")
      .select(`
        *,
        campuses(name),
        rooms(room_no)
      `)
      .order("created_at", { ascending: false });

    if (!showInactive) {
      query = query.eq("is_active", true);
    }

    if (campusId && campusId !== "all") {
      query = query.eq("campus_id", campusId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch tenants");
      console.error(error);
    } else {
      const mappedTenants = (data || []).map((tenant: any) => ({
        ...tenant,
        campus_name: tenant.campuses?.name,
        room_no: tenant.rooms?.room_no,
      }));
      setTenants(mappedTenants);
    }
    setLoading(false);
  };

  const addTenant = async (data: {
    campus_id: string;
    room_id: string;
    full_name: string;
    phone: string;
    tenant_type: TenantType;
    move_in_date: string;
    rent_amount: number;
    security_deposit?: number;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("tenants").insert({
      user_id: user.id,
      ...data,
      security_deposit: data.security_deposit || 0,
    });

    if (error) {
      toast.error("Failed to add tenant");
      return { error: new Error(error.message) };
    }

    toast.success("Tenant added successfully");
    await fetchTenants();
    return { error: null };
  };

  const updateTenant = async (id: string, data: Partial<Tenant>) => {
    const { error } = await supabase.from("tenants").update(data).eq("id", id);

    if (error) {
      toast.error("Failed to update tenant");
      return { error: new Error(error.message) };
    }

    toast.success("Tenant updated successfully");
    await fetchTenants();
    return { error: null };
  };

  const deactivateTenant = async (id: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({ is_active: false, room_id: null })
      .eq("id", id);

    if (error) {
      toast.error("Failed to move out tenant");
      return { error: new Error(error.message) };
    }

    toast.success("Tenant moved out successfully");
    await fetchTenants();
    return { error: null };
  };

  useEffect(() => {
    fetchTenants();
  }, [user, campusId, showInactive]);

  return {
    tenants,
    loading,
    fetchTenants,
    addTenant,
    updateTenant,
    deactivateTenant,
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          bill_month: string
          campus_id: string
          created_at: string
          due_date: string
          electricity_amount: number
          id: string
          notes: string | null
          other_charges: number
          payment_date: string | null
          payment_method: string | null
          payment_status: string
          rent_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
          user_id: string
          water_amount: number
        }
        Insert: {
          bill_month: string
          campus_id: string
          created_at?: string
          due_date: string
          electricity_amount?: number
          id?: string
          notes?: string | null
          other_charges?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          rent_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
          user_id: string
          water_amount?: number
        }
        Update: {
          bill_month?: string
          campus_id?: string
          created_at?: string
          due_date?: string
          electricity_amount?: number
          id?: string
          notes?: string | null
          other_charges?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          rent_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          water_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bills_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          campus_id: string
          created_at: string
          custom_type: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          campus_id: string
          created_at?: string
          custom_type?: string | null
          description?: string | null
          expense_date: string
          expense_type: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          campus_id?: string
          created_at?: string
          custom_type?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_disabled: boolean | null
          phone: string | null
          role: string | null
          updated_at: string
          whatsapp_consent: boolean | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_disabled?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          whatsapp_consent?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          whatsapp_consent?: boolean | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          campus_id: string
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          rent_amount: number
          room_no: string
          room_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campus_id: string
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          rent_amount?: number
          room_no: string
          room_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campus_id?: string
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          rent_amount?: number
          room_no?: string
          room_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          campus_id: string
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          meta_optin_confirmed: boolean | null
          move_in_date: string
          phone: string
          rent_amount: number
          room_id: string | null
          security_deposit: number
          tenant_type: string
          updated_at: string
          user_id: string
          whatsapp_optin: boolean
        }
        Insert: {
          campus_id: string
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          meta_optin_confirmed?: boolean | null
          move_in_date: string
          phone: string
          rent_amount?: number
          room_id?: string | null
          security_deposit?: number
          tenant_type?: string
          updated_at?: string
          user_id: string
          whatsapp_optin?: boolean
        }
        Update: {
          campus_id?: string
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          meta_optin_confirmed?: boolean | null
          move_in_date?: string
          phone?: string
          rent_amount?: number
          room_id?: string | null
          security_deposit?: number
          tenant_type?: string
          updated_at?: string
          user_id?: string
          whatsapp_optin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tenants_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          bill_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message_type: string
          phone: string | null
          status: string
          template_name: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          bill_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_type: string
          phone?: string | null
          status?: string
          template_name?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          bill_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_type?: string
          phone?: string | null
          status?: string
          template_name?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { required_role: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

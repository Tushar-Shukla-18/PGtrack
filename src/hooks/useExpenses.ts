import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ExpenseType = "Maintenance" | "Electricity" | "Water" | "Cleaning" | "Repairs" | "Salary" | "Other";

export interface Expense {
  id: string;
  user_id: string;
  campus_id: string;
  expense_type: ExpenseType;
  custom_type: string | null;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
  campus_name?: string;
}

export function useExpenses(campusId?: string) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from("expenses")
      .select(`
        *,
        campuses(name)
      `)
      .order("expense_date", { ascending: false });

    if (campusId && campusId !== "all") {
      query = query.eq("campus_id", campusId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch expenses");
      console.error(error);
    } else {
      const mappedExpenses = (data || []).map((expense: any) => ({
        ...expense,
        campus_name: expense.campuses?.name,
      }));
      setExpenses(mappedExpenses);
    }
    setLoading(false);
  };

  const addExpense = async (data: {
    campus_id: string;
    expense_type: ExpenseType;
    custom_type?: string;
    amount: number;
    description?: string;
    expense_date: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      ...data,
    });

    if (error) {
      toast.error("Failed to add expense");
      return { error: new Error(error.message) };
    }

    toast.success("Expense added successfully");
    await fetchExpenses();
    return { error: null };
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    const { error } = await supabase.from("expenses").update(data).eq("id", id);

    if (error) {
      toast.error("Failed to update expense");
      return { error: new Error(error.message) };
    }

    toast.success("Expense updated successfully");
    await fetchExpenses();
    return { error: null };
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete expense");
      return { error: new Error(error.message) };
    }

    toast.success("Expense deleted successfully");
    await fetchExpenses();
    return { error: null };
  };

  useEffect(() => {
    fetchExpenses();
  }, [user, campusId]);

  return {
    expenses,
    loading,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { IndianRupee, Calendar } from "lucide-react";
import type { Expense, ExpenseType } from "@/hooks/useExpenses";
import type { Campus } from "@/hooks/useCampuses";

interface ExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    campus_id: string;
    expense_type: ExpenseType;
    custom_type?: string;
    amount: number;
    description?: string;
    expense_date: string;
  }) => Promise<{ error: Error | null }>;
  expense?: Expense | null;
  campuses: Campus[];
}

export function ExpenseModal({ open, onClose, onSubmit, expense, campuses }: ExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    campus_id: "",
    expense_type: "Other" as ExpenseType,
    custom_type: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        campus_id: expense.campus_id,
        expense_type: expense.expense_type,
        custom_type: expense.custom_type || "",
        amount: String(expense.amount),
        description: expense.description || "",
        expense_date: expense.expense_date,
      });
    } else {
      setFormData({
        campus_id: campuses[0]?.id || "",
        expense_type: "Other",
        custom_type: "",
        amount: "",
        description: "",
        expense_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [expense, open, campuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campus_id || !formData.amount) return;

    setLoading(true);
    const { error } = await onSubmit({
      campus_id: formData.campus_id,
      expense_type: formData.expense_type,
      custom_type: formData.custom_type || undefined,
      amount: Number(formData.amount) || 0,
      description: formData.description || undefined,
      expense_date: formData.expense_date,
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
            {expense ? "Edit Expense" : "Add Expense"}
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
              <Label>Expense Type *</Label>
              <Select
                value={formData.expense_type}
                onValueChange={(value: ExpenseType) => setFormData({ ...formData, expense_type: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Electricity">Electricity</SelectItem>
                  <SelectItem value="Water">Water</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="Repairs">Repairs</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="5000"
                className="bg-background border-border"
                required
              />
            </div>
          </div>

          {formData.expense_type === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="custom_type">Custom Type</Label>
              <Input
                id="custom_type"
                value={formData.custom_type}
                onChange={(e) => setFormData({ ...formData, custom_type: e.target.value })}
                placeholder="e.g., Internet Bill"
                className="bg-background border-border"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expense_date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Date *
            </Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              className="bg-background border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details..."
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? "Saving..." : expense ? "Update" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

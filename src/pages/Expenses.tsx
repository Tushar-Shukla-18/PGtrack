import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Zap,
  Droplets,
  Wrench,
  Sparkles,
  Users,
  Package,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExpenses } from "@/hooks/useExpenses";
import { useCampuses } from "@/hooks/useCampuses";
import { ExpenseModal } from "@/components/modals/ExpenseModal";
import { format } from "date-fns";

const expenseTypeIcons: Record<string, any> = {
  Electricity: Zap,
  Water: Droplets,
  Maintenance: Wrench,
  Cleaning: Sparkles,
  Repairs: Wrench,
  Salary: Users,
  Other: Package,
};

export default function Expenses() {
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const campusId = selectedCampus === "all" ? undefined : selectedCampus;
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses(campusId);
  const { campuses } = useCampuses();

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = (expense.description || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      typeFilter === "all" ||
      expense.expense_type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDeleteExpense = async (expense: any) => {
    await deleteExpense(expense.id);
  };

  const handleSaveExpense = async (data: any) => {
    if (editingExpense) {
      return updateExpense(editingExpense.id, data);
    } else {
      return addExpense(data);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Expenses" subtitle="Track and manage campus expenses" selectedCampus={selectedCampus} onCampusChange={setSelectedCampus} />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Expenses"
        subtitle="Track and manage campus expenses"
        selectedCampus={selectedCampus}
        onCampusChange={setSelectedCampus}
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-gradient-to-r from-accent/10 to-warning/5 border border-accent/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Expenses (This Month)</p>
              <p className="text-3xl font-bold text-foreground">₹{totalExpenses.toLocaleString()}</p>
            </div>
            <Button onClick={handleAddExpense} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-card border-border">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="electricity">Electricity</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="repairs">Repairs</SelectItem>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">S.No</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Type</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Campus</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Description</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No expenses found. Add your first expense to get started.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense, index) => {
                    const Icon = expenseTypeIcons[expense.expense_type] || Package;
                    return (
                      <tr key={expense.id} className="hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-accent/10">
                              <Icon className="w-4 h-4 text-accent" />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {expense.expense_type === "Other" && expense.custom_type
                                ? expense.custom_type
                                : expense.expense_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{expense.campus_name || "-"}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          ₹{expense.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                          {expense.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {format(new Date(expense.expense_date), "dd MMM yyyy")}
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
                                <DropdownMenuItem onClick={() => handleEditExpense(expense)} className="cursor-pointer gap-2">
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteExpense(expense)} className="cursor-pointer gap-2 text-destructive">
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

      <ExpenseModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveExpense}
        expense={editingExpense}
        campuses={campuses}
      />
    </DashboardLayout>
  );
}

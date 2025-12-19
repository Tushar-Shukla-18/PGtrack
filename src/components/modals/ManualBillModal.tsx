import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useTenants } from "@/hooks/useTenants";
import { useCampuses } from "@/hooks/useCampuses";
import { format } from "date-fns";

interface ManualBillModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    tenant_id: string;
    campus_id: string;
    billing_month: string;
    rent_amount: number;
    electricity_amount: number;
    other_charges: number;
    due_date: string;
  }) => Promise<{ error: Error | null }>;
}

export function ManualBillModal({ open, onClose, onSubmit }: ManualBillModalProps) {
  const { campuses } = useCampuses();
  const [selectedCampus, setSelectedCampus] = useState("");
  const { tenants } = useTenants(selectedCampus || undefined);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    tenant_id: "",
    billing_date: format(new Date(), "yyyy-MM-dd"),
    rent_amount: "",
    electricity_amount: "",
    other_charges: "",
  });

  // Auto-fill rent amount when tenant is selected
  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find((t) => t.id === formData.tenant_id);
      if (tenant) {
        setFormData((prev) => ({
          ...prev,
          rent_amount: tenant.rent_amount?.toString() || "",
        }));
      }
    }
  }, [formData.tenant_id, tenants]);

  // Calculate total
  const total =
    (parseFloat(formData.rent_amount) || 0) +
    (parseFloat(formData.electricity_amount) || 0) +
    (parseFloat(formData.other_charges) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenant_id || !selectedCampus || !formData.rent_amount || !formData.billing_date) {
      return;
    }

    setIsLoading(true);

    // Format billing_month as YYYY-MM-01 for the first of the month
    const billingDate = new Date(formData.billing_date);
    const billingMonth = `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, "0")}-01`;

    const result = await onSubmit({
      tenant_id: formData.tenant_id,
      campus_id: selectedCampus,
      billing_month: billingMonth,
      rent_amount: parseFloat(formData.rent_amount) || 0,
      electricity_amount: parseFloat(formData.electricity_amount) || 0,
      other_charges: parseFloat(formData.other_charges) || 0,
      due_date: formData.billing_date,
    });

    setIsLoading(false);

    if (!result.error) {
      setFormData({
        tenant_id: "",
        billing_date: format(new Date(), "yyyy-MM-dd"),
        rent_amount: "",
        electricity_amount: "",
        other_charges: "",
      });
      setSelectedCampus("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Create Manual Bill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campus">Campus *</Label>
            <Select value={selectedCampus} onValueChange={setSelectedCampus}>
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
            <Label htmlFor="tenant">Tenant *</Label>
            <Select
              value={formData.tenant_id}
              onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
              disabled={!selectedCampus}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder={selectedCampus ? "Select tenant" : "Select campus first"} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {tenants
                  .filter((t) => t.is_active)
                  .map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.full_name} - Room {tenant.room_no || "N/A"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_date">Billing Date *</Label>
            <Input
              id="billing_date"
              type="date"
              value={formData.billing_date}
              onChange={(e) => setFormData({ ...formData, billing_date: e.target.value })}
              className="bg-background border-border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent_amount">Rent Amount *</Label>
              <Input
                id="rent_amount"
                type="number"
                placeholder="5000"
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                className="bg-background border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="electricity_amount">Electricity</Label>
              <Input
                id="electricity_amount"
                type="number"
                placeholder="0"
                value={formData.electricity_amount}
                onChange={(e) => setFormData({ ...formData, electricity_amount: e.target.value })}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="other_charges">Other Charges</Label>
            <Input
              id="other_charges"
              type="number"
              placeholder="0"
              value={formData.other_charges}
              onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
              className="bg-background border-border"
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="text-lg font-bold text-foreground">₹{total.toLocaleString()}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.tenant_id || !selectedCampus}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Bill"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

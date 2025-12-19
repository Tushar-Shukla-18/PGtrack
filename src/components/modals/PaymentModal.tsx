import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { CheckCircle, Banknote, Smartphone, CreditCard } from "lucide-react";
import type { PaymentMethod, Bill } from "@/hooks/useBills";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (paymentMethod: PaymentMethod) => Promise<{ error: Error | null }>;
  bill: Bill | null;
}

export function PaymentModal({ open, onClose, onSubmit, bill }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    const { error } = await onSubmit(paymentMethod);
    setLoading(false);

    if (!error) {
      onClose();
    }
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Mark Bill as Paid
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tenant</span>
              <span className="font-medium text-foreground">{bill.tenant_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Room</span>
              <span className="font-medium text-foreground">{bill.room_no}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-foreground text-lg">₹{bill.total_amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="Cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="PhonePe">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    PhonePe
                  </div>
                </SelectItem>
                <SelectItem value="GooglePay">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Google Pay
                  </div>
                </SelectItem>
                <SelectItem value="Paytm">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Paytm
                  </div>
                </SelectItem>
                <SelectItem value="BankTransfer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Bank Transfer
                  </div>
                </SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-success text-primary-foreground hover:bg-success/90">
              {loading ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import {
  FileCheck2,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Calendar,
  PenTool,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { quoteTotals } from "@/lib/calc";
import { INR, fmtDate, today } from "@/lib/format";
import type { Quotation } from "@/lib/types";

interface AcceptQuotationDialogProps {
  quotation: Quotation;
  onClose: () => void;
  onSuccess?: (subId: string) => void;
}

export function AcceptQuotationDialog({
  quotation,
  onClose,
  onSuccess,
}: AcceptQuotationDialogProps) {
  const store = useStore();
  const customer = store.customers.find((c) => c.id === quotation.customerId);
  const totals = quoteTotals(quotation.lines, quotation.taxPercent);

  const [signerName, setSignerName] = useState(customer?.name ?? "");
  const [signerTitle, setSignerTitle] = useState("Authorized Representative");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeBilling, setAgreeBilling] = useState(false);
  const [completedSubId, setCompletedSubId] = useState<string | null>(null);

  const handleSignAndAccept = () => {
    if (!signerName.trim()) {
      toast.error("Please enter the authorized signatory's name");
      return;
    }
    if (!agreeTerms || !agreeBilling) {
      toast.error("Please acknowledge both agreements to proceed");
      return;
    }

    // 1. Mark quotation accepted
    store.setQuotationStatus(quotation.id, "accepted");

    // 2. Convert quotation to subscription
    const subId = store.convertQuotation(quotation.id);

    if (subId) {
      // 3. Activate subscription directly
      store.setSubscriptionStatus(
        subId,
        "active",
        `Accepted and digitally signed online by ${signerName} (${signerTitle}) on ${today()}`
      );

      // 4. Generate first invoice for subscription
      const sub = store.subscriptions.find((s) => s.id === subId);
      if (sub) {
        store.createInvoiceForPeriod(sub, sub.startDate);
      }

      // 5. Notify in-app
      store.pushNotification({
        title: "Proposal Accepted & Activated",
        body: `Quotation ${quotation.number} signed by ${signerName}. Subscription activated and first invoice generated.`,
        kind: "success",
      });

      toast.success(`Proposal ${quotation.number} accepted! Subscription created and activated.`);
      setCompletedSubId(subId);
      if (onSuccess) onSuccess(subId);
    } else {
      toast.error("Failed to convert quotation into subscription.");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        {completedSubId ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center animate-in zoom-in-75">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-display text-foreground">Subscription Activated!</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Thank you, <span className="font-semibold text-foreground">{signerName}</span>. Your proposal has been approved and your Brightloop SaaS subscription is now active.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-xs space-y-2 text-left max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proposal Ref:</span>
                <span className="font-mono font-medium">{quotation.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Term:</span>
                <span>12 Months (Renewable)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Total:</span>
                <span className="font-mono font-bold text-emerald-600">{INR(totals.total)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <Button onClick={onClose} variant="outline">
                Back to Dashboard
              </Button>
              <Button asChild>
                <a href={`/subscriptions/${completedSubId}`}>
                  View Subscription <ArrowRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <FileCheck2 className="h-5 w-5 text-primary" />
                Review & Accept Proposal ({quotation.number})
              </DialogTitle>
              <DialogDescription>
                Confirm your subscription details and authorize deployment for <span className="font-medium text-foreground">{customer?.company}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              {/* Order Summary Box */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-foreground border-b pb-2">
                  <span>Selected Products & Modules</span>
                  <span>Amount (₹)</span>
                </div>
                {quotation.lines.map((l) => (
                  <div key={l.id} className="flex justify-between text-muted-foreground">
                    <span>
                      {l.name} <span className="font-mono">× {l.qty}</span>
                    </span>
                    <span className="font-mono text-foreground">{INR(l.qty * l.unitPrice)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono text-foreground">{INR(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST ({quotation.taxPercent}%)</span>
                    <span className="font-mono text-foreground">{INR(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t">
                    <span>Total per Billing Cycle</span>
                    <span className="font-mono text-primary text-base">{INR(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Digital Signature Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Signatory Name
                  </label>
                  <Input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Designation / Title
                  </label>
                  <Input
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    placeholder="e.g. CTO / Operations Head"
                  />
                </div>
              </div>

              {/* Checkbox Agreements */}
              <div className="space-y-2.5 pt-2 border-t text-xs">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                  />
                  <label htmlFor="terms" className="leading-snug text-muted-foreground cursor-pointer">
                    I agree to the <span className="text-primary font-medium hover:underline">Brightloop Master Services Agreement</span> and confirm I am authorized to bind {customer?.company ?? "the customer"} to this contract.
                  </label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="billing"
                    checked={agreeBilling}
                    onCheckedChange={(checked) => setAgreeBilling(!!checked)}
                  />
                  <label htmlFor="billing" className="leading-snug text-muted-foreground cursor-pointer">
                    I acknowledge recurring cycle billing ({INR(totals.total)} per period) commencing upon activation.
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSignAndAccept}
                disabled={!agreeTerms || !agreeBilling || !signerName.trim()}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <PenTool className="h-4 w-4" />
                Sign & Activate Subscription
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  QrCode,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowRight,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore, paidAmountFor, outstandingFor } from "@/lib/store";
import { INR, fmtDate, today, uid } from "@/lib/format";
import type { Invoice, Payment, PaymentMethod } from "@/lib/types";

interface CustomerCheckoutDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CustomerCheckoutDialog({ invoice, onClose, onSuccess }: CustomerCheckoutDialogProps) {
  const store = useStore();
  const balance = outstandingFor(invoice, store.payments);
  const amountToPay = balance > 0 ? balance : invoice.grandTotal;

  const [activeTab, setActiveTab] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState<string | null>("gpay");
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState("4532 8192 3421 9081");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("321");
  const [cardName, setCardName] = useState(store.customers.find((c) => c.id === invoice.customerId)?.name ?? "");

  // Net banking state
  const [selectedBank, setSelectedBank] = useState("hdfc");

  // Payment flow state: "idle" | "processing" | "success"
  const [flowState, setFlowState] = useState<"idle" | "processing" | "success">("idle");
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);

  const handleCopyVpa = () => {
    navigator.clipboard.writeText("brightloop@hdfcbank");
    setCopiedVpa(true);
    toast.success("Merchant VPA copied to clipboard!");
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleProcessPayment = () => {
    setFlowState("processing");

    // Simulate realistic gateway roundtrip
    setTimeout(() => {
      let method: PaymentMethod = "upi";
      let refText = "";

      if (activeTab === "upi") {
        method = "upi";
        refText = `Customer UPI Payment via ${selectedUpiApp?.toUpperCase() ?? "UPI"} (UTR #INR${Date.now().toString().slice(-8)})`;
      } else if (activeTab === "card") {
        method = "card";
        refText = `Card ending in ${cardNumber.replace(/\s+/g, "").slice(-4)} (Auth #AUTH${Date.now().toString().slice(-6)})`;
      } else {
        method = "bank_transfer";
        refText = `Net Banking (${selectedBank.toUpperCase()}) Txn #NB${Date.now().toString().slice(-8)}`;
      }

      const payNumber = `PAY-${(store.counters.payment + 1).toString().padStart(4, "0")}`;
      const newPayment: Payment = {
        id: uid(),
        number: payNumber,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        method,
        amount: Number(amountToPay),
        date: today(),
        notes: refText,
      };

      store.addPayment(newPayment);
      useStore.setState((s) => ({
        counters: { ...s.counters, payment: s.counters.payment + 1 },
      }));

      // Push in-app confirmation notification
      store.pushNotification({
        title: "Payment Received",
        body: `Payment of ${INR(amountToPay)} for ${invoice.number} was completed successfully.`,
        kind: "success",
      });

      setCreatedPayment(newPayment);
      setFlowState("success");
      toast.success(`Payment of ${INR(amountToPay)} approved!`);
      if (onSuccess) onSuccess();
    }, 1400);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-xl">
        {flowState === "processing" ? (
          <div className="p-12 text-center space-y-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Contacting Bank Gateway...</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Securely authorizing payment of <span className="font-bold text-foreground">{INR(amountToPay)}</span>. Please do not close or refresh this window.
            </p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
              <Lock className="h-3.5 w-3.5 text-emerald-600" /> 256-bit Bank Grade Encryption
            </div>
          </div>
        ) : flowState === "success" ? (
          <div className="p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-foreground font-display">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Your payment for invoice <span className="font-semibold text-foreground">{invoice.number}</span> has been confirmed.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-mono font-medium">{createdPayment?.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">{INR(amountToPay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{fmtDate(today())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-emerald-600">PAID IN FULL</span>
              </div>
            </div>

            <Button onClick={onClose} className="w-full">
              Done & Return to Portal
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
                    Brightloop Secure Checkout
                  </span>
                  <h2 className="text-2xl font-bold font-display mt-0.5">{INR(amountToPay)}</h2>
                  <p className="text-xs text-primary-foreground/80 mt-1">
                    Invoice <span className="font-mono font-semibold">{invoice.number}</span> · Due {fmtDate(invoice.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full text-xs font-medium">
                  <Lock className="h-3 w-3" /> Secure Pay
                </div>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="p-6 space-y-5">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="upi" className="text-xs gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" /> UPI Apps
                  </TabsTrigger>
                  <TabsTrigger value="card" className="text-xs gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Cards
                  </TabsTrigger>
                  <TabsTrigger value="netbanking" className="text-xs gap-1.5">
                    <Landmark className="h-3.5 w-3.5" /> NetBanking
                  </TabsTrigger>
                </TabsList>

                {/* UPI Tab */}
                <TabsContent value="upi" className="space-y-4">
                  <div className="rounded-lg border p-4 bg-muted/20 text-center space-y-3">
                    <div className="mx-auto w-32 h-32 bg-white rounded-lg p-2 border shadow-xs flex flex-col items-center justify-center">
                      <QrCode className="h-24 w-24 text-foreground/90" />
                      <span className="text-[10px] text-muted-foreground font-mono">Scan via any UPI App</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="text-muted-foreground">UPI ID:</span>
                      <span className="font-mono font-semibold text-foreground">brightloop@hdfcbank</span>
                      <button
                        onClick={handleCopyVpa}
                        className="p-1 hover:bg-muted rounded text-primary transition-colors"
                        title="Copy UPI ID"
                      >
                        {copiedVpa ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Or Choose Your UPI App:
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "gpay", label: "Google Pay", color: "text-blue-500" },
                        { id: "phonepe", label: "PhonePe", color: "text-purple-600" },
                        { id: "paytm", label: "Paytm", color: "text-sky-500" },
                        { id: "bhim", label: "BHIM", color: "text-amber-500" },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setSelectedUpiApp(app.id)}
                          className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                            selectedUpiApp === app.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                              : "hover:bg-muted/50 border-border"
                          }`}
                        >
                          <Smartphone className={`h-4 w-4 ${app.color}`} />
                          <span>{app.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Card Tab */}
                <TabsContent value="card" className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Card Number</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 8192 3421 9081"
                      className="font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Valid Thru (MM/YY)</label>
                      <Input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">CVV / CVC</label>
                      <Input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="321"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cardholder Name</label>
                    <Input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Name on card"
                    />
                  </div>
                </TabsContent>

                {/* NetBanking Tab */}
                <TabsContent value="netbanking" className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Select Bank</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "hdfc", name: "HDFC Bank" },
                      { id: "icici", name: "ICICI Bank" },
                      { id: "sbi", name: "State Bank of India" },
                      { id: "axis", name: "Axis Bank" },
                      { id: "kotak", name: "Kotak Mahindra" },
                      { id: "other", name: "Other Indian Banks" },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                          selectedBank === b.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted/50 border-border"
                        }`}
                      >
                        <span>{b.name}</span>
                        {selectedBank === b.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Security info */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  PCI-DSS Level 1 Compliant
                </span>
                <span>Instant Receipt Generated</span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-muted/40 border-t flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleProcessPayment} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                <Lock className="h-3.5 w-3.5" />
                Pay {INR(amountToPay)} Now
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


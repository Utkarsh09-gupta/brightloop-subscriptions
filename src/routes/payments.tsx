import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  Plus,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Wallet,
  Landmark,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState, StatCard, Field } from "@/components/shared/bits";
import { useStore, outstandingFor } from "@/lib/store";
import { INR, fmtDate, today, uid } from "@/lib/format";
import type { Payment, PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
});

function RecordPaymentGlobalDialog({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const unpaidInvoices = useMemo(() => {
    return store.invoices
      .filter((inv) => inv.status !== "cancelled" && inv.status !== "paid")
      .map((inv) => {
        const bal = outstandingFor(inv, store.payments);
        const cust = store.customers.find((c) => c.id === inv.customerId);
        return { invoice: inv, balance: bal, customer: cust };
      })
      .filter((item) => item.balance > 0);
  }, [store.invoices, store.payments, store.customers]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(unpaidInvoices[0]?.invoice.id ?? "");
  const selectedItem = unpaidInvoices.find((x) => x.invoice.id === selectedInvoiceId);

  const [amount, setAmount] = useState<number>(selectedItem?.balance ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const handleInvoiceChange = (id: string) => {
    setSelectedInvoiceId(id);
    const item = unpaidInvoices.find((x) => x.invoice.id === id);
    if (item) setAmount(item.balance);
  };

  const handleSave = () => {
    if (!selectedItem) {
      toast.error("Please select an invoice to apply payment to");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amount > selectedItem.balance + 0.01) {
      toast.error(`Amount exceeds invoice balance of ${INR(selectedItem.balance)}`);
      return;
    }

    const payNumber = `PAY-${(store.counters.payment + 1).toString().padStart(4, "0")}`;
    const payment: Payment = {
      id: uid(),
      number: payNumber,
      customerId: selectedItem.invoice.customerId,
      invoiceId: selectedItem.invoice.id,
      method,
      amount: Number(amount),
      date,
      notes: notes.trim() || `Payment via ${method.toUpperCase()} for ${selectedItem.invoice.number}`,
    };

    store.addPayment(payment);
    useStore.setState((s) => ({
      counters: { ...s.counters, payment: s.counters.payment + 1 },
    }));

    toast.success(`Payment ${payNumber} of ${INR(amount)} registered successfully!`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Record Payment
          </DialogTitle>
          <DialogDescription>Apply a payment to any open customer invoice.</DialogDescription>
        </DialogHeader>

        {unpaidInvoices.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No open invoices with an outstanding balance were found. All accounts are settled!
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <Field label="Select Unpaid Invoice">
              <Select value={selectedInvoiceId} onValueChange={handleInvoiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an invoice..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {unpaidInvoices.map((item) => (
                    <SelectItem key={item.invoice.id} value={item.invoice.id}>
                      <span className="font-mono font-medium">{item.invoice.number}</span> —{" "}
                      {item.customer?.company ?? "Unknown"} ({INR(item.balance)} due)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedItem && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium text-foreground">{selectedItem.customer?.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Total:</span>
                  <span className="font-mono font-medium">{INR(selectedItem.invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold text-foreground">
                  <span>Balance Due:</span>
                  <span className="font-mono text-amber-600">{INR(selectedItem.balance)}</span>
                </div>
              </div>
            )}

            <Field label="Payment Amount (₹)">
              <Input
                type="number"
                min={1}
                max={selectedItem?.balance ?? undefined}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </Field>

            <Field label="Payment Method">
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI (GPay / PhonePe / Paytm)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT / RTGS)</SelectItem>
                  <SelectItem value="card">Credit / Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Date Received">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Field label="Reference / Notes">
              <Textarea
                placeholder="UTR number, cheque number, or transaction ID"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {unpaidInvoices.length > 0 && (
            <Button onClick={handleSave} className="gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Save Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentsPage() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isCustomer = store.role === "customer";
  const customerScopeId = isCustomer ? store.demoCustomerId || store.customers[0]?.id : null;

  const filteredPayments = useMemo(() => {
    const q = query.toLowerCase().trim();
    return store.payments
      .filter((p) => (customerScopeId ? p.customerId === customerScopeId : true))
      .filter((p) => (methodFilter === "all" ? true : p.method === methodFilter))
      .filter((p) => {
        if (!q) return true;
        const cust = store.customers.find((c) => c.id === p.customerId);
        const inv = store.invoices.find((i) => i.id === p.invoiceId);
        const text = `${p.number} ${inv?.number ?? ""} ${cust?.company ?? ""} ${cust?.name ?? ""} ${p.notes}`.toLowerCase();
        return text.includes(q);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [store.payments, store.customers, store.invoices, query, methodFilter, customerScopeId]);

  // Method totals
  const stats = useMemo(() => {
    const list = customerScopeId
      ? store.payments.filter((p) => p.customerId === customerScopeId)
      : store.payments;

    let total = 0;
    let upi = 0;
    let bank = 0;
    let cardAndCash = 0;

    list.forEach((p) => {
      total += p.amount;
      if (p.method === "upi") upi += p.amount;
      else if (p.method === "bank_transfer") bank += p.amount;
      else cardAndCash += p.amount;
    });

    return { total, upi, bank, cardAndCash };
  }, [store.payments, customerScopeId]);

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case "upi":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wallet className="h-3 w-3" /> UPI
          </span>
        );
      case "bank_transfer":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Landmark className="h-3 w-3" /> Bank Transfer
          </span>
        );
      case "card":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <CreditCard className="h-3 w-3" /> Card
          </span>
        );
      case "cash":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Banknote className="h-3 w-3" /> Cash
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground uppercase">
            {m}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isCustomer ? "My Payments" : "Payments"}
        description={
          isCustomer
            ? "Track receipt confirmations, payment modes, and settled accounts"
            : "Complete ledger of all inbound collections, bank transfers, and receipts"
        }
      >
        {!isCustomer && (
          <Button onClick={() => setIsDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        )}
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Collections" value={INR(stats.total)} hint="All time received" tone="positive" />
        <StatCard label="UPI Collections" value={INR(stats.upi)} hint="Instant transfers" />
        <StatCard label="Bank Transfers" value={INR(stats.bank)} hint="NEFT / RTGS" />
        <StatCard label="Cards & Cash" value={INR(stats.cardAndCash)} hint="Direct settlements" />
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payment #, invoice, customer, reference..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Methods" },
            { id: "upi", label: "UPI" },
            { id: "bank_transfer", label: "Bank Transfer" },
            { id: "card", label: "Card" },
            { id: "cash", label: "Cash" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={methodFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMethodFilter(tab.id)}
              className="text-xs h-8"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="No payments found"
          description={query ? "No payment receipts match your criteria." : "There are no recorded payments yet."}
          action={
            !isCustomer ? (
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" /> Record First Payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Payment #</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference / Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((p) => {
                const customer = store.customers.find((c) => c.id === p.customerId);
                const invoice = store.invoices.find((i) => i.id === p.invoiceId);

                return (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-medium text-foreground">
                      {p.number}
                    </TableCell>

                    <TableCell>
                      {invoice ? (
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="font-mono font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {invoice.number}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Link to={`/customers/${p.customerId}`} className="hover:underline">
                        <div className="font-medium text-foreground">{customer?.company ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{customer?.name}</div>
                      </Link>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(p.date)}
                    </TableCell>

                    <TableCell>
                      {getMethodBadge(p.method)}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {p.notes || "—"}
                    </TableCell>

                    <TableCell className="text-right font-mono font-semibold text-emerald-600">
                      {INR(p.amount)}
                    </TableCell>

                    <TableCell className="text-right">
                      {invoice && (
                        <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs">
                          <Link to={`/invoices/${invoice.id}`}>
                            Invoice <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {isDialogOpen && <RecordPaymentGlobalDialog onClose={() => setIsDialogOpen(false)} />}
    </div>
  );
}

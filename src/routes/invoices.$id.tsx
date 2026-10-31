import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Printer,
  XCircle,
  Receipt,
  Building2,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, Field } from "@/components/shared/bits";
import { useStore, paidAmountFor, outstandingFor } from "@/lib/store";
import { INR, fmtDate, today, uid, isOverdue } from "@/lib/format";
import type { Invoice, Payment, PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/invoices/$id")({
  component: InvoiceDetailPage,
});

export function PaymentDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const store = useStore();
  const payments = store.payments;
  const balance = outstandingFor(invoice, payments);

  const [amount, setAmount] = useState<number>(balance > 0 ? balance : invoice.grandTotal);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const handlePay = () => {
    if (amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (amount > balance + 0.01) {
      toast.error(`Amount exceeds outstanding balance of ${INR(balance)}`);
      return;
    }

    const payNumber = `PAY-${(store.counters.payment + 1).toString().padStart(4, "0")}`;
    const payment: Payment = {
      id: uid(),
      number: payNumber,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      method,
      amount: Number(amount),
      date,
      notes: notes.trim() || `Payment via ${method.toUpperCase()} for ${invoice.number}`,
    };

    store.addPayment(payment);
    useStore.setState((s) => ({
      counters: { ...s.counters, payment: s.counters.payment + 1 },
    }));

    toast.success(`Payment ${payNumber} of ${INR(amount)} recorded successfully`);
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
          <DialogDescription>
            Register payment against invoice <span className="font-semibold text-foreground">{invoice.number}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Invoice Total</span>
              <span className="font-semibold">{INR(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Paid so far</span>
              <span className="text-emerald-600 font-medium">{INR(paidAmountFor(invoice, payments))}</span>
            </div>
            <div className="flex justify-between py-0.5 border-t pt-1.5 mt-1 font-medium">
              <span>Outstanding Balance</span>
              <span className="text-amber-600 font-semibold">{INR(balance)}</span>
            </div>
          </div>

          <Field label="Amount to Pay (₹)">
            <Input
              type="number"
              min={1}
              max={balance}
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
                <SelectItem value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</SelectItem>
                <SelectItem value="card">Credit / Debit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Payment Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <Field label="Notes / Reference / UTR Number">
            <Textarea
              placeholder="e.g. UTR #129381203, Bank Reference, etc."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePay} className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Confirm Payment ({INR(amount)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetailPage() {
  const { id } = useParams({ from: "/invoices/$id" });
  const store = useStore();
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  const invoice = store.invoices.find((i) => i.id === id);
  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
        <h2 className="text-xl font-semibold">Invoice not found</h2>
        <p className="text-muted-foreground mt-1 mb-4">The invoice you are looking for does not exist or has been removed.</p>
        <Button asChild variant="outline">
          <Link to="/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const customer = store.customers.find((c) => c.id === invoice.customerId);
  const subscription = invoice.subscriptionId ? store.subscriptions.find((s) => s.id === invoice.subscriptionId) : null;
  const payments = store.payments.filter((p) => p.invoiceId === invoice.id);
  const paid = paidAmountFor(invoice, store.payments);
  const balance = outstandingFor(invoice, store.payments);
  const overdue = isOverdue(invoice.status, invoice.dueDate);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3" data-print-hide>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight font-display">{invoice.number}</h1>
              <StatusBadge status={overdue ? "overdue" : invoice.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issued {fmtDate(invoice.issueDate)} · Due {fmtDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>

          {invoice.status === "draft" && (
            <Button
              size="sm"
              onClick={() => {
                store.confirmInvoice(invoice.id);
                toast.success("Invoice confirmed");
              }}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm Invoice
            </Button>
          )}

          {balance > 0 && invoice.status !== "cancelled" && (
            <Button
              size="sm"
              onClick={() => setPayDialogOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          )}

          {invoice.status !== "cancelled" && invoice.status !== "paid" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                store.cancelInvoice(invoice.id);
                toast.info("Invoice marked as cancelled");
              }}
              className="gap-1.5 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Printable Sheet */}
      <Card className="print-sheet shadow-sm border overflow-hidden">
        <CardContent className="p-8 sm:p-10 space-y-8">
          {/* Company Branding & Invoice Meta */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  B
                </div>
                <span className="text-xl font-bold tracking-tight font-display">Brightloop Software</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Brightloop Cloud Technologies Pvt. Ltd.<br />
                SaaS Nagar, Cyber Hub, Lucknow, UP 226010<br />
                GSTIN: <span className="font-mono font-medium">09AAACB1234D1Z5</span>
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                Tax Invoice
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{invoice.number}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Issue Date:</span> {fmtDate(invoice.issueDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Due Date:</span> {fmtDate(invoice.dueDate)}
              </p>
              {invoice.billingPeriod && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Billing Period:</span> {invoice.billingPeriod}
                </p>
              )}
              {subscription && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Subscription:</span>{" "}
                  <Link to={`/subscriptions/${subscription.id}`} className="text-primary hover:underline font-mono">
                    {subscription.number}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Bill To & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-lg border">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Billed To
              </p>
              <p className="font-semibold text-base text-foreground">{customer?.company ?? "Unknown Customer"}</p>
              <p className="text-sm text-foreground/80">{customer?.name}</p>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                {customer?.billingAddress ?? "No address on file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                <span className="font-medium">Email:</span> {customer?.email}
                {customer?.phone && ` · Phone: ${customer.phone}`}
              </p>
              {customer?.taxId && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium">GSTIN:</span>{" "}
                  <span className="font-mono font-medium text-foreground">{customer.taxId}</span>
                </p>
              )}
            </div>

            <div className="sm:text-right flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-1">
                  Payment Status
                </p>
                <div className="flex sm:justify-end">
                  <StatusBadge status={overdue ? "overdue" : invoice.status} />
                </div>
                {overdue && (
                  <p className="text-xs text-destructive font-medium flex items-center sm:justify-end gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Overdue for payment
                  </p>
                )}
              </div>

              <div className="pt-4 border-t sm:border-0">
                <p className="text-xs text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold font-display text-primary">{INR(balance)}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-2.5 pr-4">Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 pl-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoice.lines.map((line) => {
                  const lineSub = line.qty * line.unitPrice;
                  return (
                    <tr key={line.id} className="hover:bg-muted/10">
                      <td className="py-3 pr-4 font-medium text-foreground">{line.description}</td>
                      <td className="py-3 px-3 text-right font-mono">{line.qty}</td>
                      <td className="py-3 px-3 text-right font-mono">{INR(line.unitPrice)}</td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">{line.taxPercent}%</td>
                      <td className="py-3 pl-3 text-right font-mono font-medium">{INR(lineSub)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Calculation */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t">
            <div className="max-w-xs text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Terms & Bank Details:</p>
              <p>Bank: HDFC Bank, Hazratganj Branch</p>
              <p>A/C: <span className="font-mono">50200012345678</span> · IFSC: <span className="font-mono">HDFC0001234</span></p>
              <p>UPI ID: <span className="font-mono font-semibold text-foreground">brightloop@hdfcbank</span></p>
              {invoice.notes && (
                <div className="mt-2 p-2 rounded bg-muted/40">
                  <span className="font-medium text-foreground">Note:</span> {invoice.notes}
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono text-foreground">{INR(invoice.subtotal)}</span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-mono">- {INR(invoice.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>GST ({invoice.lines[0]?.taxPercent ?? 18}%)</span>
                <span className="font-mono text-foreground">{INR(invoice.taxTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total</span>
                <span className="font-mono text-primary">{INR(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600 font-medium">
                <span>Paid</span>
                <span className="font-mono">{INR(paid)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed pt-2 font-bold text-base text-foreground bg-muted/30 px-2 py-1.5 rounded">
                <span>Balance Due</span>
                <span className="font-mono text-amber-600">{INR(balance)}</span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          {payments.length > 0 && (
            <div className="pt-6 border-t space-y-3" data-print-hide>
              <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Payment History
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Payment #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-medium">{p.number}</TableCell>
                        <TableCell className="text-xs">{fmtDate(p.date)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted uppercase tracking-wider">
                            {p.method.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.notes}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-600">
                          {INR(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {payDialogOpen && <PaymentDialog invoice={invoice} onClose={() => setPayDialogOpen(false)} />}
    </div>
  );
}

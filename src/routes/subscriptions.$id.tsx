import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Printer, RefreshCw, Trash2, Plus, XCircle, CheckCircle2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, Field } from "@/components/shared/bits";
import { useStore } from "@/lib/store";
import { INR, addDays, addMonths, fmtDate, today, uid } from "@/lib/format";
import type { Subscription, SubscriptionLine } from "@/lib/types";

export const Route = createFileRoute("/subscriptions/$id")({
  component: SubscriptionDetail,
});

export function SubscriptionDialog({ subscription, onClose }: { subscription: Subscription | null; onClose: () => void }) {
  const store = useStore();
  const isNew = !subscription;
  const [customerId, setCustomerId] = useState(subscription?.customerId ?? "");
  const [planId, setPlanId] = useState("");
  const [qty, setQty] = useState(1);
  const [startDate, setStartDate] = useState(subscription?.startDate ?? today());
  const [lines, setLines] = useState<SubscriptionLine[]>(subscription?.lines ?? []);
  const [taxPercent, setTaxPercent] = useState(subscription?.taxPercent ?? 18);

  const addPlan = () => {
    const plan = store.plans.find((p) => p.id === planId);
    if (!plan) return toast.error("Pick a plan");
    if (qty < plan.minQuantity) return toast.error(`Minimum quantity for this plan is ${plan.minQuantity}`);
    setLines([...lines, { id: uid(), kind: "plan", refId: plan.id, name: plan.name, qty, unitPrice: plan.price }]);
  };

  const save = () => {
    if (!customerId) return toast.error("Select a customer");
    if (lines.length === 0) return toast.error("Add at least one plan line");
    const sub: Subscription = {
      id: subscription?.id ?? uid(),
      number: subscription?.number ?? `SB-${(store.counters.subscription + 1).toString().padStart(4, "0")}`,
      customerId, quotationId: subscription?.quotationId ?? null,
      startDate, endDate: subscription?.endDate ?? addMonths(startDate, 12),
      status: subscription?.status ?? "draft", paymentTerms: subscription?.paymentTerms ?? "Net 15",
      lines, taxPercent, discountId: subscription?.discountId ?? null,
      billingCycleCount: subscription?.billingCycleCount ?? 0,
      history: subscription?.history ?? [{ id: uid(), event: "Created", at: today(), note: "" }],
      createdAt: subscription?.createdAt ?? today(),
    };
    store.upsertSubscription(sub);
    if (isNew) useStore.setState((s) => ({ counters: { ...s.counters, subscription: s.counters.subscription + 1 } }));
    toast.success(isNew ? "Subscription created (draft)" : "Subscription updated");
    onClose();
  };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = Math.round(subtotal * taxPercent) / 100;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "New subscription" : "Edit subscription"}</DialogTitle>
          <DialogDescription>Starts as a draft; confirm and activate it from the detail page.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{store.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Start date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          </div>
          {!isNew && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Add plan line">
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
                  <SelectContent>{store.plans.filter((p) => !p.archived).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Qty"><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
              <div className="flex items-end"><Button variant="outline" className="w-full" onClick={addPlan}><Plus className="size-4" /> Add</Button></div>
            </div>
          )}
          <div>
            {lines.length === 0 && <p className="text-xs text-muted-foreground">Pick a plan to add the first line{isNew ? " after creating the subscription" : ""}.</p>}
            {lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b py-2 text-sm">
                <span>{l.name} × {l.qty}</span>
                <div className="flex items-center gap-3">
                  <span>{INR(l.qty * l.unitPrice)}</span>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GST / tax (%)"><Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} /></Field>
            <Field label="Payment terms"><Input value={subscription?.paymentTerms ?? "Net 15"} disabled /></Field>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{INR(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{INR(tax)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold"><span>Total per cycle</span><span>{INR(subtotal + tax)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{isNew ? "Create subscription" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionDetail() {
  const { id } = Route.useParams();
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const s = store.subscriptions.find((x) => x.id === id);
  if (!s) return <p className="text-sm text-muted-foreground">Subscription not found.</p>;

  const customer = store.customers.find((c) => c.id === s.customerId);
  const subtotal = s.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const tax = Math.round(subtotal * s.taxPercent) / 100;
  const invoices = store.invoices.filter((i) => i.subscriptionId === s.id);

  const confirm = () => { store.setSubscriptionStatus(s.id, "confirmed"); toast.success("Subscription confirmed"); };
  const activate = () => {
    store.setSubscriptionStatus(s.id, "active");
    store.createInvoiceForPeriod({ ...s, status: "active" }, s.startDate);
    toast.success("Subscription activated — first invoice generated");
  };
  const generateNow = () => {
    const inv = store.createInvoiceForPeriod(s, today());
    if (inv) toast.success(`Invoice ${inv.number} generated for the current period`);
    else toast.info("An invoice for this period already exists — skipped (idempotency guard)");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3" data-print-hide>
        <div>
          <Link to="/subscriptions" className="text-sm text-muted-foreground hover:underline">← Subscriptions</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">{s.number} <StatusBadge status={s.status} /></h1>
          <p className="text-sm text-muted-foreground">{customer?.company} · {fmtDate(s.startDate)} → {fmtDate(s.endDate)} · {s.paymentTerms}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          {s.status === "draft" && <Button size="sm" variant="outline" onClick={confirm}><CheckCircle2 className="size-4" /> Confirm</Button>}
          {s.status === "confirmed" && <Button size="sm" onClick={activate}>Activate</Button>}
          {s.status === "active" && (
            <>
              <Button size="sm" variant="outline" onClick={generateNow}><Receipt className="size-4" /> Generate invoice</Button>
              <Button size="sm" variant="outline" onClick={() => { store.setSubscriptionStatus(s.id, "paused"); toast.success("Paused"); }}><Pause className="size-4" /> Pause</Button>
              <Button size="sm" variant="outline" onClick={() => { store.renewSubscription(s.id); toast.success("Renewed for 12 months"); }}><RefreshCw className="size-4" /> Renew</Button>
            </>
          )}
          {s.status === "paused" && <Button size="sm" variant="outline" onClick={() => { store.setSubscriptionStatus(s.id, "active"); toast.success("Resumed"); }}><Play className="size-4" /> Resume</Button>}
          {s.status !== "closed" && s.status !== "draft" && (
            <Button size="sm" variant="outline" onClick={() => { store.setSubscriptionStatus(s.id, "closed"); toast.success("Closed"); }}><XCircle className="size-4" /> Close</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="print-sheet lg:col-span-2">
          <CardContent className="p-6">
            <p className="font-medium">Line items</p>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Plan</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th></tr></thead>
              <tbody>
                {s.lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2.5">{l.name}</td><td className="py-2.5 text-right">{l.qty}</td>
                    <td className="py-2.5 text-right">{INR(l.unitPrice)}</td><td className="py-2.5 text-right">{INR(l.qty * l.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 ml-auto w-60 text-sm">
              <div className="flex justify-between py-1"><span>Subtotal</span><span>{INR(subtotal)}</span></div>
              <div className="flex justify-between py-1 text-muted-foreground"><span>Tax ({s.taxPercent}%)</span><span>{INR(tax)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between py-1 font-semibold"><span>Total per cycle</span><span>{INR(subtotal + tax)}</span></div>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Billing cycles invoiced: {s.billingCycleCount} · Quotation: {s.quotationId ? store.quotations.find((q) => q.id === s.quotationId)?.number : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="font-medium">History</p>
            <ol className="mt-3 space-y-3 border-l pl-4 text-sm">
              {s.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                  <p className="font-medium">{h.event}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(h.at)}{h.note ? ` · ${h.note}` : ""}</p>
                </li>
              ))}
            </ol>
            {invoices.length > 0 && (
              <>
                <p className="mt-6 font-medium">Invoices</p>
                <div className="mt-2 space-y-1 text-sm">
                  {invoices.map((i) => (
                    <Link key={i.id} to="/invoices/$id" params={{ id: i.id }} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted">
                      <span>{i.number}</span><StatusBadge status={i.status} />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {editing && <SubscriptionDialog subscription={s} onClose={() => setEditing(false)} />}
      <span className="hidden">{addDays(today(), 0)}</span>
    </div>
  );
}

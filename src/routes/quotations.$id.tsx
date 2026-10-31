import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Printer, Trash2, Plus, PenTool } from "lucide-react";
import { AcceptQuotationDialog } from "@/components/shared/accept-quotation-dialog";
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
import { quoteTotals, taxPercentFor } from "@/lib/calc";
import { INR, addDays, fmtDate, today, uid } from "@/lib/format";
import type { QuoteLine, Quotation, QuotationStatus } from "@/lib/types";

export const Route = createFileRoute("/quotations/$id")({
  component: QuotationDetail,
});

export function QuotationDialog({ quotation, onClose }: { quotation: Quotation | null; onClose: () => void }) {
  const store = useStore();
  const isNew = !quotation;
  const [customerId, setCustomerId] = useState(quotation?.customerId ?? "");
  const [templateId, setTemplateId] = useState<string>(quotation?.templateId ?? "none");
  const [validityDays, setValidityDays] = useState(quotation?.validityDays ?? 30);
  const [taxPercent, setTaxPercent] = useState(quotation?.taxPercent ?? 18);
  const [notes, setNotes] = useState(quotation?.notes ?? "");
  const [lines, setLines] = useState<QuoteLine[]>(quotation?.lines ?? []);

  const addItem = (kind: "product" | "plan") => {
    if (kind === "product") {
      const p = store.products.find((x) => !x.archived);
      if (!p) return toast.error("Add a product first");
      const variant = p.variants.find((v) => v.id === p.variantId);
      setLines([...lines, { id: uid(), kind, refId: p.id, name: p.name + (variant ? ` (${variant.name})` : ""), qty: 1, unitPrice: p.salesPrice + (variant?.priceDelta ?? 0) }]);
    } else {
      const pl = store.plans.find((x) => !x.archived && x.active);
      if (!pl) return toast.error("Add an active plan first");
      setLines([...lines, { id: uid(), kind, refId: pl.id, name: pl.name, qty: pl.minQuantity, unitPrice: pl.price }]);
    }
  };

  const save = () => {
    if (!customerId) return toast.error("Select a customer");
    if (lines.length === 0) return toast.error("Add at least one line");
    const issueDate = quotation?.issueDate ?? today();
    const q: Quotation = {
      id: quotation?.id ?? uid(),
      number: quotation?.number ?? `QT-${(store.counters.quotation + 1).toString().padStart(4, "0")}`,
      customerId, templateId: templateId === "none" ? null : templateId,
      lines, validityDays, issueDate, expiryDate: addDays(issueDate, validityDays),
      status: quotation?.status ?? "draft", notes, taxPercent, createdAt: quotation?.createdAt ?? today(),
    };
    store.upsertQuotation(q);
    if (isNew) useStore.setState((s) => ({ counters: { ...s.counters, quotation: s.counters.quotation + 1 } }));
    toast.success(isNew ? "Quotation created" : "Quotation updated");
    onClose();
  };

  const totals = quoteTotals(lines, taxPercent);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create quotation" : "Edit quotation"}</DialogTitle>
          <DialogDescription>Add products or plans, set validity and taxes. Totals recalculate live.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-2">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Customer">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {store.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Template">
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {store.quotationTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Validity (days)">
              <Input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
            </Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium">Line items</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addItem("product")}><Plus className="size-3.5" /> Product</Button>
                <Button size="sm" variant="outline" onClick={() => addItem("plan")}><Plus className="size-3.5" /> Plan</Button>
              </div>
            </div>
            {lines.length === 0 && <p className="text-xs text-muted-foreground">No items yet.</p>}
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.id} className="grid grid-cols-[1fr_70px_110px_36px] items-center gap-2">
                  <Input value={l.name} onChange={(e) => setLines(lines.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)))} />
                  <Input type="number" value={l.qty} onChange={(e) => setLines(lines.map((x) => (x.id === l.id ? { ...x, qty: Number(e.target.value) } : x)))} />
                  <Input type="number" value={l.unitPrice} onChange={(e) => setLines(lines.map((x) => (x.id === l.id ? { ...x, unitPrice: Number(e.target.value) } : x)))} />
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GST / tax (%)"><Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} /></Field>
            <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{INR(totals.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax ({taxPercent}%)</span><span>{INR(totals.tax)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold"><span>Total</span><span>{INR(totals.total)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{isNew ? "Create quotation" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuotationDetail() {
  const { id } = Route.useParams();
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const q = store.quotations.find((x) => x.id === id);
  if (!q) return <p className="text-sm text-muted-foreground">Quotation not found.</p>;

  const totals = quoteTotals(q.lines, q.taxPercent);
  const customer = store.customers.find((c) => c.id === q.customerId);
  const template = store.quotationTemplates.find((t) => t.id === q.templateId);
  const actions: { label: string; status: QuotationStatus | null }[] = [
    { label: "Mark as sent", status: "sent" },
    { label: "Mark accepted", status: "accepted" },
    { label: "Cancel", status: "cancelled" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3" data-print-hide>
        <div>
          <Link to="/quotations" className="text-sm text-muted-foreground hover:underline">← Quotations</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">{q.number} <StatusBadge status={q.status} /></h1>
          <p className="text-sm text-muted-foreground">Valid until {fmtDate(q.expiryDate)} · issued {fmtDate(q.issueDate)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print / PDF</Button>
          {q.status !== "accepted" && q.status !== "cancelled" && (
            <Button size="sm" onClick={() => setSignDialogOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              <PenTool className="size-4" /> Review & Sign
            </Button>
          )}
          {actions.filter((a) => a.status !== q.status).map((a) => (
            <Button key={a.label} size="sm" variant={a.status === "accepted" ? "default" : "outline"}
              onClick={() => { store.setQuotationStatus(q.id, a.status!); toast.success(`${q.number} ${a.status}`); }}>
              {a.label}
            </Button>
          ))}
          {q.status === "accepted" && (
            <Button size="sm" onClick={() => {
              const subId = store.convertQuotation(q.id);
              if (subId) toast.success("Subscription created from quotation");
              else toast.error("Could not convert");
            }}>
              Convert to subscription <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Card className="print-sheet">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-lg font-semibold">Brightloop Software</p>
              <p className="text-xs text-muted-foreground">Quotation {q.number}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium">{customer?.company}</p>
              <p className="text-xs text-muted-foreground">{customer?.billingAddress}</p>
              <p className="text-xs text-muted-foreground">GSTIN: {customer?.taxId}</p>
            </div>
          </div>
          {template && <p className="mt-4 text-sm text-muted-foreground">{template.intro}</p>}
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {q.lines.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="py-2.5">{l.name} <span className="text-xs text-muted-foreground">({l.kind})</span></td>
                  <td className="py-2.5 text-right">{l.qty}</td>
                  <td className="py-2.5 text-right">{INR(l.unitPrice)}</td>
                  <td className="py-2.5 text-right">{INR(l.qty * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-64 text-sm">
            <div className="flex justify-between py-1"><span>Subtotal</span><span>{INR(totals.subtotal)}</span></div>
            <div className="flex justify-between py-1 text-muted-foreground"><span>Tax ({q.taxPercent}%)</span><span>{INR(totals.tax)}</span></div>
            <Separator className="my-2" />
            <div className="flex justify-between py-1 font-semibold"><span>Grand total</span><span>{INR(totals.total)}</span></div>
          </div>
          {q.notes && <p className="mt-4 text-sm"><span className="font-medium">Notes: </span>{q.notes}</p>}
          {template?.terms && <p className="mt-2 text-xs text-muted-foreground">{template.terms}</p>}
        </CardContent>
      </Card>

      {editing && <QuotationDialog quotation={q} onClose={() => setEditing(false)} />}
      {signDialogOpen && <AcceptQuotationDialog quotation={q} onClose={() => setSignDialogOpen(false)} />}
    </div>
  );
}

void taxPercentFor;

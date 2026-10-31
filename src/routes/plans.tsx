import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyState, Field } from "@/components/shared/bits";
import { useStore } from "@/lib/store";
import { INR, fmtDate, frequencyLabel, today, uid } from "@/lib/format";
import type { BillingFrequency, Plan } from "@/lib/types";

export const Route = createFileRoute("/plans")({
  validateSearch: (s: Record<string, string>) => ({ new: s.new === "1" ? "1" : undefined }),
  component: PlansPage,
});

const emptyPlan = (productId: string | undefined): Plan => ({
  id: uid(), name: "", productId: productId ?? "", price: 0, frequency: "monthly", minQuantity: 1,
  availableFrom: today(), availableTo: "", autoClose: false, allowEarlyClose: true, allowPause: true,
  allowRenewal: true, active: true, archived: false, createdAt: today(),
});

function PlansPage() {
  const store = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (search.new === "1") {
      setEditing(emptyPlan(store.products.find((p) => !p.archived)?.id));
      setIsNew(true);
      navigate({ to: "/plans", search: {} });
    }
  }, [search.new, navigate, store.products]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return store.plans.filter((p) => !q || (p.name + productOf(p.productId)).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.plans, store.products, query]);

  const productOf = (id: string) => store.products.find((p) => p.id === id)?.name ?? "—";

  const save = (p: Plan) => {
    if (!p.name.trim()) return toast.error("Plan name is required");
    if (!p.productId) return toast.error("Pick a related product");
    store.upsertPlan(p);
    toast.success(isNew ? "Plan created" : "Plan updated");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscription plans"
        description="Recurring offers built on top of products — price, cadence and lifecycle rules."
        actions={<Button size="sm" onClick={() => { setEditing(emptyPlan(store.products.find((p) => !p.archived)?.id)); setIsNew(true); }}><Plus className="size-4" /> Create plan</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search plans…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No plans found" description="Create a plan to start selling recurring subscriptions." />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Price</TableHead>
                <TableHead>Frequency</TableHead><TableHead className="text-right">Min qty</TableHead><TableHead>Availability</TableHead><TableHead>Rules</TableHead><TableHead>Status</TableHead><TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{productOf(p.productId)}</TableCell>
                  <TableCell className="text-right font-medium">{INR(p.price)}</TableCell>
                  <TableCell>{frequencyLabel[p.frequency]}</TableCell>
                  <TableCell className="text-right">{p.minQuantity}</TableCell>
                  <TableCell className="text-xs">{fmtDate(p.availableFrom)} → {fmtDate(p.availableTo)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.autoClose && <Badge variant="outline">Auto close</Badge>}
                      {p.allowPause && <Badge variant="outline">Pausable</Badge>}
                      {p.allowRenewal && <Badge variant="outline">Renewable</Badge>}
                      {p.allowEarlyClose && <Badge variant="outline">Early close</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={p.active} onCheckedChange={(v) => { store.setPlanActive(p.id, v); toast.success(v ? "Plan activated" : "Plan deactivated"); }} aria-label="Toggle plan" />
                      {p.archived && <Badge variant="outline" className="bg-muted">Archived</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing({ ...p }); setIsNew(false); }}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => store.archivePlan(p.id, !p.archived)}>
                          {p.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                          {p.archived ? "Restore" : "Archive"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing && <PlanDialog plan={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function PlanDialog({ plan, isNew, onClose, onSave }: { plan: Plan; isNew: boolean; onClose: () => void; onSave: (p: Plan) => void }) {
  const store = useStore();
  const [p, setP] = useState<Plan>(plan);
  const set = (patch: Partial<Plan>) => setP({ ...p, ...patch });
  const product = store.products.find((x) => x.id === p.productId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create plan" : "Edit plan"}</DialogTitle>
          <DialogDescription>Plans inherit the product's price by default; override it per cadence.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan name">
              <Input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. CRM Essentials — Monthly" />
            </Field>
            <Field label="Related product">
              <Select value={p.productId} onValueChange={(v) => set({ productId: v, price: product && p.price === 0 ? store.products.find((x) => x.id === v)?.salesPrice ?? p.price : p.price })}>
                <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
                <SelectContent>
                  {store.products.filter((x) => !x.archived).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price (₹)">
              <Input type="number" value={p.price} onChange={(e) => set({ price: Number(e.target.value) })} />
            </Field>
            <Field label="Billing frequency">
              <Select value={p.frequency} onValueChange={(v) => set({ frequency: v as BillingFrequency })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Minimum quantity">
              <Input type="number" value={p.minQuantity} onChange={(e) => set({ minQuantity: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Available from">
              <Input type="date" value={p.availableFrom} onChange={(e) => set({ availableFrom: e.target.value })} />
            </Field>
            <Field label="Available until">
              <Input type="date" value={p.availableTo} onChange={(e) => set({ availableTo: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            {([
              ["autoClose", "Automatic closure at end date"],
              ["allowEarlyClose", "Allow early closure"],
              ["allowPause", "Allow pause"],
              ["allowRenewal", "Allow renewal"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <Switch checked={p[key]} onCheckedChange={(v) => set({ [key]: v })} />
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(p)}>{isNew ? "Create plan" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

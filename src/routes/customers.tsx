import { createFileRoute, Link, useNavigate, Outlet, useChildMatches } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState, Field, StatusBadge } from "@/components/shared/bits";
import { useStore, outstandingFor } from "@/lib/store";
import { INR0, fmtDate, isOverdue, today, uid } from "@/lib/format";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/customers")({
  validateSearch: (s: { new?: string }) => ({ new: s.new === "1" ? "1" : undefined }),
  component: CustomersPage,
});

const emptyCustomer = (): Customer => ({
  id: uid(), name: "", email: "", phone: "", company: "", billingAddress: "", taxId: "", createdAt: today(),
});

function CustomersPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;

  const store = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  useEffect(() => {
    if (search.new === "1") {
      setEditing(emptyCustomer());
      setIsNew(true);
      navigate({ to: "/customers", search: {} });
    }
  }, [search.new, navigate]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return store.customers.filter((c) => !q || (c.name + c.company + c.email).toLowerCase().includes(q));
  }, [store.customers, query]);

  const save = (c: Customer) => {
    if (!c.name.trim() || !c.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) {
      toast.error("Enter a valid email address");
      return;
    }
    store.upsertCustomer(c);
    toast.success(isNew ? "Customer added" : "Customer updated");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description="Companies and contacts billed by Brightloop."
        actions={<Button size="sm" onClick={() => { setEditing(emptyCustomer()); setIsNew(true); }}><Plus className="size-4" /> Add customer</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search customers…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead><TableHead>Company</TableHead><TableHead>Email</TableHead>
                <TableHead>Registered</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const cInvoices = store.invoices.filter((i) => i.customerId === c.id && (i.status === "confirmed" || i.status === "paid"));
                const out = cInvoices.reduce((s, i) => s + outstandingFor(i, store.payments), 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to="/customers/$id" params={{ id: c.id }} className="font-medium hover:underline">{c.name}</Link>
                    </TableCell>
                    <TableCell>{c.company}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>{fmtDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right font-medium">{out > 0 ? <span className="text-warning">{INR0(out)}</span> : "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate({ to: "/customers/$id", params: { id: c.id } })}>Open profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditing({ ...c }); setIsNew(false); }}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setToDelete(c)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {editing && <CustomerDialog customer={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={save} />}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.company}”?</AlertDialogTitle>
            <AlertDialogDescription>The customer record is removed. Existing invoices and subscriptions stay for records but will show without a name.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { store.deleteCustomer(toDelete!.id); toast.success("Customer deleted"); setToDelete(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function CustomerDialog({ customer, isNew, onClose, onSave }: { customer: Customer; isNew: boolean; onClose: () => void; onSave: (c: Customer) => void }) {
  const [c, setC] = useState<Customer>(customer);
  const set = (patch: Partial<Customer>) => setC({ ...c, ...patch });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add customer" : "Edit customer"}</DialogTitle>
          <DialogDescription>Billing details used on quotations and invoices.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name"><Input value={c.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="Company name"><Input value={c.company} onChange={(e) => set({ company: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={c.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={c.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          </div>
          <Field label="Billing address"><Textarea rows={2} value={c.billingAddress} onChange={(e) => set({ billingAddress: e.target.value })} /></Field>
          <Field label="Tax identification (GSTIN)"><Input value={c.taxId} onChange={(e) => set({ taxId: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(c)}>{isNew ? "Add customer" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// re-export StatusBadge so the detail route can reuse the same source
export const _StatusBadge = StatusBadge;

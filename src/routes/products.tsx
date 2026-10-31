import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, EmptyState, Field } from "@/components/shared/bits";
import { useStore } from "@/lib/store";
import { INR, today, uid } from "@/lib/format";
import type { Product, ProductType, ProductVariant } from "@/lib/types";

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, string>) => ({ new: s.new === "1" ? "1" : undefined }),
  component: ProductsPage,
});

const emptyProduct = (): Product => ({
  id: uid(), name: "", type: "subscription", salesPrice: 0, costPrice: 0, notes: "",
  variants: [], variantId: null, archived: false, createdAt: today(),
});

function ProductsPage() {
  const store = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  useEffect(() => {
    if (search.new === "1") {
      setEditing(emptyProduct());
      setIsNew(true);
      navigate({ to: "/products", search: {} });
    }
  }, [search.new, navigate]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return store.products.filter(
      (p) =>
        (typeFilter === "all" || p.type === typeFilter) &&
        (!q || (p.name + p.notes).toLowerCase().includes(q)),
    );
  }, [store.products, query, typeFilter]);

  const save = (p: Product) => {
    if (!p.name.trim()) return toast.error("Product name is required");
    store.upsertProduct(p);
    toast.success(isNew ? "Product created" : "Product updated");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Modules, licences and services offered by Brightloop, with brand variants."
        actions={<Button size="sm" onClick={() => { setEditing(emptyProduct()); setIsNew(true); }}><Plus className="size-4" /> Add product</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search products…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
            <SelectItem value="license">License</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="addon">Add-on</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No products found" description="Adjust the filters or add your first product." />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Sales price</TableHead>
                <TableHead className="text-right">Cost price</TableHead><TableHead>Variants</TableHead><TableHead>Status</TableHead><TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    {p.notes ? <p className="text-xs text-muted-foreground">{p.notes}</p> : null}
                  </TableCell>
                  <TableCell className="capitalize">{p.type}</TableCell>
                  <TableCell className="text-right font-medium">{INR(p.salesPrice)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{INR(p.costPrice)}</TableCell>
                  <TableCell>
                    {p.variants.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                      <div className="flex flex-wrap gap-1">
                        {p.variants.map((v) => (
                          <Badge key={v.id} variant="outline" className={p.variantId === v.id ? "border-primary text-primary" : ""}>
                            {v.name} {v.priceDelta > 0 ? `+₹${v.priceDelta}` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{p.archived ? <Badge variant="outline" className="bg-muted">Archived</Badge> : <Badge variant="outline" className="bg-success/15 text-success border-transparent">Active</Badge>}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing({ ...p }); setIsNew(false); }}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => store.archiveProduct(p.id, !p.archived)}>
                          {p.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                          {p.archived ? "Restore" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setToDelete(p)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing && (
        <ProductDialog product={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={save} />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the product and archives its plans. Invoices already issued are unaffected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { store.deleteProduct(toDelete!.id); toast.success("Product deleted"); setToDelete(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({ product, isNew, onClose, onSave }: { product: Product; isNew: boolean; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState<Product>(product);
  const set = (patch: Partial<Product>) => setP({ ...p, ...patch });

  const addVariant = () => {
    const v: ProductVariant = { id: uid(), name: "", priceDelta: 0 };
    set({ variants: [...p.variants, v], variantId: p.variantId ?? v.id });
  };
  const updVariant = (id: string, patch: Partial<ProductVariant>) =>
    set({ variants: p.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add product" : "Edit product"}</DialogTitle>
          <DialogDescription>Variants (e.g. brand editions) add a price delta on top of the base price.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Product name">
            <Input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Brightloop CRM" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type">
              <Select value={p.type} onValueChange={(v) => set({ type: v as ProductType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="addon">Add-on</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sales price (₹)">
              <Input type="number" value={p.salesPrice} onChange={(e) => set({ salesPrice: Number(e.target.value) })} />
            </Field>
            <Field label="Cost price (₹)">
              <Input type="number" value={p.costPrice} onChange={(e) => set({ costPrice: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Notes">
            <Input value={p.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional description" />
          </Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium">Variants</span>
              <Button variant="outline" size="sm" onClick={addVariant}><Plus className="size-3.5" /> Add variant</Button>
            </div>
            {p.variants.length === 0 && <p className="text-xs text-muted-foreground">No variants — the base price applies everywhere.</p>}
            <div className="space-y-2">
              {p.variants.map((v) => (
                <div key={v.id} className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Variant name e.g. Odoo Brand" value={v.name} onChange={(e) => updVariant(v.id, { name: e.target.value })} />
                  <Input className="w-32" type="number" placeholder="+₹" value={v.priceDelta} onChange={(e) => updVariant(v.id, { priceDelta: Number(e.target.value) })} />
                  <Button
                    variant="ghost" size="icon" className="size-8"
                    title={p.variantId === v.id ? "Default variant" : "Set as default"}
                    onClick={() => set({ variantId: v.id })}
                  >
                    <span className={p.variantId === v.id ? "text-primary" : "text-muted-foreground"}>●</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => set({ variants: p.variants.filter((x) => x.id !== v.id) })}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...p, variants: p.variants.filter((v) => v.name.trim()) })}>{isNew ? "Create product" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

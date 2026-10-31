import { createFileRoute, Link, useNavigate, Outlet, useChildMatches } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Plus, Search, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/bits";
import { QuotationDialog } from "./quotations.$id";
import { useStore } from "@/lib/store";
import { quoteTotals } from "@/lib/calc";
import { INR, fmtDate, daysBetween, today } from "@/lib/format";

export const Route = createFileRoute("/quotations")({
  validateSearch: (s: { new?: string }) => ({ new: s.new === "1" ? "1" : undefined }),
  component: QuotationsPage,
});

function QuotationsPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;

  const store = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (search.new === "1") {
      setCreating(true);
      navigate({ to: "/quotations" });
    }
  }, [search.new, navigate]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return store.quotations.filter((qt) => {
      const customer = store.customers.find((c) => c.id === qt.customerId)?.company ?? "";
      if (statusFilter !== "all" && qt.status !== statusFilter) return false;
      return !q || (qt.number + customer).toLowerCase().includes(q);
    });
  }, [store.quotations, store.customers, query, statusFilter]);

  const autoExpire = () => {
    let n = 0;
    store.quotations.forEach((qt) => {
      if (qt.status === "sent" && daysBetween(today(), qt.expiryDate) < 0) {
        store.setQuotationStatus(qt.id, "expired");
        n += 1;
      }
    });
    if (n > 0) toast.info(`${n} quotation${n > 1 ? "s" : ""} marked expired (validity passed)`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quotations"
        description="Proposals built from products and plans. Accepted quotations convert into subscriptions."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={autoExpire}>Apply expiry</Button>
            <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4" /> Create quotation</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search quotations…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["all", "draft", "sent", "accepted", "expired", "cancelled"].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize" onClick={() => setStatusFilter(s)}>{s}</Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No quotations found" description="Create one to start the sales flow." />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Total</TableHead>
                <TableHead>Issued</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((qt) => {
                const totals = quoteTotals(qt.lines, qt.taxPercent);
                return (
                  <TableRow key={qt.id}>
                    <TableCell><Link to="/quotations/$id" params={{ id: qt.id }} className="font-medium hover:underline">{qt.number}</Link></TableCell>
                    <TableCell>{store.customers.find((c) => c.id === qt.customerId)?.company ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{INR(totals.total)}</TableCell>
                    <TableCell>{fmtDate(qt.issueDate)}</TableCell>
                    <TableCell>{fmtDate(qt.expiryDate)}</TableCell>
                    <TableCell><StatusBadge status={qt.status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate({ to: "/quotations/$id", params: { id: qt.id } })}><Eye className="size-4" /> Open</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { store.setQuotationStatus(qt.id, "sent"); toast.success(`${qt.number} marked as sent`); }}><Send className="size-4" /> Mark sent</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { store.setQuotationStatus(qt.id, "accepted"); toast.success(`${qt.number} accepted`); }}><CheckCircle2 className="size-4" /> Accept</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { store.setQuotationStatus(qt.id, "cancelled"); toast.success(`${qt.number} cancelled`); }}><XCircle className="size-4" /> Cancel</DropdownMenuItem>
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

      {creating && <QuotationDialog quotation={null} onClose={() => setCreating(false)} />}
    </div>
  );
}

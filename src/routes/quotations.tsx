import { createFileRoute, Link, useNavigate, Outlet, useChildMatches } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Plus, Search, Send, CheckCircle2, XCircle, PenTool, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/bits";
import { QuotationDialog } from "./quotations.$id";
import { AcceptQuotationDialog } from "@/components/shared/accept-quotation-dialog";
import { useStore } from "@/lib/store";
import { quoteTotals } from "@/lib/calc";
import { INR, fmtDate, daysBetween, today } from "@/lib/format";
import type { Quotation } from "@/lib/types";

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
  const [signingQuotation, setSigningQuotation] = useState<Quotation | null>(null);

  const isCustomer = store.role === "customer";
  const customerScopeId = isCustomer ? store.demoCustomerId || store.customers[0]?.id : null;

  useEffect(() => {
    if (search.new === "1") {
      setCreating(true);
      navigate({ to: "/quotations" });
    }
  }, [search.new, navigate]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return store.quotations
      .filter((qt) => (customerScopeId ? qt.customerId === customerScopeId : true))
      .filter((qt) => {
        const customer = store.customers.find((c) => c.id === qt.customerId)?.company ?? "";
        if (statusFilter !== "all" && qt.status !== statusFilter) return false;
        return !q || (qt.number + customer).toLowerCase().includes(q);
      });
  }, [store.quotations, store.customers, query, statusFilter, customerScopeId]);

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
        title={isCustomer ? "My Proposals & Quotations" : "Quotations"}
        description={
          isCustomer
            ? "Review and sign proposal agreements prepared for your company."
            : "Proposals built from products and plans. Accepted quotations convert into subscriptions."
        }
        actions={
          !isCustomer ? (
            <>
              <Button size="sm" variant="outline" onClick={autoExpire}>Apply expiry</Button>
              <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4" /> Create quotation</Button>
            </>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search quotation..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {["all", "draft", "sent", "accepted", "expired", "cancelled"].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize text-xs h-8" onClick={() => setStatusFilter(s)}>{s}</Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No quotations found" description={isCustomer ? "No proposals have been shared with your account." : "Create one to start the sales flow."} />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((qt) => {
                const totals = quoteTotals(qt.lines, qt.taxPercent);
                return (
                  <TableRow key={qt.id} className="hover:bg-muted/20">
                    <TableCell>
                      <Link to="/quotations/$id" params={{ id: qt.id }} className="font-medium hover:underline font-mono text-primary">
                        {qt.number}
                      </Link>
                    </TableCell>
                    <TableCell>{store.customers.find((c) => c.id === qt.customerId)?.company ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium font-mono">{INR(totals.total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(qt.issueDate)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(qt.expiryDate)}</TableCell>
                    <TableCell><StatusBadge status={qt.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(qt.status === "sent" || (isCustomer && qt.status === "draft")) && (
                          <Button
                            size="sm"
                            onClick={() => setSigningQuotation(qt)}
                            className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          >
                            <PenTool className="size-3 mr-1" />
                            Sign
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate({ to: "/quotations/$id", params: { id: qt.id } })}>
                              <Eye className="size-4" /> Open
                            </DropdownMenuItem>

                            {!isCustomer && (
                              <>
                                <DropdownMenuItem onClick={() => { store.setQuotationStatus(qt.id, "sent"); toast.success(`${qt.number} marked as sent`); }}>
                                  <Send className="size-4" /> Mark sent
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { store.setQuotationStatus(qt.id, "accepted"); toast.success(`${qt.number} accepted`); }}>
                                  <CheckCircle2 className="size-4" /> Accept
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => { store.setQuotationStatus(qt.id, "cancelled"); toast.success(`${qt.number} cancelled`); }}>
                                  <XCircle className="size-4" /> Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && <QuotationDialog quotation={null} onClose={() => setCreating(false)} />}
      {signingQuotation && <AcceptQuotationDialog quotation={signingQuotation} onClose={() => setSigningQuotation(null)} />}
    </div>
  );
}

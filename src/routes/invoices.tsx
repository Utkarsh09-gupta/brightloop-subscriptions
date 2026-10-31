import { createFileRoute, Link, useNavigate, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Receipt,
  CreditCard,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  MoreHorizontal,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, EmptyState, StatusBadge, StatCard } from "@/components/shared/bits";
import { useStore, paidAmountFor, outstandingFor } from "@/lib/store";
import { INR, fmtDate, isOverdue } from "@/lib/format";
import { PaymentDialog } from "./invoices.$id";
import { CustomerCheckoutDialog } from "@/components/shared/customer-checkout-dialog";
import type { Invoice } from "@/lib/types";

export const Route = createFileRoute("/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }

  const store = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const isCustomer = store.role === "customer";
  const customerScopeId = isCustomer ? store.demoCustomerId || store.customers[0]?.id : null;

  const filteredInvoices = useMemo(() => {
    const q = query.toLowerCase().trim();
    return store.invoices
      .filter((inv) => (customerScopeId ? inv.customerId === customerScopeId : true))
      .filter((inv) => {
        const overdue = isOverdue(inv.status, inv.dueDate);
        if (statusFilter === "all") return true;
        if (statusFilter === "overdue") return overdue;
        return inv.status === statusFilter;
      })
      .filter((inv) => {
        if (!q) return true;
        const cust = store.customers.find((c) => c.id === inv.customerId);
        const text = `${inv.number} ${inv.subscriptionNumber ?? ""} ${cust?.company ?? ""} ${cust?.name ?? ""}`.toLowerCase();
        return text.includes(q);
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [store.invoices, store.customers, query, statusFilter, customerScopeId]);

  // Aggregate stats
  const stats = useMemo(() => {
    const scoped = customerScopeId
      ? store.invoices.filter((i) => i.customerId === customerScopeId)
      : store.invoices;

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;

    scoped.forEach((inv) => {
      if (inv.status !== "cancelled") {
        totalInvoiced += inv.grandTotal;
        const paid = paidAmountFor(inv, store.payments);
        totalPaid += paid;
        totalOutstanding += Math.max(0, inv.grandTotal - paid);
        if (isOverdue(inv.status, inv.dueDate)) {
          overdueCount += 1;
        }
      }
    });

    return { totalInvoiced, totalPaid, totalOutstanding, overdueCount };
  }, [store.invoices, store.payments, customerScopeId]);

  const handleRunBillingCycle = () => {
    const res = store.runBillingCycle();
    if (res.created === 0) {
      toast.info(`Billing cycle checked: All active subscriptions are up-to-date (${res.skipped} skipped).`);
    } else {
      toast.success(`Billing cycle completed: ${res.created} new invoice(s) generated! (${res.skipped} skipped).`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isCustomer ? "My Invoices" : "Invoices"}
        description={
          isCustomer
            ? "View your billing history, tax statements, and receipts"
            : "Manage customer billing, track payments, generate GST invoices, and run recurring cycles"
        }
      >
        {!isCustomer && (
          <Button onClick={handleRunBillingCycle} className="gap-1.5" variant="default">
            <Play className="h-4 w-4" />
            Run Billing Cycle
          </Button>
        )}
      </PageHeader>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoiced" value={INR(stats.totalInvoiced)} hint="Cumulative billed" />
        <StatCard label="Collections" value={INR(stats.totalPaid)} hint="Received to date" tone="positive" />
        <StatCard
          label="Outstanding Balance"
          value={INR(stats.totalOutstanding)}
          hint="Unpaid invoices"
          tone={stats.totalOutstanding > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Overdue Invoices"
          value={stats.overdueCount}
          hint="Action required"
          tone={stats.overdueCount > 0 ? "negative" : "default"}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice #, customer, subscription..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "confirmed", label: "Confirmed" },
            { id: "paid", label: "Paid" },
            { id: "draft", label: "Draft" },
            { id: "overdue", label: "Overdue" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={statusFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(tab.id)}
              className="text-xs h-8"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description={query ? "No invoices match your search query." : "There are no invoices in this filter."}
          action={
            !isCustomer ? (
              <Button onClick={handleRunBillingCycle} variant="outline" className="gap-1.5">
                <Play className="h-4 w-4" /> Run Billing Cycle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => {
                const customer = store.customers.find((c) => c.id === inv.customerId);
                const paid = paidAmountFor(inv, store.payments);
                const balance = outstandingFor(inv, store.payments);
                const overdue = isOverdue(inv.status, inv.dueDate);

                return (
                  <TableRow key={inv.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-medium">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline text-primary flex items-center gap-1">
                        {inv.number}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <Link to={`/customers/${inv.customerId}`} className="hover:underline">
                        <div className="font-medium text-foreground">{customer?.company ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{customer?.name}</div>
                      </Link>
                    </TableCell>

                    <TableCell>
                      {inv.subscriptionId ? (
                        <Link
                          to={`/subscriptions/${inv.subscriptionId}`}
                          className="font-mono text-xs text-muted-foreground hover:underline hover:text-foreground"
                        >
                          {inv.subscriptionNumber ?? "View"}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(inv.issueDate)}
                    </TableCell>

                    <TableCell className="text-xs whitespace-nowrap">
                      <span className={overdue ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        {fmtDate(inv.dueDate)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-mono font-medium">
                      {INR(inv.grandTotal)}
                    </TableCell>

                    <TableCell className="text-right font-mono font-medium">
                      <span className={balance > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                        {INR(balance)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={overdue ? "overdue" : inv.status} />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isCustomer && balance > 0 && inv.status !== "cancelled" && (
                          <Button size="sm" onClick={() => setPayingInvoice(inv)} className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                            Pay Online
                          </Button>
                        )}
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link to={`/invoices/${inv.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Receipt className="h-4 w-4" />
                              View Statement
                            </Link>
                          </DropdownMenuItem>

                          {inv.status === "draft" && !isCustomer && (
                            <DropdownMenuItem
                              onClick={() => {
                                store.confirmInvoice(inv.id);
                                toast.success(`Invoice ${inv.number} confirmed`);
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              Confirm Invoice
                            </DropdownMenuItem>
                          )}

                          {balance > 0 && inv.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => setPayingInvoice(inv)}
                              className="flex items-center gap-2 cursor-pointer text-emerald-600 font-medium"
                            >
                              <CreditCard className="h-4 w-4" />
                              Record Payment
                            </DropdownMenuItem>
                          )}

                          {inv.status !== "cancelled" && inv.status !== "paid" && !isCustomer && (
                            <DropdownMenuItem
                              onClick={() => {
                                store.cancelInvoice(inv.id);
                                toast.info(`Invoice ${inv.number} cancelled`);
                              }}
                              className="flex items-center gap-2 cursor-pointer text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                              Cancel Invoice
                            </DropdownMenuItem>
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

      {payingInvoice && (
        isCustomer ? (
          <CustomerCheckoutDialog invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />
        ) : (
          <PaymentDialog invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />
        )
      )}
    </div>
  );
}

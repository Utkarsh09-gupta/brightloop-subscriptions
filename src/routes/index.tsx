import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BadgeIndianRupee, CalendarClock, Plus, Receipt, Tags, TrendingUp, Users, Wallet,
  CreditCard, FileText, PenTool, ArrowRight, ArrowUpRight, AlertCircle, CheckCircle2, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard, StatusBadge } from "@/components/shared/bits";
import { useStore, outstandingFor, paidAmountFor, subTotalAmount } from "@/lib/store";
import { INR, INR0, daysUntil, fmtDate, frequencyLabel, isOverdue } from "@/lib/format";
import { CustomerCheckoutDialog } from "@/components/shared/customer-checkout-dialog";
import { AcceptQuotationDialog } from "@/components/shared/accept-quotation-dialog";
import type { BillingFrequency, Invoice, Quotation } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function scopeId(store: ReturnType<typeof useStore.getState>) {
  if (store.role !== "customer") return null;
  return store.demoCustomerId || store.customers[0]?.id || null;
}

function Dashboard() {
  const store = useStore();
  const sid = scopeId(store);
  const [range, setRange] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [reviewingQuotation, setReviewingQuotation] = useState<Quotation | null>(null);

  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.company ?? "—";

  const subs = sid ? store.subscriptions.filter((s) => s.customerId === sid) : store.subscriptions;
  const invoices = sid ? store.invoices.filter((i) => i.customerId === sid) : store.invoices;
  const payments = sid ? store.payments.filter((p) => p.customerId === sid) : store.payments;
  const customers = sid ? store.customers.filter((c) => c.id === sid) : store.customers;
  const myCustomer = sid ? store.customers.find((c) => c.id === sid) : null;
  const myQuotations = sid ? store.quotations.filter((q) => q.customerId === sid) : [];

  const activeSubs = subs.filter((s) => s.status === "active");
  const confirmed = invoices.filter((i) => i.status === "confirmed" || i.status === "paid");
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = confirmed.reduce((s, i) => s + outstandingFor(i, store.payments), 0);
  const overdue = confirmed.filter((i) => isOverdue(i.status, i.dueDate));

  const revenue = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const p of payments) {
      const key = range === "daily" ? p.date : range === "monthly" ? p.date.slice(0, 7) : p.date.slice(0, 4);
      bucket.set(key, (bucket.get(key) ?? 0) + p.amount);
    }
    return [...bucket.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([k, v]) => ({ period: k, amount: v }));
  }, [payments, range]);

  const byMethod = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) m.set(p.method, (m.get(p.method) ?? 0) + p.amount);
    const labels: Record<string, string> = { upi: "UPI", bank_transfer: "Bank", cash: "Cash", card: "Card", other: "Other" };
    return [...m.entries()].map(([k, v]) => ({ name: labels[k] ?? k, value: v }));
  }, [payments]);

  const methodColors = ["#2563eb", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b"];

  const upcoming = useMemo(
    () =>
      activeSubs
        .map((s) => ({ sub: s, days: daysUntil(s.endDate) }))
        .filter((x) => x.days <= 45)
        .sort((a, b) => a.days - b.days)
        .slice(0, 5),
    [activeSubs],
  );

  const recentSubscriptions = [...subs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // -------- Customer portal --------
  if (sid) {
    const myInvoices = invoices.filter((i) => i.status !== "draft");
    const myOutstanding = myInvoices.reduce((s, i) => s + outstandingFor(i, store.payments), 0);
    const pendingQuotes = myQuotations.filter((q) => q.status === "sent" || q.status === "draft");
    const unpaidInvoices = myInvoices.filter((i) => i.status !== "cancelled" && outstandingFor(i, store.payments) > 0);

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${myCustomer?.name ?? "Customer"}`}
          description={`Customer portal for ${myCustomer?.company ?? "your business"} · Manage subscriptions, invoices and approvals.`}
        />

        {/* Action Required Banner: Unpaid Invoices or Proposals */}
        {unpaidInvoices.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  You have {unpaidInvoices.length} open invoice{unpaidInvoices.length > 1 ? "s" : ""} totaling {INR(myOutstanding)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Due {fmtDate(unpaidInvoices[0]?.dueDate ?? "")} · Pay via instant UPI, NetBanking or Credit Card.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setPayingInvoice(unpaidInvoices[0] ?? null)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <CreditCard className="h-4 w-4" />
              Pay {INR(outstandingFor(unpaidInvoices[0]!, store.payments))} Now
            </Button>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active subscriptions" value={activeSubs.length} icon={<CalendarClock className="size-4" />} />
          <StatCard label="Invoices this year" value={myInvoices.length} icon={<Receipt className="size-4" />} />
          <StatCard
            label="Outstanding amount"
            value={INR0(myOutstanding)}
            tone={myOutstanding > 0 ? "warning" : "positive"}
            icon={<Wallet className="size-4" />}
          />
          <StatCard
            label="Total paid"
            value={INR0(payments.reduce((s, p) => s + p.amount, 0))}
            tone="positive"
            icon={<BadgeIndianRupee className="size-4" />}
          />
        </div>

        {/* Pending Proposals Section (Quotations waiting for approval) */}
        {pendingQuotes.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Proposals Awaiting Your Signature
                </CardTitle>
                <CardDescription>Review and activate new software and service modules.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-lg border bg-card">
                {pendingQuotes.map((q) => (
                  <div key={q.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{q.number}</span>
                        <StatusBadge status={q.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.lines.length} module(s) · Valid until {fmtDate(q.expiryDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/quotations/${q.id}`}>View Proposal</Link>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setReviewingQuotation(q)}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        Sign & Activate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscriptions & Invoices Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* My Subscriptions */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">My Subscriptions</CardTitle>
              <Button asChild size="sm" variant="outline"><Link to="/subscriptions">View all</Link></Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Subscription</TableHead><TableHead>Status</TableHead><TableHead>Renews</TableHead></TableRow></TableHeader>
                <TableBody>
                  {subs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        No active subscriptions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subs.slice(0, 5).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <Link to={`/subscriptions/${s.id}`} className="hover:underline font-mono text-primary">
                            {s.number}
                          </Link>
                        </TableCell>
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(s.endDate)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Invoices with Pay Button */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <Button asChild size="sm" variant="outline"><Link to="/invoices">View all</Link></Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No statements issued yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myInvoices.slice(0, 5).map((i) => {
                      const balance = outstandingFor(i, store.payments);
                      const overdue = isOverdue(i.status, i.dueDate);

                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">
                            <Link to={`/invoices/${i.id}`} className="hover:underline font-mono text-primary">
                              {i.number}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{INR(i.grandTotal)}</TableCell>
                          <TableCell><StatusBadge status={overdue ? "overdue" : i.status} /></TableCell>
                          <TableCell className="text-right">
                            {balance > 0 && i.status !== "cancelled" ? (
                              <Button
                                size="sm"
                                onClick={() => setPayingInvoice(i)}
                                className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              >
                                Pay Online
                              </Button>
                            ) : (
                              <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                                <Link to={`/invoices/${i.id}`}>View</Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Customer Self-Service Checkout Modal */}
        {payingInvoice && (
          <CustomerCheckoutDialog
            invoice={payingInvoice}
            onClose={() => setPayingInvoice(null)}
          />
        )}

        {/* Customer Sign Quotation Modal */}
        {reviewingQuotation && (
          <AcceptQuotationDialog
            quotation={reviewingQuotation}
            onClose={() => setReviewingQuotation(null)}
          />
        )}
      </div>
    );
  }

  // -------- Admin / Staff dashboard --------
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live view of Brightloop subscriptions, revenue, churn risk and cash flow."
      >
        <Button asChild size="sm" variant="outline"><Link to="/products" search={{ new: "1" }}><Plus className="size-4" /> Add product</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/plans" search={{ new: "1" }}><Plus className="size-4" /> Create plan</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/customers" search={{ new: "1" }}><Plus className="size-4" /> Add customer</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/quotations" search={{ new: "1" }}><Plus className="size-4" /> Create quotation</Link></Button>
        <Button asChild size="sm"><Link to="/invoices">View Invoices</Link></Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total customers" value={customers.length} icon={<Users className="size-4" />} to="/customers" />
        <StatCard label="Active subscriptions" value={activeSubs.length} tone="positive" icon={<CalendarClock className="size-4" />} to="/subscriptions" />
        <StatCard label="Products" value={store.products.filter((p) => !p.archived).length} icon={<Tags className="size-4" />} to="/products" />
        <StatCard label="Plans" value={store.plans.filter((p) => p.active && !p.archived).length} icon={<Tags className="size-4" />} to="/plans" />
        <StatCard label="Revenue received" value={INR0(collected)} tone="positive" icon={<BadgeIndianRupee className="size-4" />} to="/payments" />
        <StatCard label="Outstanding amount" value={INR0(outstanding)} tone={outstanding > 0 ? "warning" : "positive"} hint={overdue.length > 0 ? `${overdue.length} overdue` : undefined} icon={<Wallet className="size-4" />} to="/invoices" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
                <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {revenue.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [INR(v), "Revenue"]} />
                    <Area type="monotone" dataKey="amount" stroke="#2563eb" fillOpacity={1} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments by Method</CardTitle>
          </CardHeader>
          <CardContent>
            {byMethod.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No payments to display.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {byMethod.map((_, idx) => (
                        <Cell key={idx} fill={methodColors[idx % methodColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [INR(v), "Amount"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                  {byMethod.map((m, idx) => (
                    <span key={m.name} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: methodColors[idx % methodColors.length] }} />
                      {m.name}: <span className="font-medium">{INR0(m.value)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Subscriptions</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/subscriptions">All</Link></Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentSubscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium"><Link to={`/subscriptions/${s.id}`} className="hover:underline">{s.number}</Link></TableCell>
                    <TableCell className="truncate max-w-[120px]">{customerName(s.customerId)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/payments">All</Link></Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(p.date)}</TableCell>
                    <TableCell className="truncate max-w-[120px]">{customerName(p.customerId)}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 font-mono">{INR(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Upcoming Renewals</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/subscriptions">All</Link></Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No subscriptions due for renewal within 45 days.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Subscription</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">In</TableHead></TableRow></TableHeader>
                <TableBody>
                  {upcoming.map(({ sub: s, days }) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium"><Link to={`/subscriptions/${s.id}`} className="hover:underline">{s.number}</Link></TableCell>
                      <TableCell className="truncate max-w-[120px]">{customerName(s.customerId)}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">{days < 0 ? "Overdue" : `${days}d`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BadgeIndianRupee, CalendarClock, Plus, Receipt, Tags, TrendingUp, Users, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard, StatusBadge } from "@/components/shared/bits";
import { useStore, outstandingFor, paidAmountFor, subTotalAmount } from "@/lib/store";
import { INR, INR0, daysUntil, fmtDate, frequencyLabel, isOverdue } from "@/lib/format";
import type { BillingFrequency } from "@/lib/types";

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
  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.company ?? "—";

  const subs = sid ? store.subscriptions.filter((s) => s.customerId === sid) : store.subscriptions;
  const invoices = sid ? store.invoices.filter((i) => i.customerId === sid) : store.invoices;
  const payments = sid ? store.payments.filter((p) => p.customerId === sid) : store.payments;
  const customers = sid ? store.customers.filter((c) => c.id === sid) : store.customers;

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

  const recentPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // -------- Customer portal --------
  if (sid) {
    const myInvoices = invoices.filter((i) => i.status !== "draft");
    const myOutstanding = myInvoices.reduce((s, i) => s + outstandingFor(i, store.payments), 0);
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${customers[0]?.name ?? ""}`}
          description="Your Brightloop subscriptions, invoices and payments in one place."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active subscriptions" value={activeSubs.length} icon={<CalendarClock className="size-4" />} />
          <StatCard label="Invoices this year" value={myInvoices.length} icon={<Receipt className="size-4" />} />
          <StatCard label="Outstanding amount" value={INR0(myOutstanding)} tone={myOutstanding > 0 ? "warning" : "positive"} icon={<Wallet className="size-4" />} />
          <StatCard label="Total paid" value={INR0(payments.reduce((s, p) => s + p.amount, 0))} tone="positive" icon={<BadgeIndianRupee className="size-4" />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">My subscriptions</CardTitle>
              <Button asChild size="sm" variant="outline"><Link to="/subscriptions">View all</Link></Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Subscription</TableHead><TableHead>Status</TableHead><TableHead>Renews</TableHead></TableRow></TableHeader>
                <TableBody>
                  {subs.slice(0, 5).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium"><Link to="/subscriptions/$id" params={{ id: s.id }} className="hover:underline">{s.number}</Link></TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>{fmtDate(s.endDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Recent invoices</CardTitle>
              <Button asChild size="sm" variant="outline"><Link to="/invoices">View all</Link></Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {myInvoices.slice(0, 5).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium"><Link to="/invoices/$id" params={{ id: i.id }} className="hover:underline">{i.number}</Link></TableCell>
                      <TableCell>{INR(i.grandTotal)}</TableCell>
                      <TableCell><StatusBadge status={isOverdue(i.status, i.dueDate) ? "overdue" : i.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // -------- Admin / Staff dashboard --------
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Business overview — ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
        actions={
          <>
            <Button asChild size="sm" variant="outline"><Link to="/products?new=1"><Plus className="size-4" /> Add Product</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/plans?new=1"><Plus className="size-4" /> Create Plan</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/customers?new=1"><Plus className="size-4" /> Add Customer</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/quotations?new=1"><Plus className="size-4" /> Create Quotation</Link></Button>
            <Button asChild size="sm"><Link to="/invoices"><Receipt className="size-4" /> View Invoices</Link></Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total customers" value={customers.length} icon={<Users className="size-4" />} to="/customers" />
        <StatCard label="Active subscriptions" value={activeSubs.length} icon={<CalendarClock className="size-4" />} to="/subscriptions" />
        <StatCard label="Products" value={store.products.filter((p) => !p.archived).length} icon={<Tags className="size-4" />} to="/products" />
        <StatCard label="Plans" value={store.plans.filter((p) => !p.archived).length} icon={<Tags className="size-4" />} to="/plans" />
        <StatCard label="Revenue received" value={INR0(collected)} tone="positive" hint={`${payments.length} payments`} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Outstanding" value={INR0(outstanding)} tone="warning" hint={`${overdue.length} overdue invoices`} icon={<Wallet className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Revenue trend</CardTitle>
            <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => INR(v)} />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Payments by method</CardTitle></CardHeader>
          <CardContent className="h-64">
            {byMethod.length === 0 ? (
              <p className="pt-16 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {byMethod.map((_, i) => <Cell key={i} fill={methodColors[i % methodColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => INR(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
              {byMethod.map((m, i) => (
                <span key={m.name} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: methodColors[i % methodColors.length] }} />
                  {m.name} · {INR0(m.value)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent subscriptions</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/subscriptions">View all</Link></Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {subs.slice(0, 5).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium"><Link to="/subscriptions/$id" params={{ id: s.id }} className="hover:underline">{s.number}</Link></TableCell>
                    <TableCell>{customerName(s.customerId)}</TableCell>
                    <TableCell>{INR(subTotalAmount(s) * (1 + s.taxPercent / 100))}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent payments</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/payments">View all</Link></Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Payment</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.number}</TableCell>
                    <TableCell>{customerName(p.customerId)}</TableCell>
                    <TableCell>{INR(p.amount)}</TableCell>
                    <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Upcoming renewals</CardTitle>
          <Button asChild size="sm" variant="ghost"><Link to="/subscriptions">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No renewals in the next 45 days.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Subscription</TableHead><TableHead>Customer</TableHead><TableHead>Plan</TableHead><TableHead>Frequency</TableHead><TableHead>Renews in</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map(({ sub, days }) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium"><Link to="/subscriptions/$id" params={{ id: sub.id }} className="hover:underline">{sub.number}</Link></TableCell>
                    <TableCell>{customerName(sub.customerId)}</TableCell>
                    <TableCell>{sub.lines[0]?.name}</TableCell>
                    <TableCell>{frequencyLabel[(store.plans.find((p) => p.id === sub.lines[0]?.refId)?.frequency ?? "monthly") as BillingFrequency]}</TableCell>
                    <TableCell>{days <= 0 ? "Due now" : `${days} days`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function _paid() {
  return paidAmountFor;
}
void _paid;

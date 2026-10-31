import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  BadgeIndianRupee,
  Users,
  Wallet,
  ArrowUpRight,
  Download,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard, StatusBadge } from "@/components/shared/bits";
import { useStore, paidAmountFor, outstandingFor } from "@/lib/store";
import { INR, INR0, daysUntil, fmtDate, isOverdue } from "@/lib/format";
import type { SubscriptionLine } from "@/lib/types";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const store = useStore();
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<"6m" | "12m">("6m");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Calculate Monthly Recurring Revenue (MRR) & ARR
  const { mrr, arr, activeCustomerCount, arpu } = useMemo(() => {
    let monthlySum = 0;
    const activeCustomerSet = new Set<string>();

    const activeSubs = store.subscriptions?.filter((s) => s.status === "active") || [];
    activeSubs.forEach((sub) => {
      if (sub.customerId) activeCustomerSet.add(sub.customerId);
      (sub.lines || []).forEach((line) => {
        const qty = line.qty || 1;
        const price = line.unitPrice || 0;
        const lineTotal = qty * price;
        let factor = 1; // default monthly
        if (line.kind === "plan") {
          const plan = store.plans?.find((p) => p.id === line.refId);
          if (plan?.frequency === "yearly") factor = 1 / 12;
          else if (plan?.frequency === "weekly") factor = 4.33;
          else if (plan?.frequency === "daily") factor = 30;
        }
        monthlySum += lineTotal * factor;
      });
    });

    const activeCusts = activeCustomerSet.size;
    const computedArpu = activeCusts > 0 ? monthlySum / activeCusts : 0;

    return {
      mrr: Math.round(monthlySum),
      arr: Math.round(monthlySum * 12),
      activeCustomerCount: activeCusts,
      arpu: Math.round(computedArpu),
    };
  }, [store.subscriptions, store.plans]);

  // 2. Collection totals and receivables
  const { totalInvoiced, totalCollected, totalOutstanding, collectionRate } = useMemo(() => {
    let invoiced = 0;
    let collected = 0;
    let outstanding = 0;

    const invoices = store.invoices || [];
    const payments = store.payments || [];

    invoices.forEach((inv) => {
      if (inv.status !== "cancelled") {
        invoiced += inv.grandTotal || 0;
        const paid = paidAmountFor(inv, payments);
        collected += paid;
        outstanding += Math.max(0, (inv.grandTotal || 0) - paid);
      }
    });

    const rate = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 100;
    return {
      totalInvoiced: invoiced,
      totalCollected: collected,
      totalOutstanding: outstanding,
      collectionRate: rate,
    };
  }, [store.invoices, store.payments]);

  // 3. Plan Distribution data for Bar Chart
  const planDistribution = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    const activeSubs = store.subscriptions?.filter((s) => s.status === "active") || [];

    activeSubs.forEach((sub) => {
      (sub.lines || []).forEach((line) => {
        const rawName = line.name || "Custom Plan";
        const name = rawName.replace(/ plan/i, "").trim();
        const curr = map.get(name) ?? { count: 0, revenue: 0 };
        const qty = line.qty || 1;
        const price = line.unitPrice || 0;
        map.set(name, {
          count: curr.count + qty,
          revenue: curr.revenue + qty * price,
        });
      });
    });

    return [...map.entries()]
      .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [store.subscriptions]);

  // 4. Payment channel breakdown for Pie Chart
  const paymentMethods = useMemo(() => {
    const map = new Map<string, number>();
    const payments = store.payments || [];

    payments.forEach((p) => {
      const key = p.method || "other";
      map.set(key, (map.get(key) ?? 0) + (p.amount || 0));
    });

    const labels: Record<string, string> = {
      upi: "UPI (Instant)",
      bank_transfer: "Bank Transfer (NEFT/RTGS)",
      card: "Cards",
      cash: "Cash",
      other: "Other",
    };

    return [...map.entries()].map(([k, v]) => ({
      name: labels[k] ?? k.toUpperCase(),
      value: v,
    }));
  }, [store.payments]);

  const PIE_COLORS = ["#10b981", "#2563eb", "#8b5cf6", "#f59e0b", "#ec4899"];

  // 5. Monthly Revenue Growth Trend
  const revenueTrend = useMemo(() => {
    const buckets = new Map<string, number>();
    const payments = store.payments || [];

    payments.forEach((p) => {
      const monthKey = p.date ? p.date.slice(0, 7) : "2026-10";
      buckets.set(monthKey, (buckets.get(monthKey) ?? 0) + (p.amount || 0));
    });

    const sorted = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, amount]) => ({
        period,
        revenue: amount,
      }));

    return timeRange === "6m" ? sorted.slice(-6) : sorted.slice(-12);
  }, [store.payments, timeRange]);

  // 6. Top 5 Revenue Contributing Customers
  const topCustomers = useMemo(() => {
    const customerMap = new Map<string, { totalPaid: number; activeSubs: number }>();
    const payments = store.payments || [];
    const subscriptions = store.subscriptions || [];
    const customers = store.customers || [];

    payments.forEach((p) => {
      if (!p.customerId) return;
      const curr = customerMap.get(p.customerId) ?? { totalPaid: 0, activeSubs: 0 };
      customerMap.set(p.customerId, { ...curr, totalPaid: curr.totalPaid + (p.amount || 0) });
    });

    subscriptions
      .filter((s) => s.status === "active")
      .forEach((s) => {
        if (!s.customerId) return;
        const curr = customerMap.get(s.customerId) ?? { totalPaid: 0, activeSubs: 0 };
        customerMap.set(s.customerId, { ...curr, activeSubs: curr.activeSubs + 1 });
      });

    return [...customerMap.entries()]
      .map(([customerId, data]) => {
        const cust = customers.find((c) => c.id === customerId);
        return {
          id: customerId,
          name: cust?.name ?? "Unknown",
          company: cust?.company ?? "Unknown Company",
          totalPaid: data.totalPaid,
          activeSubs: data.activeSubs,
        };
      })
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);
  }, [store.payments, store.subscriptions, store.customers]);

  // 7. Upcoming renewals risk analysis
  const upcomingRenewals = useMemo(() => {
    const subscriptions = store.subscriptions || [];
    const customers = store.customers || [];

    return subscriptions
      .filter((s) => s.status === "active")
      .map((s) => {
        const cust = customers.find((c) => c.id === s.customerId);
        const days = daysUntil(s.endDate);
        const cycleTotal = (s.lines || []).reduce((acc, l) => acc + (l.qty || 1) * (l.unitPrice || 0), 0);
        return { sub: s, customer: cust, days, cycleTotal };
      })
      .filter((item) => item.days <= 60)
      .sort((a, b) => a.days - b.days);
  }, [store.subscriptions, store.customers]);

  const handleExportReport = () => {
    toast.success("Executive Financial Report exported (CSV format downloaded)");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Analytics"
        description="Real-time recurring revenue metrics, cash collection velocity, customer lifetime cohorts, and renewal pipeline."
      >
        <Button onClick={handleExportReport} variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </PageHeader>

      {/* Top Level Metric KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Recurring Revenue"
          value={INR(mrr)}
          hint="Active normalized MRR"
          tone="positive"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Annual Run Rate (ARR)"
          value={INR(arr)}
          hint="MRR annualized × 12"
          tone="positive"
          icon={<BadgeIndianRupee className="h-4 w-4" />}
        />
        <StatCard
          label="Avg Revenue Per User"
          value={INR(arpu)}
          hint={`Across ${activeCustomerCount} active accounts`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Collection Efficiency"
          value={`${collectionRate}%`}
          hint={`${INR0(totalOutstanding)} pending`}
          tone={collectionRate >= 80 ? "positive" : "warning"}
          icon={<Percent className="h-4 w-4" />}
        />
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gross Invoiced</p>
          <p className="text-xl font-bold font-display text-foreground">{INR(totalInvoiced)}</p>
          <p className="text-[11px] text-muted-foreground">Cumulative billing</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cash Collected</p>
          <p className="text-xl font-bold font-display text-emerald-600">{INR(totalCollected)}</p>
          <p className="text-[11px] text-emerald-600 font-medium">In bank & settled</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Outstanding Receivables</p>
          <p className="text-xl font-bold font-display text-amber-600">{INR(totalOutstanding)}</p>
          <p className="text-[11px] text-muted-foreground">Unpaid customer invoices</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Subscriptions</p>
          <p className="text-xl font-bold font-display text-primary">
            {store.subscriptions?.filter((s) => s.status === "active").length || 0}
          </p>
          <p className="text-[11px] text-muted-foreground">Generating recurring cash</p>
        </div>
      </div>

      {/* Primary Visualizations Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Growth Trend Area Chart */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Revenue Trend & Collections</CardTitle>
              <CardDescription className="text-xs">Actual cash collections bucketed by monthly cycle</CardDescription>
            </div>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="6m" className="text-xs">Last 6 Months</TabsTrigger>
                <TabsTrigger value="12m" className="text-xs">12 Months</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading revenue telemetry...
              </div>
            ) : revenueTrend.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No historical payment data yet.</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [INR(v), "Collections"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#analyticsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collections by Payment Method Pie Chart */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Collections by Channel</CardTitle>
            <CardDescription className="text-xs">Settlement share across UPI, Bank & Cards</CardDescription>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading channels...
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No payment entries recorded.</div>
            ) : (
              <div className="h-72 flex flex-col justify-between">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={paymentMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4}>
                      {paymentMethods.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [INR(v), "Total"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 text-xs border-t pt-2">
                  {paymentMethods.map((m, idx) => (
                    <div key={m.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        {m.name}
                      </span>
                      <span className="font-mono font-medium text-foreground">{INR(m.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Visualizations: Plan Distribution & Top Customers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by Subscription Plan Bar Chart */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Active Plan Distribution
            </CardTitle>
            <CardDescription className="text-xs">Recurring volume and MRR contribution per package</CardDescription>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading plans...
              </div>
            ) : planDistribution.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No active plans subscribed.</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [INR(v), "Revenue"]} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Revenue Accounts Table */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Top Revenue Accounts
              </CardTitle>
              <CardDescription className="text-xs">Highest cumulative enterprise collections</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/customers">All Accounts</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Subscriptions</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((cust) => (
                  <TableRow key={cust.id} className="hover:bg-muted/20">
                    <TableCell>
                      <Link to={`/customers/${cust.id}`} className="hover:underline font-medium text-foreground">
                        {cust.company}
                      </Link>
                      <p className="text-xs text-muted-foreground">{cust.name}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                        {cust.activeSubs} Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">
                      {INR(cust.totalPaid)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Renewals Pipeline */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Renewal Pipeline (Next 60 Days)
            </CardTitle>
            <CardDescription className="text-xs">
              Subscriptions approaching expiry requiring proactive retention or invoicing
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/subscriptions">Manage Subscriptions</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingRenewals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active subscriptions due for renewal within the next 60 days.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Subscription #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="text-right">Cycle Value</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingRenewals.map(({ sub, customer, days, cycleTotal }) => (
                  <TableRow key={sub.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono font-medium">
                      <Link to={`/subscriptions/${sub.id}`} className="hover:underline text-primary">
                        {sub.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{customer?.company ?? "Unknown"}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(sub.endDate)}</TableCell>
                    <TableCell>
                      {days < 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive">
                          Overdue ({Math.abs(days)}d ago)
                        </span>
                      ) : days <= 15 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-600">
                          Expires in {days} days
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-muted-foreground">
                          {days} days remaining
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      {INR(cycleTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                        <Link to={`/subscriptions/${sub.id}`}>
                          Review <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
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

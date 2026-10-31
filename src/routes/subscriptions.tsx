import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pause, Play, Plus, RefreshCw, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/bits";
import { SubscriptionDialog } from "./subscriptions.$id";
import { useStore } from "@/lib/store";
import { INR, daysUntil, fmtDate, isOverdue } from "@/lib/format";

export const Route = createFileRoute("/subscriptions")({
  validateSearch: (s: { new?: string }) => ({ new: s.new === "1" ? "1" : undefined }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const store = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (search.new === "1") {
      setCreating(true);
      navigate({ to: "/subscriptions" });
    }
  }, [search.new, navigate]);

  const sid = store.role === "customer" ? store.demoCustomerId || store.customers[0]?.id : null;
  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return store.subscriptions
      .filter((s) => (sid ? s.customerId === sid : true))
      .filter((s) => (statusFilter === "all" ? true : s.status === statusFilter || (statusFilter === "overdue" && s.status === "active" && daysUntil(s.endDate) < 0)))
      .filter((s) => {
        const c = store.customers.find((x) => x.id === s.customerId)?.company ?? "";
        return !q || (s.number + c).toLowerCase().includes(q);
      });
  }, [store.subscriptions, store.customers, query, statusFilter, sid]);

  const act = (fn: () => void, msg: string) => {
    fn();
    toast.success(msg);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={sid ? "My subscriptions" : "Subscriptions"}
        description={sid ? "Your active and past subscriptions with Brightloop." : "Draft → Quotation → Confirmed → Active → Closed lifecycle with pause, resume, renew and close."}
        actions={!sid ? <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4" /> New subscription</Button> : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search subscriptions…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {["all", "draft", "active", "paused", "closed"].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="capitalize" onClick={() => setStatusFilter(s)}>{s}</Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No subscriptions found" />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Plan</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead><TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const total = s.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0) * (1 + s.taxPercent / 100);
                const expiring = s.status === "active" && daysUntil(s.endDate) <= 30;
                return (
                  <TableRow key={s.id}>
                    <TableCell><Link to="/subscriptions/$id" params={{ id: s.id }} className="font-medium hover:underline">{s.number}</Link></TableCell>
                    <TableCell>{store.customers.find((c) => c.id === s.customerId)?.company ?? "—"}</TableCell>
                    <TableCell>{s.lines[0]?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{INR(total)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>
                      {fmtDate(s.endDate)}
                      {expiring && <span className="ml-2 text-xs text-warning">{isOverdue("confirmed", s.endDate) ? "expired" : `in ${daysUntil(s.endDate)}d`}</span>}
                    </TableCell>
                    <TableCell>
                      {!sid && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate({ to: "/subscriptions/$id", params: { id: s.id } })}>Open</DropdownMenuItem>
                            {s.status === "active" && (
                              <DropdownMenuItem onClick={() => act(() => store.setSubscriptionStatus(s.id, "paused"), "Subscription paused")}><Pause className="size-4" /> Pause</DropdownMenuItem>
                            )}
                            {s.status === "paused" && (
                              <DropdownMenuItem onClick={() => act(() => store.setSubscriptionStatus(s.id, "active"), "Subscription resumed")}><Play className="size-4" /> Resume</DropdownMenuItem>
                            )}
                            {(s.status === "active" || s.status === "paused") && (
                              <DropdownMenuItem onClick={() => act(() => store.renewSubscription(s.id), "Subscription renewed for 12 months")}><RefreshCw className="size-4" /> Renew</DropdownMenuItem>
                            )}
                            {s.status !== "closed" && (
                              <DropdownMenuItem className="text-destructive" onClick={() => act(() => store.setSubscriptionStatus(s.id, "closed"), "Subscription closed")}><XCircle className="size-4" /> Close</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && <SubscriptionDialog subscription={null} onClose={() => setCreating(false)} />}
    </div>
  );
}

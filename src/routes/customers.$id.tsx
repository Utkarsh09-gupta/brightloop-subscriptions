import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatCard, StatusBadge } from "@/components/shared/bits";
import { CustomerDialog } from "./customers";
import { useStore, outstandingFor } from "@/lib/store";
import { INR, INR0, fmtDate, isOverdue } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const customer = store.customers.find((c) => c.id === id);

  const subs = useMemo(() => store.subscriptions.filter((s) => s.customerId === id), [store.subscriptions, id]);
  const invoices = useMemo(() => store.invoices.filter((i) => i.customerId === id), [store.invoices, id]);
  const payments = useMemo(() => store.payments.filter((p) => p.customerId === id), [store.payments, id]);

  if (!customer) {
    return <p className="text-sm text-muted-foreground">Customer not found.</p>;
  }

  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled").reduce((s, i) => s + outstandingFor(i, store.payments), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/customers" className="text-sm text-muted-foreground hover:underline">← Customers</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{customer.company}</h1>
          <p className="text-sm text-muted-foreground">{customer.name} · {customer.email} · {customer.phone}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit profile</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subscriptions" value={subs.length} />
        <StatCard label="Invoices" value={invoices.length} />
        <StatCard label="Outstanding" value={INR0(outstanding)} tone={outstanding > 0 ? "warning" : "positive"} />
        <StatCard label="Collected" value={INR0(collected)} tone="positive" />
      </div>

      <Card>
        <CardContent className="grid gap-6 pt-6 text-sm sm:grid-cols-3">
          <div><p className="text-muted-foreground">Billing address</p><p className="mt-1 whitespace-pre-line">{customer.billingAddress || "—"}</p></div>
          <div><p className="text-muted-foreground">Tax ID (GSTIN)</p><p className="mt-1">{customer.taxId || "—"}</p></div>
          <div><p className="text-muted-foreground">Registered</p><p className="mt-1">{fmtDate(customer.createdAt)}</p></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Period</TableHead></TableRow></TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><Link to="/subscriptions/$id" params={{ id: s.id }} className="font-medium hover:underline">{s.number}</Link></TableCell>
                  <TableCell>{s.lines[0]?.name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell>{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</TableCell>
                </TableRow>
              ))}
              {subs.length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No subscriptions yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="invoices">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell><Link to="/invoices/$id" params={{ id: i.id }} className="font-medium hover:underline">{i.number}</Link></TableCell>
                  <TableCell>{fmtDate(i.issueDate)}</TableCell>
                  <TableCell className="text-right">{INR(i.grandTotal)}</TableCell>
                  <TableCell className="text-right">{INR(payments.filter((p) => p.invoiceId === i.id).reduce((s, p) => s + p.amount, 0))}</TableCell>
                  <TableCell><StatusBadge status={isOverdue(i.status, i.dueDate) ? "overdue" : i.status} /></TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No invoices yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="payments">
          <Table>
            <TableHeader><TableRow><TableHead>Payment</TableHead><TableHead>Method</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.number}</TableCell>
                  <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                  <TableCell>{fmtDate(p.date)}</TableCell>
                  <TableCell className="text-right">{INR(p.amount)}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No payments yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {editing && (
        <CustomerDialog
          customer={customer}
          isNew={false}
          onClose={() => setEditing(false)}
          onSave={(c) => { store.upsertCustomer(c); toast.success("Customer updated"); setEditing(false); }}
        />
      )}
    </div>
  );
}

void CardHeader; void CardTitle;

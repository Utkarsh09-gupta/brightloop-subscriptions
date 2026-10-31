import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppNotification, Customer, Discount, DiscountUsage, Invoice, InvoiceLine, Payment, Plan,
  Product, Quotation, QuotationTemplate, Role, Subscription, SubscriptionLine, SubscriptionStatus,
  TaxRule,
} from "./types";
import { buildSeed, type DemoDatabase } from "./seed";
import { addDays, addMonths, frequencyDays, today, uid } from "./format";
import { evaluateDiscount, invoiceTotals, taxPercentFor } from "./calc";

interface AppState extends DemoDatabase {
  role: Role;
  demoCustomerId: string; // which customer the "customer" role views the portal as
  setRole: (r: Role) => void;
  setDemoCustomerId: (id: string) => void;

  // products
  upsertProduct: (p: Product) => void;
  archiveProduct: (id: string, archived: boolean) => void;
  deleteProduct: (id: string) => void;

  // plans
  upsertPlan: (p: Plan) => void;
  setPlanActive: (id: string, active: boolean) => void;
  archivePlan: (id: string, archived: boolean) => void;
  deletePlan: (id: string) => void;

  // customers
  upsertCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;

  // taxes
  upsertTax: (t: TaxRule) => void;
  deleteTax: (id: string) => void;

  // discounts
  upsertDiscount: (d: Discount) => void;
  deleteDiscount: (id: string) => void;

  // templates
  upsertTemplate: (t: QuotationTemplate) => void;
  deleteTemplate: (id: string) => void;

  // quotations
  upsertQuotation: (q: Quotation) => void;
  setQuotationStatus: (id: string, status: Quotation["status"]) => void;
  deleteQuotation: (id: string) => void;
  convertQuotation: (id: string) => string | null;

  // subscriptions
  upsertSubscription: (s: Subscription) => void;
  setSubscriptionStatus: (id: string, status: SubscriptionStatus, note?: string) => void;
  renewSubscription: (id: string) => void;
  deleteSubscription: (id: string) => void;

  // invoices
  createInvoiceForPeriod: (sub: Subscription, periodStart: string) => Invoice | null;
  confirmInvoice: (id: string) => void;
  cancelInvoice: (id: string) => void;
  updateInvoice: (inv: Invoice) => void;
  runBillingCycle: () => { created: number; skipped: number };

  // payments
  addPayment: (p: Payment) => void;

  // notifications
  markNotificationsRead: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "at" | "read">) => void;

  resetDemoData: () => void;
}

export type { AppState };

const pad = (n: number, w = 4) => n.toString().padStart(w, "0");

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      role: "admin",
      demoCustomerId: "",

      setRole: (role) => set({ role }),
      setDemoCustomerId: (demoCustomerId) => set({ demoCustomerId }),

      upsertProduct: (p) =>
        set((s) => ({
          products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [{ ...p }, ...s.products],
        })),
      archiveProduct: (id, archived) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, archived } : p)) })),
      deleteProduct: (id) =>
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
          plans: s.plans.map((pl) => (pl.productId === id ? { ...pl, archived: true } : pl)),
        })),

      upsertPlan: (p) =>
        set((s) => ({
          plans: s.plans.some((x) => x.id === p.id) ? s.plans.map((x) => (x.id === p.id ? p : x)) : [{ ...p }, ...s.plans],
        })),
      setPlanActive: (id, active) => set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, active } : p)) })),
      archivePlan: (id, archived) => set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, archived } : p)) })),
      deletePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

      upsertCustomer: (c) =>
        set((s) => ({
          customers: s.customers.some((x) => x.id === c.id) ? s.customers.map((x) => (x.id === c.id ? c : x)) : [{ ...c }, ...s.customers],
        })),
      deleteCustomer: (id) => set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),

      upsertTax: (t) =>
        set((s) => ({
          taxRules: s.taxRules.some((x) => x.id === t.id) ? s.taxRules.map((x) => (x.id === t.id ? t : x)) : [...s.taxRules, t],
        })),
      deleteTax: (id) => set((s) => ({ taxRules: s.taxRules.filter((t) => t.id !== id) })),

      upsertDiscount: (d) =>
        set((s) => ({
          discounts: s.discounts.some((x) => x.id === d.id) ? s.discounts.map((x) => (x.id === d.id ? d : x)) : [...s.discounts, d],
        })),
      deleteDiscount: (id) => set((s) => ({ discounts: s.discounts.filter((d) => d.id !== id) })),

      upsertTemplate: (t) =>
        set((s) => ({
          quotationTemplates: s.quotationTemplates.some((x) => x.id === t.id) ? s.quotationTemplates.map((x) => (x.id === t.id ? t : x)) : [...s.quotationTemplates, t],
        })),
      deleteTemplate: (id) => set((s) => ({ quotationTemplates: s.quotationTemplates.filter((t) => t.id !== id) })),

      upsertQuotation: (q) =>
        set((s) => ({
          quotations: s.quotations.some((x) => x.id === q.id) ? s.quotations.map((x) => (x.id === q.id ? q : x)) : [{ ...q }, ...s.quotations],
        })),
      setQuotationStatus: (id, status) => set((s) => ({ quotations: s.quotations.map((q) => (q.id === id ? { ...q, status } : q)) })),
      deleteQuotation: (id) => set((s) => ({ quotations: s.quotations.filter((q) => q.id !== id) })),

      convertQuotation: (id) => {
        const s = get();
        const q = s.quotations.find((x) => x.id === id);
        if (!q || q.status !== "accepted") return null;
        const num = `SB-${pad(s.counters.subscription + 1)}`;
        const sub: Subscription = {
          id: uid(),
          number: num,
          customerId: q.customerId,
          quotationId: q.id,
          startDate: today(),
          endDate: addMonths(today(), 12),
          status: "draft",
          paymentTerms: "Net 15",
          lines: q.lines.map((l): SubscriptionLine => ({ id: uid(), kind: l.kind, refId: l.refId, name: l.name, qty: l.qty, unitPrice: l.unitPrice })),
          taxPercent: q.taxPercent,
          discountId: null,
          billingCycleCount: 0,
          history: [{ id: uid(), event: `Created from quotation ${q.number}`, at: today(), note: "" }],
          createdAt: today(),
        };
        set((st) => ({
          subscriptions: [sub, ...st.subscriptions],
          counters: { ...st.counters, subscription: st.counters.subscription + 1 },
          quotations: st.quotations.map((x) => (x.id === id ? { ...x, status: "accepted" as const } : x)),
        }));
        return sub.id;
      },

      upsertSubscription: (sub) =>
        set((s) => ({
          subscriptions: s.subscriptions.some((x) => x.id === sub.id) ? s.subscriptions.map((x) => (x.id === sub.id ? sub : x)) : [{ ...sub }, ...s.subscriptions],
        })),
      setSubscriptionStatus: (id, status, note = "") =>
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== id) return sub;
            const ev = { id: uid(), event: status.charAt(0).toUpperCase() + status.slice(1), at: today(), note };
            return { ...sub, status, history: [...sub.history, ev] };
          }),
        })),
      renewSubscription: (id) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) => {
            if (sub.id !== id) return sub;
            const newEnd = addMonths(sub.endDate, 12);
            return {
              ...sub,
              endDate: newEnd,
              billingCycleCount: 0,
              status: "active",
              history: [...sub.history, { id: uid(), event: "Renewed", at: today(), note: `New expiry ${newEnd}` }],
            };
          }),
        })),
      deleteSubscription: (id) => set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) })),

      createInvoiceForPeriod: (sub, periodStart) => {
        const s = get();
        const periodKey = sub.lines[0]?.kind === "plan" ? periodStart.slice(0, 7) : periodStart;
        const dup = s.invoices.some(
          (i) => i.subscriptionId === sub.id && i.billingPeriod === periodKey && i.status !== "cancelled",
        );
        if (dup) return null;

        const plan = sub.lines[0] ? s.plans.find((p) => p.id === (sub.lines[0] as SubscriptionLine).refId) : undefined;
        const freq = plan?.frequency ?? "monthly";
        let discountAmountTotal = 0;
        let discountId: string | null = null;
        if (sub.discountId) {
          const d = s.discounts.find((x) => x.id === sub.discountId);
          const lineItems = sub.lines.map((l) => ({ productId: l.refId, qty: l.qty, unitPrice: l.unitPrice }));
          const subtotal = sub.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
          const ev = evaluateDiscount(d, lineItems, subtotal);
          if (ev.eligible) {
            discountAmountTotal = ev.amount;
            discountId = d!.id;
          }
        }
        const perLine = sub.lines.length ? discountAmountTotal / sub.lines.length : 0;
        const lines: InvoiceLine[] = sub.lines.map((l) => ({
          id: uid(),
          description: `${l.name} — ${freq} billing${plan ? ` (${periodKey})` : ""}`,
          qty: l.qty,
          unitPrice: l.unitPrice,
          taxPercent: sub.taxPercent,
          discountAmount: Math.round(perLine * 100) / 100,
        }));
        const totals = invoiceTotals(lines);
        const invoice: Invoice = {
          id: uid(),
          number: `INV-${pad(s.counters.invoice + 1)}`,
          customerId: sub.customerId,
          subscriptionId: sub.id,
          subscriptionNumber: sub.number,
          lines,
          issueDate: today(),
          dueDate: addDays(today(), 15),
          status: "confirmed",
          billingPeriod: periodKey,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          notes: discountId ? "Discount applied per subscription terms." : "",
          createdAt: today(),
        };
        const usages: DiscountUsage[] = discountId
          ? [{ id: uid(), discountId, invoiceId: invoice.id, amount: discountAmountTotal, usedAt: today() }]
          : [];
        set((st) => ({
          invoices: [invoice, ...st.invoices],
          counters: { ...st.counters, invoice: st.counters.invoice + 1 },
          subscriptions: st.subscriptions.map((x) => (x.id === sub.id ? { ...x, billingCycleCount: x.billingCycleCount + 1 } : x)),
          discounts: st.discounts.map((d) => (d.id === discountId ? { ...d, usedCount: d.usedCount + 1 } : d)),
          discountUsages: [...(st.discountUsages ?? []), ...usages],
        }));
        return invoice;
      },

      confirmInvoice: (id) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, status: "confirmed" } : i)) })),
      cancelInvoice: (id) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, status: "cancelled" } : i)) })),
      updateInvoice: (inv) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === inv.id ? inv : i)) })),

      runBillingCycle: () => {
        const s = get();
        let created = 0;
        let skipped = 0;
        s.subscriptions
          .filter((sub) => sub.status === "active" && sub.lines.length > 0)
          .forEach((sub) => {
            const plan = s.plans.find((p) => p.id === (sub.lines[0] as SubscriptionLine).refId);
            const freq = plan?.frequency ?? "monthly";
            const cadence = frequencyDays[freq];
            const startMs = new Date(sub.startDate + "T00:00:00").getTime();
            const elapsed = Math.floor((Date.now() - startMs) / 86400000);
            const expected = Math.max(0, Math.floor(elapsed / cadence));
            let n = sub.billingCycleCount;
            while (n < expected) {
              const periodStart = addDays(sub.startDate, n * cadence);
              const inv = get().createInvoiceForPeriod(sub, periodStart);
              if (inv) created += 1;
              else skipped += 1;
              n += 1;
              if (created + skipped > 60) break; // safety cap for demo data
            }
            if (n !== sub.billingCycleCount) {
              set((st) => ({ subscriptions: st.subscriptions.map((x) => (x.id === sub.id ? { ...x, billingCycleCount: n } : x)) }));
            }
          });
        return { created, skipped };
      },

      addPayment: (p) =>
        set((s) => {
          const invoices = s.invoices.map((i) => {
            if (i.id !== p.invoiceId) return i;
            const paid = s.payments.filter((x) => x.invoiceId === i.id && x.id !== p.id).reduce((sum, x) => sum + x.amount, 0) + p.amount;
            if (paid >= i.grandTotal - 0.01) return { ...i, status: "paid" as const };
            return i;
          });
          return {
            payments: [p, ...s.payments],
            invoices,
            counters: { ...s.counters, payment: s.counters.payment + 1 },
          };
        }),

      markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      pushNotification: (n) =>
        set((s) => ({
          notifications: [{ ...n, id: uid(), at: today(), read: false }, ...s.notifications],
        })),

      resetDemoData: () => set({ ...buildSeed(), role: get().role, demoCustomerId: get().demoCustomerId }),
    }),
    {
      name: "brightloop-db",
      version: 1,
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        // If persisted data predates a schema change, fall back to fresh seed for collections.
        if (!p || !p.products || !p.invoices) return current;
        return { ...current, ...p };
      },
    },
  ),
);

/* ------- selectors / helpers ------- */

export const paidAmountFor = (invoice: Invoice, payments: Payment[]) =>
  payments.filter((p) => p.invoiceId === invoice.id).reduce((s, p) => s + p.amount, 0);

export const outstandingFor = (invoice: Invoice, payments: Payment[]) =>
  Math.max(0, invoice.grandTotal - paidAmountFor(invoice, payments));

export const subTotalAmount = (sub: { lines: { qty: number; unitPrice: number }[] }) =>
  sub.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

export function subTaxPercent(store: { taxRules: TaxRule[] }, sub: Subscription, lines: SubscriptionLine[]) {
  return sub.taxPercent ?? (lines[0] ? taxPercentFor(store.taxRules, lines[0].refId) : 0);
}

import { addDays, today, uid } from "./format";
import type {
  AppNotification,
  Customer,
  Discount,
  DiscountUsage,
  Invoice,
  Payment,
  Plan,
  Product,
  Quotation,
  QuotationTemplate,
  Subscription,
  TaxRule,
} from "./types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));
const daysAhead = (n: number) => iso(new Date(Date.now() + n * 86400000));

export interface DemoDatabase {
  products: Product[];
  plans: Plan[];
  customers: Customer[];
  taxRules: TaxRule[];
  discounts: Discount[];
  discountUsages: DiscountUsage[];
  quotationTemplates: QuotationTemplate[];
  quotations: Quotation[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
  notifications: AppNotification[];
  counters: { quotation: number; subscription: number; invoice: number; payment: number };
}

export function buildSeed(): DemoDatabase {
  const p = (name: string, type: Product["type"], sales: number, cost: number, notes: string, variants: Product["variants"] = []): Product => ({
    id: uid(),
    name,
    type,
    salesPrice: sales,
    costPrice: cost,
    notes,
    variants,
    variantId: variants[0]?.id ?? null,
    archived: false,
    createdAt: daysAgo(120),
  });

  const stdBrand = { id: uid(), name: "Standard Brand", priceDelta: 0 };
  const odooBrand = { id: uid(), name: "Odoo Brand", priceDelta: 560 };
  const premiumBrand = { id: uid(), name: "Premium Brand", priceDelta: 1200 };

  const products: Product[] = [
    p("Brightloop CRM", "subscription", 2000, 600, "Core customer relationship module.", [stdBrand, odooBrand, premiumBrand]),
    p("Brightloop Helpdesk", "subscription", 1500, 450, "Ticketing and support desk module.", [stdBrand, odooBrand]),
    p("Brightloop Inventory", "subscription", 1800, 520, "Warehouse and stock management.", [stdBrand, odooBrand]),
    p("Brightloop Payroll", "license", 3500, 1100, "Per-company payroll licence, billed yearly.", [stdBrand, premiumBrand]),
    p("Onboarding & Data Migration", "service", 12000, 4000, "One-time professional service."),
    p("Priority Support Add-on", "addon", 900, 200, "4-hour response SLA, per subscription."),
  ];

  const customers: Customer[] = [
    { id: uid(), name: "Meera Nair", email: "meera@sunriseorganics.in", phone: "+91 98450 11223", company: "Sunrise Organics Pvt Ltd", billingAddress: "14, MG Road, Bengaluru, Karnataka 560001", taxId: "29ABCDE1234F1Z5", createdAt: daysAgo(180) },
    { id: uid(), name: "Ravi Teja", email: "ravi@tejalogistics.com", phone: "+91 99890 44556", company: "Teja Logistics LLP", billingAddress: "Plot 22, Phase 2, Hitec City, Hyderabad 500081", taxId: "36PQRSX5678K1Z2", createdAt: daysAgo(150) },
    { id: uid(), name: "Anita Sharma", email: "anita@bluestonefabrics.in", phone: "+91 98201 77889", company: "Bluestone Fabrics", billingAddress: "301, Textile Market, Surat, Gujarat 395002", taxId: "24LMNOP9012Q1Z9", createdAt: daysAgo(96) },
    { id: uid(), name: "Karthik Iyer", email: "karthik@finpeakadvisors.in", phone: "+91 99001 33445", company: "FinPeak Advisors", billingAddress: "7th Floor, Prestige Tower, Chennai 600002", taxId: "33TUVWX3456R1Z7", createdAt: daysAgo(64) },
    { id: uid(), name: "Priya Deshmukh", email: "priya@greenleafagro.com", phone: "+91 97650 22110", company: "GreenLeaf Agro", billingAddress: "Baner Road, Pune, Maharashtra 411045", taxId: "27AACCG7890H1Z4", createdAt: daysAgo(30) },
  ];

  const taxRules: TaxRule[] = [
    { id: uid(), name: "GST 18% (Software services)", percent: 18, productIds: [], active: true },
    { id: uid(), name: "GST 12% (Branded goods)", percent: 12, productIds: [products[3].id], active: false },
  ];

  const discounts: Discount[] = [
    { id: uid(), name: "Annual festive offer", type: "percent", value: 10, minPurchase: 10000, minQuantity: 0, startDate: daysAgo(20), endDate: daysAhead(40), maxUses: 50, usedCount: 3, productIds: [], active: true },
    { id: uid(), name: "Bulk seats − ₹2,000", type: "fixed", value: 2000, minPurchase: 0, minQuantity: 5, startDate: daysAgo(60), endDate: daysAhead(90), maxUses: 20, usedCount: 1, productIds: [], active: true },
    { id: uid(), name: "Legacy 2025 promo", type: "percent", value: 15, minPurchase: 0, minQuantity: 0, startDate: "2025-01-01", endDate: "2025-12-31", maxUses: 100, usedCount: 100, productIds: [], active: true },
  ];

  const templates: QuotationTemplate[] = [
    { id: uid(), name: "Standard SaaS quote", intro: "Thank you for evaluating Brightloop Software. Below is our proposal for your subscription requirements.", terms: "Payment due within 15 days of invoice. Prices exclusive of GST. License per company." },
    { id: uid(), name: "Enterprise rollout", intro: "Proposal for enterprise deployment including onboarding, migration and priority support.", terms: "50% advance on acceptance. Balance on go-live. Includes 90 days of hypercare support." },
  ];

  const plans: Plan[] = [
    { id: uid(), name: "CRM Essentials — Monthly", productId: products[0].id, price: 2000, frequency: "monthly", minQuantity: 1, availableFrom: daysAgo(120), availableTo: daysAhead(240), autoClose: false, allowEarlyClose: true, allowPause: true, allowRenewal: true, active: true, archived: false, createdAt: daysAgo(120) },
    { id: uid(), name: "CRM Essentials — Yearly", productId: products[0].id, price: 20000, frequency: "yearly", minQuantity: 1, availableFrom: daysAgo(120), availableTo: daysAhead(240), autoClose: true, allowEarlyClose: true, allowPause: true, allowRenewal: true, active: true, archived: false, createdAt: daysAgo(120) },
    { id: uid(), name: "Helpdesk Team — Monthly", productId: products[1].id, price: 1500, frequency: "monthly", minQuantity: 3, availableFrom: daysAgo(120), availableTo: daysAhead(300), autoClose: false, allowEarlyClose: false, allowPause: true, allowRenewal: true, active: true, archived: false, createdAt: daysAgo(110) },
    { id: uid(), name: "Inventory Pro — Monthly", productId: products[2].id, price: 1800, frequency: "monthly", minQuantity: 1, availableFrom: daysAgo(90), availableTo: daysAhead(180), autoClose: false, allowEarlyClose: true, allowPause: false, allowRenewal: true, active: true, archived: false, createdAt: daysAgo(90) },
    { id: uid(), name: "Payroll Licence — Yearly", productId: products[3].id, price: 35000, frequency: "yearly", minQuantity: 1, availableFrom: daysAgo(200), availableTo: daysAhead(120), autoClose: true, allowEarlyClose: false, allowPause: false, allowRenewal: true, active: true, archived: false, createdAt: daysAgo(200) },
  ];

  const mk = (n: number) => n.toString().padStart(4, "0");
  const quotations: Quotation[] = [
    { id: uid(), number: `QT-${mk(1)}`, customerId: customers[0].id, templateId: templates[0].id, lines: [{ id: uid(), kind: "plan", refId: plans[0].id, name: plans[0].name, qty: 5, unitPrice: 2000 }], validityDays: 30, issueDate: daysAgo(40), expiryDate: daysAgo(10), status: "accepted", notes: "", taxPercent: 18, createdAt: daysAgo(40) },
    { id: uid(), number: `QT-${mk(2)}`, customerId: customers[1].id, templateId: templates[1].id, lines: [{ id: uid(), kind: "plan", refId: plans[2].id, name: plans[2].name, qty: 8, unitPrice: 1500 }, { id: uid(), kind: "product", refId: products[4].id, name: products[4].name, qty: 1, unitPrice: 12000 }], validityDays: 21, issueDate: daysAgo(18), expiryDate: daysAhead(3), status: "sent", notes: "Migration of legacy tickets included.", taxPercent: 18, createdAt: daysAgo(18) },
    { id: uid(), number: `QT-${mk(3)}`, customerId: customers[2].id, templateId: templates[0].id, lines: [{ id: uid(), kind: "plan", refId: plans[3].id, name: plans[3].name, qty: 2, unitPrice: 1800 }], validityDays: 14, issueDate: daysAgo(25), expiryDate: daysAgo(11), status: "expired", notes: "", taxPercent: 18, createdAt: daysAgo(25) },
    { id: uid(), number: `QT-${mk(4)}`, customerId: customers[3].id, templateId: templates[1].id, lines: [{ id: uid(), kind: "plan", refId: plans[4].id, name: plans[4].name, qty: 1, unitPrice: 35000 }], validityDays: 30, issueDate: daysAgo(6), expiryDate: daysAhead(24), status: "draft", notes: "", taxPercent: 18, createdAt: daysAgo(6) },
  ];

  const subscriptions: Subscription[] = [
    { id: uid(), number: `SB-${mk(1)}`, customerId: customers[0].id, quotationId: quotations[0].id, startDate: daysAgo(38), endDate: daysAhead(327), status: "active", paymentTerms: "Net 15", lines: [{ id: uid(), kind: "plan", refId: plans[0].id, name: "Brightloop CRM — Monthly seats", qty: 5, unitPrice: 2000 }], taxPercent: 18, discountId: null, billingCycleCount: 2, history: [{ id: uid(), event: "Created from quotation QT-0001", at: daysAgo(38), note: "Quotation accepted" }, { id: uid(), event: "Confirmed", at: daysAgo(38), note: "" }, { id: uid(), event: "Activated", at: daysAgo(38), note: "" }], createdAt: daysAgo(38) },
    { id: uid(), number: `SB-${mk(2)}`, customerId: customers[1].id, quotationId: null, startDate: daysAgo(75), endDate: daysAhead(290), status: "active", paymentTerms: "Net 15", lines: [{ id: uid(), kind: "plan", refId: plans[2].id, name: "Helpdesk Team — Monthly", qty: 8, unitPrice: 1500 }], taxPercent: 18, discountId: discounts[1].id, billingCycleCount: 3, history: [{ id: uid(), event: "Created", at: daysAgo(75), note: "Direct subscription" }, { id: uid(), event: "Activated", at: daysAgo(75), note: "" }], createdAt: daysAgo(75) },
    { id: uid(), number: `SB-${mk(3)}`, customerId: customers[2].id, quotationId: null, startDate: daysAgo(20), endDate: daysAhead(345), status: "active", paymentTerms: "Net 15", lines: [{ id: uid(), kind: "plan", refId: plans[3].id, name: "Inventory Pro — Monthly", qty: 2, unitPrice: 1800 }], taxPercent: 18, discountId: null, billingCycleCount: 1, history: [{ id: uid(), event: "Created", at: daysAgo(20), note: "" }, { id: uid(), event: "Activated", at: daysAgo(20), note: "" }], createdAt: daysAgo(20) },
    { id: uid(), number: `SB-${mk(4)}`, customerId: customers[3].id, quotationId: null, startDate: daysAgo(4), endDate: daysAhead(26), status: "draft", paymentTerms: "Net 15", lines: [{ id: uid(), kind: "plan", refId: plans[4].id, name: "Payroll Licence — Yearly", qty: 1, unitPrice: 35000 }], taxPercent: 18, discountId: null, billingCycleCount: 0, history: [{ id: uid(), event: "Created", at: daysAgo(4), note: "" }], createdAt: daysAgo(4) },
    { id: uid(), number: `SB-${mk(5)}`, customerId: customers[4].id, quotationId: null, startDate: daysAgo(60), endDate: daysAhead(305), status: "paused", paymentTerms: "Net 15", lines: [{ id: uid(), kind: "plan", refId: plans[0].id, name: "Brightloop CRM — Monthly", qty: 3, unitPrice: 2000 }], taxPercent: 18, discountId: null, billingCycleCount: 2, history: [{ id: uid(), event: "Created", at: daysAgo(60), note: "" }, { id: uid(), event: "Activated", at: daysAgo(60), note: "" }, { id: uid(), event: "Paused", at: daysAgo(5), note: "Customer request — budget freeze" }], createdAt: daysAgo(60) },
    { id: uid(), number: `SB-${mk(6)}`, customerId: customers[1].id, quotationId: null, startDate: daysAgo(400), endDate: daysAgo(35), status: "closed", paymentTerms: "Net 15", lines: [{ id: uid(), kind: "plan", refId: plans[0].id, name: "Brightloop CRM — Monthly", qty: 2, unitPrice: 2000 }], taxPercent: 18, discountId: null, billingCycleCount: 13, history: [{ id: uid(), event: "Closed", at: daysAgo(35), note: "Renewed into SB-0002 seats" }], createdAt: daysAgo(400) },
  ];

  // Invoices generated from the billing history above (2-3 per active sub) + a couple standalone.
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let inv = 0;
  let pay = 0;

  const addInvoice = (sub: Subscription, periodStart: string, daysDue = 15) => {
    inv += 1;
    const lines = sub.lines.map((l) => ({
      id: uid(),
      description: `${l.name} × ${l.qty}`,
      qty: l.qty,
      unitPrice: l.unitPrice,
      taxPercent: sub.taxPercent,
      discountAmount: 0,
    }));
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const taxTotal = Math.round(lines.reduce((s, l) => s + (l.qty * l.unitPrice - l.discountAmount) * l.taxPercent, 0)) / 100;
    const grandTotal = subtotal - 0 + taxTotal;
    const invoice: Invoice = {
      id: uid(),
      number: `INV-${mk(inv)}`,
      customerId: sub.customerId,
      subscriptionId: sub.id,
      subscriptionNumber: sub.number,
      lines,
      issueDate: periodStart,
      dueDate: addDays(periodStart, daysDue),
      status: "confirmed",
      billingPeriod: periodStart.slice(0, 7),
      subtotal,
      discountTotal: 0,
      taxTotal,
      grandTotal,
      notes: "",
      createdAt: periodStart,
    };
    invoices.push(invoice);
    return invoice;
  };

  const addPayment = (invoice: Invoice, amount: number, method: Payment["method"], date: string, notes = "") => {
    pay += 1;
    payments.push({ id: uid(), number: `PAY-${mk(pay)}`, customerId: invoice.customerId, invoiceId: invoice.id, method, amount, date, notes });
    if (amount >= invoice.grandTotal - 0.01) invoice.status = "paid";
  };

  const s1 = subscriptions[0], s2 = subscriptions[1], s3 = subscriptions[2], s5 = subscriptions[4];
  const i1a = addInvoice(s1, daysAgo(38)); addPayment(i1a, i1a.grandTotal, "upi", daysAgo(33), "UPI ref 40217345");
  const i1b = addInvoice(s1, daysAgo(8)); addPayment(i1b, Math.round(i1b.grandTotal * 0.5), "bank_transfer", daysAgo(3), "Partial — NEFT");
  const i2a = addInvoice(s2, daysAgo(75)); addPayment(i2a, i2a.grandTotal, "card", daysAgo(70));
  const i2b = addInvoice(s2, daysAgo(45)); addPayment(i2b, i2b.grandTotal, "upi", daysAgo(41));
  const i2c = addInvoice(s2, daysAgo(15), 10); addPayment(i2c, Math.round(i2c.grandTotal * 0.4), "upi", daysAgo(9));
  const i3a = addInvoice(s3, daysAgo(20)); addPayment(i3a, i3a.grandTotal, "bank_transfer", daysAgo(15));
  const i5a = addInvoice(s5, daysAgo(60)); addPayment(i5a, i5a.grandTotal, "upi", daysAgo(55));
  const i5b = addInvoice(s5, daysAgo(30)); addPayment(i5b, i5b.grandTotal, "cash", daysAgo(24));
  // Overdue standalone invoice for s3's add-on
  inv += 1;
  const addon = products[5];
  invoices.push({
    id: uid(), number: `INV-${mk(inv)}`, customerId: s3.customerId, subscriptionId: s3.id, subscriptionNumber: s3.number,
    lines: [{ id: uid(), description: `${addon.name} × 1`, qty: 1, unitPrice: addon.salesPrice, taxPercent: 18, discountAmount: 0 }],
    issueDate: daysAgo(30), dueDate: daysAgo(15), status: "confirmed", billingPeriod: null,
    subtotal: addon.salesPrice, discountTotal: 0, taxTotal: Math.round(addon.salesPrice * 0.18) / 100, grandTotal: addon.salesPrice * 1.18,
    notes: "", createdAt: daysAgo(30),
  });

  const notifications: AppNotification[] = [
    { id: uid(), title: "Invoice overdue", body: "INV-0009 for Bluestone Fabrics passed its due date.", at: daysAgo(14), read: false, kind: "warning" },
    { id: uid(), title: "Quotation awaiting response", body: "QT-0002 sent to Teja Logistics expires in 3 days.", at: daysAgo(1), read: false, kind: "info" },
    { id: uid(), title: "Payment received", body: "₹19,620 received via UPI against INV-0005.", at: daysAgo(9), read: true, kind: "success" },
  ];

  const discountUsages: DiscountUsage[] = [
    { id: uid(), discountId: discounts[0].id, invoiceId: invoices[2]?.id ?? "", amount: 3600, usedAt: daysAgo(45) },
    { id: uid(), discountId: discounts[1].id, invoiceId: invoices[1]?.id ?? "", amount: 2000, usedAt: daysAgo(70) },
  ];

  return {
    products, plans, customers, taxRules, discounts, discountUsages, quotationTemplates, quotations,
    subscriptions, invoices, payments, notifications,
    counters: { quotation: 4, subscription: 6, invoice: inv, payment: pay },
  };
}

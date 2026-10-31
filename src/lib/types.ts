export type Role = "admin" | "staff" | "customer";

export type BillingFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type ProductType = "subscription" | "license" | "service" | "addon";

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes: string;
  variants: ProductVariant[];
  variantId: string | null; // selected default variant
  archived: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  productId: string;
  price: number;
  frequency: BillingFrequency;
  minQuantity: number;
  availableFrom: string;
  availableTo: string;
  autoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  active: boolean;
  archived: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  billingAddress: string;
  taxId: string;
  createdAt: string;
}

export interface TaxRule {
  id: string;
  name: string;
  percent: number;
  productIds: string[]; // empty = applies to all products
  active: boolean;
}

export type DiscountType = "fixed" | "percent";

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  minPurchase: number;
  minQuantity: number;
  startDate: string;
  endDate: string;
  maxUses: number;
  usedCount: number;
  productIds: string[]; // empty = all products
  active: boolean;
}

export interface DiscountUsage {
  id: string;
  discountId: string;
  invoiceId: string;
  amount: number;
  usedAt: string;
}

export type QuotationStatus = "draft" | "sent" | "accepted" | "expired" | "cancelled";

export interface QuotationTemplate {
  id: string;
  name: string;
  intro: string;
  terms: string;
}

export interface QuoteLine {
  id: string;
  kind: "product" | "plan";
  refId: string;
  name: string;
  variantName?: string;
  qty: number;
  unitPrice: number;
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  templateId: string | null;
  lines: QuoteLine[];
  validityDays: number;
  issueDate: string;
  expiryDate: string;
  status: QuotationStatus;
  notes: string;
  taxPercent: number;
  createdAt: string;
}

export type SubscriptionStatus = "draft" | "confirmed" | "active" | "paused" | "closed";

export interface SubscriptionLine {
  id: string;
  kind: "product" | "plan";
  refId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface SubscriptionEvent {
  id: string;
  event: string;
  at: string;
  note: string;
}

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  quotationId: string | null;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  paymentTerms: string;
  lines: SubscriptionLine[];
  taxPercent: number;
  discountId: string | null;
  billingCycleCount: number; // periods already invoiced
  history: SubscriptionEvent[];
  createdAt: string;
}

export type InvoiceStatus = "draft" | "confirmed" | "cancelled" | "paid";

export interface InvoiceLine {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxPercent: number;
  discountAmount: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  subscriptionId: string | null;
  subscriptionNumber: string | null;
  lines: InvoiceLine[];
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  billingPeriod: string | null; // e.g. "2026-10" — idempotency key per subscription
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  notes: string;
  createdAt: string;
}

export type PaymentMethod = "upi" | "bank_transfer" | "cash" | "card" | "other";

export interface Payment {
  id: string;
  number: string;
  customerId: string;
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  notes: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: "info" | "warning" | "success";
}


export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company?: string;
  customerId?: string;
  createdAt: string;
}

import type { Discount, InvoiceLine, QuoteLine, TaxRule } from "./types";
import { daysBetween, today } from "./format";

export function taxPercentFor(taxRules: TaxRule[], productId: string): number {
  const active = taxRules.filter((t) => t.active);
  for (const t of active) {
    if (t.productIds.length === 0 || t.productIds.includes(productId)) return t.percent;
  }
  return 0;
}

export interface QuoteTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function quoteTotals(lines: QuoteLine[], taxPercent: number): QuoteTotals {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = Math.round(subtotal * taxPercent) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

export interface DiscountEligibility {
  eligible: boolean;
  reason: string;
  amount: number;
}

export function evaluateDiscount(
  discount: Discount | undefined,
  lineItems: { productId: string; qty: number; unitPrice: number }[],
  subtotal: number,
): DiscountEligibility {
  if (!discount || !discount.active) return { eligible: false, reason: "Inactive", amount: 0 };
  const now = today();
  if (discount.startDate && now < discount.startDate) return { eligible: false, reason: "Not started yet", amount: 0 };
  if (discount.endDate && now > discount.endDate) return { eligible: false, reason: "Expired", amount: 0 };
  if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses)
    return { eligible: false, reason: "Usage limit reached", amount: 0 };
  if (discount.minPurchase > 0 && subtotal < discount.minPurchase)
    return { eligible: false, reason: `Minimum purchase ₹${discount.minPurchase.toLocaleString("en-IN")} not met`, amount: 0 };
  const totalQty = lineItems.reduce((s, l) => s + l.qty, 0);
  if (discount.minQuantity > 0 && totalQty < discount.minQuantity)
    return { eligible: false, reason: `Minimum quantity ${discount.minQuantity} not met`, amount: 0 };
  if (discount.productIds.length > 0) {
    const covered = lineItems.some((l) => discount.productIds.includes(l.productId));
    if (!covered) return { eligible: false, reason: "No eligible products in cart", amount: 0 };
  }
  const amount = discount.type === "percent" ? Math.round(subtotal * discount.value) / 100 : Math.min(discount.value, subtotal);
  return { eligible: true, reason: "Applied", amount };
}

export function invoiceTotals(lines: InvoiceLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const discountTotal = lines.reduce((s, l) => s + l.discountAmount, 0);
  const taxable = subtotal - discountTotal;
  const taxTotal = lines.reduce((s, l) => s + Math.round((l.qty * l.unitPrice - l.discountAmount) * l.taxPercent) / 100, 0);
  return { subtotal, discountTotal, taxTotal, grandTotal: taxable + taxTotal };
}

export function markOverdue(invoice: { status: string; dueDate: string }) {
  return invoice.status === "confirmed" && daysBetween(today(), invoice.dueDate) < 0;
}

import type { BillingFrequency } from "./types";

export const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);

export const INR0 = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtDate = (iso: string) =>
  iso ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const today = () => new Date().toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const addMonths = (iso: string, months: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);

export const daysUntil = (iso: string) => daysBetween(today(), iso);

export const frequencyDays: Record<BillingFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

export const frequencyLabel: Record<BillingFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export const periodLabel: Record<BillingFrequency, (iso: string, n?: number) => string> = {
  daily: (iso, n = 1) => iso,
  weekly: (iso) => `Week of ${iso}`,
  monthly: (iso) => iso.slice(0, 7),
  yearly: (iso) => iso.slice(0, 4),
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const isOverdue = (status: string, dueDate: string) =>
  (status === "confirmed") && daysUntil(dueDate) < 0;

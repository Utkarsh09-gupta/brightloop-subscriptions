import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  to,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
  to?: string;
}) {
  const toneClass =
    tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  const body = (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className={cn("mt-1.5 truncate text-2xl font-semibold tracking-tight", toneClass)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {icon ? <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div> : null}
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

const badgeTones: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  accepted: "bg-success/15 text-success",
  confirmed: "bg-primary/10 text-primary",
  active: "bg-success/15 text-success",
  paid: "bg-success/15 text-success",
  paused: "bg-warning/20 text-amber-700",
  expired: "bg-warning/20 text-amber-700",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  closed: "bg-muted text-muted-foreground",
  inactive: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium capitalize", badgeTones[key] ?? "bg-muted text-muted-foreground")}>
      {key}
    </Badge>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 px-6 py-14 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[13px] font-medium text-foreground">{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

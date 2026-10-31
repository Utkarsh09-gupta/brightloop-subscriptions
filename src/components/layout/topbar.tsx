import { useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Command, LogOut, RotateCcw, Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { INR, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import type { Role } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  staff: "Internal staff",
  customer: "Customer",
};

export function Topbar() {
  const store = useStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const unread = store.notifications.filter((n) => !n.read).length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { customers: [], products: [], invoices: [], subscriptions: [] };
    return {
      customers: store.customers.filter((c) => (c.name + c.company + c.email).toLowerCase().includes(q)).slice(0, 5),
      products: store.products.filter((p) => !p.archived && p.name.toLowerCase().includes(q)).slice(0, 4),
      invoices: store.invoices.filter((i) => i.number.toLowerCase().includes(q)).slice(0, 4),
      subscriptions: store.subscriptions.filter((s) => s.number.toLowerCase().includes(q)).slice(0, 4),
    };
  }, [query, store.customers, store.products, store.invoices, store.subscriptions]);

  const customerName = (id: string) => store.customers.find((c) => c.id === id)?.company ?? "—";

  const go = (url: string) => {
    setSearchOpen(false);
    setQuery("");
    navigate({ to: url });
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <Button variant="outline" size="sm" className="h-8 w-56 justify-start gap-2 font-normal text-muted-foreground" onClick={() => setSearchOpen(true)}>
        <Search className="size-3.5" />
        Search anything…
        <kbd className="ml-auto flex items-center gap-0.5 rounded border bg-muted px-1 text-[10px]">
          <Command className="size-2.5" />K
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Select value={store.role} onValueChange={(v) => store.setRole(v as Role)}>
          <SelectTrigger size="sm" className="w-[150px]" title="Demo role switcher — switches the workspace view">
            <User className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">View as: Admin</SelectItem>
            <SelectItem value="staff">View as: Staff</SelectItem>
            <SelectItem value="customer">View as: Customer</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-8" aria-label="Notifications">
              <Bell className="size-4" />
              {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={store.markNotificationsRead}>
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {store.notifications.slice(0, 6).map((n) => (
              <div key={n.id} className="flex gap-2 px-2 py-2 text-sm">
                <span
                  className={
                    "mt-1.5 size-2 shrink-0 rounded-full " +
                    (n.kind === "warning" ? "bg-warning" : n.kind === "success" ? "bg-success" : "bg-primary")
                  }
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/70">{fmtDate(n.at)}</p>
                </div>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-label="Account menu">
              {ROLE_LABEL[store.role][0]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{ROLE_LABEL[store.role]} workspace</p>
              <p className="text-xs font-normal text-muted-foreground">Frontend demo — role switcher above</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {store.role === "customer" && store.customers.length > 0 && (
              <>
                <div className="px-2 py-1.5">
                  <p className="mb-1 text-xs text-muted-foreground">Portal identity</p>
                  <Select value={store.demoCustomerId || store.customers[0].id} onValueChange={store.setDemoCustomerId}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {store.customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => { store.resetDemoData(); toast.success("Demo data reset"); }}>
              <RotateCcw className="size-4" /> Reset demo data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Sign-in is simulated in this front-end demo")}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search customers, products, invoices, subscriptions…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {results.customers.length > 0 && (
            <CommandGroup heading="Customers">
              {results.customers.map((c) => (
                <CommandItem key={c.id} value={c.name} onSelect={() => go(`/customers/${c.id}`)}>
                  <User className="size-4" /> {c.name} <Badge variant="outline" className="ml-2">{c.company}</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.products.length > 0 && (
            <CommandGroup heading="Products">
              {results.products.map((p) => (
                <CommandItem key={p.id} value={p.name} onSelect={() => go("/products")}>
                  <Search className="size-4" /> {p.name} <span className="ml-auto text-xs text-muted-foreground">{INR(p.salesPrice)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.invoices.length > 0 && (
            <CommandGroup heading="Invoices">
              {results.invoices.map((i) => (
                <CommandItem key={i.id} value={i.number} onSelect={() => go(`/invoices/${i.id}`)}>
                  <Receipt className="size-4" /> {i.number} <span className="ml-auto text-xs text-muted-foreground">{customerName(i.customerId)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results.subscriptions.length > 0 && (
            <CommandGroup heading="Subscriptions">
              {results.subscriptions.map((s) => (
                <CommandItem key={s.id} value={s.number} onSelect={() => go(`/subscriptions/${s.id}`)}>
                  <Command className="size-4" /> {s.number} <span className="ml-auto text-xs text-muted-foreground">{customerName(s.customerId)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
      <span className="hidden">{pathname}</span>
    </header>
  );
}

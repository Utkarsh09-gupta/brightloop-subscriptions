import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3, Boxes, CalendarClock, FileText, LayoutDashboard, Landmark, Percent,
  Receipt, Settings2, Tags, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "staff", "customer"] },
      { title: "Analytics", url: "/analytics", icon: BarChart3, roles: ["admin", "staff"] },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Customers", url: "/customers", icon: Users, roles: ["admin", "staff"] },
      { title: "Quotations", url: "/quotations", icon: FileText, roles: ["admin", "staff"] },
      { title: "Subscriptions", url: "/subscriptions", icon: CalendarClock, roles: ["admin", "staff", "customer"] },
    ],
  },
  {
    label: "Billing",
    items: [
      { title: "Invoices", url: "/invoices", icon: Receipt, roles: ["admin", "staff", "customer"] },
      { title: "Payments", url: "/payments", icon: Landmark, roles: ["admin", "staff", "customer"] },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", url: "/products", icon: Boxes, roles: ["admin"] },
      { title: "Plans", url: "/plans", icon: Tags, roles: ["admin"] },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Tax rules", url: "/taxes", icon: Percent, roles: ["admin"] },
      { title: "Discounts", url: "/discounts", icon: Settings2, roles: ["admin"] },
    ],
  },
];

export function AppSidebar() {
  const role = useStore((s) => s.role);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  void _unused;

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Link to="/" className="gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
                  B
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[15px] font-semibold text-sidebar-foreground">Brightloop</span>
                  <span className="block truncate text-[11px] text-sidebar-foreground/60">Subscription Manager</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => {
          const items = group.items.filter((i) => i.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

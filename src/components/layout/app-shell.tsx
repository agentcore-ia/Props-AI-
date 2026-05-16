"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  Building2,
  CircleAlert,
  Landmark,
  KeyRound,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Phone,
  CalendarDays,
  Receipt,
  Search,
  Settings,
  Shield,
  UserRound,
  Wallet,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DashboardAssistant } from "@/components/dashboard/dashboard-assistant";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

type AppRole = "superadmin" | "agency_admin" | "agent" | "customer";

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const defaultNavigation: NavigationGroup[] = [
  {
    label: "Trabajo diario",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/propiedades", label: "Propiedades", icon: Building2 },
      { href: "/mensajes", label: "Mensajes", icon: MessageSquareText },
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Administracion",
    items: [
      { href: "/alquileres", label: "Alquileres", icon: KeyRound },
      { href: "/propietarios", label: "Propietarios", icon: UserRound },
      { href: "/inquilinos", label: "Inquilinos", icon: Users },
      { href: "/cobranzas", label: "Cobros", icon: Wallet },
      { href: "/morosos", label: "Morosos", icon: CircleAlert },
      { href: "/caja", label: "Caja", icon: Landmark },
      { href: "/transferencias", label: "Pagos propietarios", icon: Wallet },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/proveedores", label: "Proveedores", icon: Shield },
      { href: "/facturacion", label: "Facturas", icon: Receipt },
      { href: "/ia", label: "Asistente", icon: Bot },
      { href: "/llamadas", label: "Llamadas", icon: Phone },
      { href: "/configuracion", label: "Ajustes", icon: Settings },
    ],
  },
];

const adminNavigation: NavigationGroup[] = [
  {
    label: "Admin",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inmobiliarias", label: "Inmobiliarias", icon: Users },
      { href: "/configuracion", label: "Ajustes", icon: Settings },
    ],
  },
  {
    label: "Operacion",
    items: [
      { href: "/propiedades", label: "Propiedades", icon: Building2 },
      { href: "/alquileres", label: "Alquileres", icon: KeyRound },
      { href: "/propietarios", label: "Propietarios", icon: UserRound },
      { href: "/inquilinos", label: "Inquilinos", icon: Users },
      { href: "/cobranzas", label: "Cobros", icon: Wallet },
      { href: "/morosos", label: "Morosos", icon: CircleAlert },
      { href: "/caja", label: "Caja", icon: Landmark },
      { href: "/transferencias", label: "Pagos propietarios", icon: Wallet },
    ],
  },
  {
    label: "Soporte",
    items: [
      { href: "/proveedores", label: "Proveedores", icon: Shield },
      { href: "/facturacion", label: "Facturas", icon: Receipt },
      { href: "/mensajes", label: "Mensajes", icon: MessageSquareText },
    ],
  },
];

function SidebarContent({ userRole = "agency_admin" }: { userRole?: AppRole | null }) {
  const pathname = usePathname();
  const navigation = userRole === "superadmin" ? adminNavigation : defaultNavigation;

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-3">
        <Link href="/dashboard" className="block transition-opacity hover:opacity-80">
          <span className="block text-xl font-semibold tracking-tight text-slate-950">PROPS</span>
          <span className="mt-0.5 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Control inmobiliario
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <nav className="space-y-3 pb-3">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  userEmail,
  accountLabel,
  accountSubLabel,
  userRole,
}: {
  children: ReactNode;
  userEmail?: null | string;
  accountLabel?: string | null;
  accountSubLabel?: string | null;
  userRole?: AppRole | null;
}) {
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen w-full xl:pl-48">
        <aside className="glass-panel hidden border-r border-sidebar-border xl:fixed xl:inset-y-0 xl:left-0 xl:flex xl:h-screen xl:w-48 xl:flex-col">
          <SidebarContent userRole={userRole} />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-2 py-3 sm:px-3">
              <div className="xl:hidden">
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" size="icon" />}>
                    <Menu className="size-4" />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[224px] border-r bg-sidebar p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Menu principal</SheetTitle>
                      <SheetDescription>Navegacion del CRM Props</SheetDescription>
                    </SheetHeader>
                    <SidebarContent userRole={userRole} />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar propiedades, leads o conversaciones..."
                  className="h-11 rounded-2xl border-0 bg-card pl-11 shadow-sm"
                />
              </div>

              <Button variant="outline" size="icon" className="rounded-2xl">
                <Bell className="size-4" />
              </Button>

              <ThemeToggle />

              <Separator orientation="vertical" className="hidden h-10 sm:block" />

              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-2xl border">
                  <AvatarFallback className="rounded-2xl bg-primary/10 font-semibold text-primary">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold">{accountLabel ?? "Cuenta activa"}</p>
                  <p className="text-xs text-muted-foreground">{accountSubLabel ?? userEmail ?? "Sesion activa"}</p>
                </div>
                <form action="/auth/logout" method="post" className="hidden sm:block">
                  <button
                    type="submit"
                    className="rounded-2xl border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                  >
                    Salir
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="flex-1 px-2 py-4 sm:px-3">{children}</main>
        </div>
      </div>
      <DashboardAssistant />
    </div>
  );
}

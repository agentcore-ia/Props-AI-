"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  Building2,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inmobiliarias", label: "Inmobiliarias", icon: ShieldCheck },
  { href: "/propiedades", label: "Propiedades", icon: Building2 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/mensajes", label: "Mensajes", icon: MessageSquareText },
  { href: "/ia", label: "IA", icon: Bot },
  { href: "/llamadas", label: "Llamadas", icon: Phone },
  { href: "/configuracion", label: "Configuracion", icon: Settings },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Props AI</p>
            <h1 className="text-lg font-semibold">CRM inmobiliario</h1>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1 pb-6">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
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
        </nav>
      </ScrollArea>

      <div className="m-3 rounded-3xl border bg-sidebar-muted p-4">
        <p className="text-sm font-semibold">Automatizaciones activas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          3 flujos IA respondiendo mensajes y calificando leads.
        </p>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail?: null | string;
}) {
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen w-full">
        <aside className="glass-panel sticky top-0 hidden h-screen w-72 border-r border-sidebar-border xl:block">
          <SidebarContent />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-2 py-3 sm:px-3">
              <div className="xl:hidden">
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" size="icon" />}>
                    <Menu className="size-4" />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] border-r bg-sidebar p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Menu principal</SheetTitle>
                      <SheetDescription>Navegacion del CRM Props</SheetDescription>
                    </SheetHeader>
                    <SidebarContent />
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

              <Separator orientation="vertical" className="hidden h-10 sm:block" />

              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-2xl border">
                  <AvatarFallback className="rounded-2xl bg-primary/10 font-semibold text-primary">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold">Agentcore Realty</p>
                  <p className="text-xs text-muted-foreground">{userEmail ?? "Sesion activa"}</p>
                </div>
                <a
                  href="/auth/logout"
                  className="hidden rounded-2xl border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 sm:inline-flex"
                >
                  Salir
                </a>
              </div>
            </div>
          </header>

          <main className="flex-1 px-2 py-4 sm:px-3">{children}</main>
        </div>
      </div>
    </div>
  );
}

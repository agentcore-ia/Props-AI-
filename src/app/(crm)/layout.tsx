import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUserContext } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUserContext();

  return (
    <AppShell
      userEmail={currentUser?.user.email ?? null}
      accountLabel={currentUser?.profile.full_name ?? currentUser?.profile.agency_slug ?? "Cuenta activa"}
      accountSubLabel={currentUser?.profile.role === "superadmin" ? "Administracion" : currentUser?.user.email ?? null}
    >
      {children}
    </AppShell>
  );
}

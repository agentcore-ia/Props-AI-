import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppShell userEmail={user?.email ?? null}>{children}</AppShell>;
}

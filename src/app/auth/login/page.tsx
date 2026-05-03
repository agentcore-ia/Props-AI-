import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const redirectTo = searchParams.redirectTo ?? "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_24%),#f8fafc] px-4 py-10">
      <Card className="w-full max-w-md rounded-[32px] border-0 bg-card shadow-soft">
        <CardContent className="space-y-8 p-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-primary/80">Props AI</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Ingresar al dashboard</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Accede al panel de operaciones de tu inmobiliaria con Supabase Auth.
              </p>
            </div>
          </div>

          <LoginForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}

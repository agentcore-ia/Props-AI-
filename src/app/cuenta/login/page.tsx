import { Building2 } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PublicAuthForm } from "@/components/auth/public-auth-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { buildAppUrl, buildMarketplaceUrl } from "@/lib/request-url";

export const dynamic = "force-dynamic";

export default async function PublicLoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  const current = await getCurrentUserContext();
  const requestHeaders = headers();

  if (current) {
    redirect(
      (current.profile.role === "customer"
        ? buildMarketplaceUrl("/cuenta", requestHeaders)
        : buildAppUrl("/dashboard", requestHeaders)
      ).toString()
    );
  }

  const redirectTo = searchParams.redirectTo ?? "/";
  const error =
    searchParams.error === "invalid_credentials"
      ? "Email o password incorrectos."
      : searchParams.error === "unexpected"
        ? "Ocurrio un error inesperado al iniciar sesion."
        : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_24%),#f8fafc] px-4 py-10">
      <Card className="w-full max-w-md rounded-[32px] border-0 bg-card shadow-soft">
        <CardContent className="space-y-8 p-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-primary/80">Props</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Ingresar a tu cuenta
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Guarda favoritos, vuelve a tus consultas y conversa con la IA antes de contactar a una inmobiliaria.
              </p>
            </div>
          </div>

          <PublicAuthForm mode="login" redirectTo={redirectTo} error={error} />

          <p className="text-center text-sm text-muted-foreground">
            No tienes cuenta?{" "}
            <Link href="/cuenta/registro" className="font-medium text-primary hover:underline">
              Crear cuenta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

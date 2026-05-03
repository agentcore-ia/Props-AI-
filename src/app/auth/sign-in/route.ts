import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { buildAbsoluteUrl, buildAppUrl, buildMarketplaceUrl } from "@/lib/request-url";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  const loginUrl = buildAbsoluteUrl("/auth/login", request.headers);
  if (redirectTo) {
    loginUrl.searchParams.set("redirectTo", redirectTo);
  }

  const cookieStore = cookies();
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase login failed", {
      email,
      message: error.message,
      code: error.code,
      status: error.status,
    });
    loginUrl.searchParams.set("error", "invalid_credentials");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role =
    (profile?.role as "superadmin" | "agency_admin" | "agent" | "customer") ?? "customer";
  const targetPath = redirectTo && redirectTo.startsWith("/") ? redirectTo : undefined;

  return NextResponse.redirect(
    role === "customer"
      ? buildMarketplaceUrl(targetPath ?? "/", request.headers)
      : buildAppUrl(targetPath ?? "/dashboard", request.headers),
    {
      status: 303,
    }
  );
}

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
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  const loginUrl = buildAbsoluteUrl("/cuenta/login", request.headers);
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

  if (error || !data.user) {
    loginUrl.searchParams.set("error", "invalid_credentials");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role && profile.role !== "customer") {
    return NextResponse.redirect(buildAppUrl("/dashboard", request.headers), {
      status: 303,
    });
  }

  return NextResponse.redirect(buildMarketplaceUrl(redirectTo || "/", request.headers), {
    status: 303,
  });
}

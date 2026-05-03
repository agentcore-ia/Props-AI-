import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildAbsoluteUrl } from "@/lib/request-url";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/cuenta");

  const signupUrl = buildAbsoluteUrl("/cuenta/registro", request.headers);
  if (redirectTo) {
    signupUrl.searchParams.set("redirectTo", redirectTo);
  }

  if (!fullName || !email || password.length < 8) {
    signupUrl.searchParams.set(
      "error",
      password.length < 8 ? "weak_password" : "unexpected"
    );
    return NextResponse.redirect(signupUrl, { status: 303 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    signupUrl.searchParams.set("error", "user_exists");
    return NextResponse.redirect(signupUrl, { status: 303 });
  }

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (createUserError || !createdUser.user) {
    signupUrl.searchParams.set("error", "unexpected");
    return NextResponse.redirect(signupUrl, { status: 303 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      email,
      full_name: fullName,
      role: "customer",
      agency_slug: null,
    })
    .eq("id", createdUser.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    signupUrl.searchParams.set("error", "unexpected");
    return NextResponse.redirect(signupUrl, { status: 303 });
  }

  const loginUrl = buildAbsoluteUrl("/cuenta/login", request.headers);
  loginUrl.searchParams.set("redirectTo", redirectTo || "/cuenta");
  return NextResponse.redirect(loginUrl, { status: 303 });
}

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildAbsoluteUrl } from "@/lib/request-url";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  const signupUrl = buildAbsoluteUrl("/cuenta/registro", request.headers);
  if (redirectTo) {
    signupUrl.searchParams.set("redirectTo", redirectTo);
  }

  const normalizedPhone = phone.replace(/[^\d+]/g, "");

  if (!fullName || !email || !phone || password.length < 8) {
    signupUrl.searchParams.set(
      "error",
      !phone ? "missing_phone" : password.length < 8 ? "weak_password" : "unexpected"
    );
    return NextResponse.redirect(signupUrl, { status: 303 });
  }

  if (normalizedPhone.replace(/\D/g, "").length < 8) {
    signupUrl.searchParams.set("error", "invalid_phone");
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
      phone: normalizedPhone,
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
      phone: normalizedPhone,
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
  loginUrl.searchParams.set("redirectTo", redirectTo || "/");
  return NextResponse.redirect(loginUrl, { status: 303 });
}

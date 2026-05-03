"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(_: { error?: string } | undefined, formData: FormData) {
  const supabase = createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Email o password incorrectos.",
    };
  }

  redirect(redirectTo || "/dashboard");
}

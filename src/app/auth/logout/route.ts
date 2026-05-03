import { NextResponse } from "next/server";

import { buildAbsoluteUrl } from "@/lib/request-url";
import { createClient } from "@/lib/supabase/server";

async function signOutAndRedirect(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(buildAbsoluteUrl("/auth/login", new Headers(request.headers)), {
    status: 303,
  });
}

export async function GET(request: Request) {
  return signOutAndRedirect(request);
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}

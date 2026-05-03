import { NextResponse } from "next/server";

import { buildAbsoluteUrl } from "@/lib/request-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(buildAbsoluteUrl("/auth/login", new Headers(request.headers)), {
    status: 303,
  });
}

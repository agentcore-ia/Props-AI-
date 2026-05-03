import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildAbsoluteUrl } from "@/lib/request-url";

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(buildAbsoluteUrl("/", request.headers), {
    status: 303,
  });
}

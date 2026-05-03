import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildAbsoluteUrlFromNextRequest, buildMarketplaceUrl } from "@/lib/request-url";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantFromHost } from "@/lib/tenant-routing";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/site")
  ) {
    return NextResponse.next();
  }

  const resolved = resolveTenantFromHost(request.headers.get("host"));

  if (resolved.kind === "tenant" && resolved.tenantSlug) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      pathname === "/"
        ? `/site/${resolved.tenantSlug}`
        : `/site/${resolved.tenantSlug}${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  let session:
    | Awaited<ReturnType<typeof updateSession>>
    | null = null;

  if (resolved.kind === "app") {
    session = await updateSession(request);
    let role: "superadmin" | "agency_admin" | "agent" | "customer" | null = null;

    if (session.user) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      role =
        (profile?.role as "superadmin" | "agency_admin" | "agent" | "customer" | null) ??
        null;
    }

    const isAuthRoute = pathname.startsWith("/auth");
    const isLogoutRoute = pathname === "/auth/logout";
    const isProtectedRoute = !isAuthRoute;

    if (pathname === "/") {
      const target = session.user
        ? role === "customer"
          ? buildMarketplaceUrl("/cuenta", request.headers)
          : buildAbsoluteUrlFromNextRequest("/dashboard", request)
        : buildAbsoluteUrlFromNextRequest("/auth/login", request);
      const redirectResponse = NextResponse.redirect(target);
      session.copyCookies(redirectResponse);
      return redirectResponse;
    }

    if (isProtectedRoute && session.user && role === "customer") {
      const redirectResponse = NextResponse.redirect(
        buildMarketplaceUrl("/cuenta", request.headers)
      );
      session.copyCookies(redirectResponse);
      return redirectResponse;
    }

    if (isProtectedRoute && !session.user) {
      const loginUrl = buildAbsoluteUrlFromNextRequest("/auth/login", request);
      loginUrl.searchParams.set("redirectTo", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      session.copyCookies(redirectResponse);
      return redirectResponse;
    }

    if (isAuthRoute && session.user && !isLogoutRoute) {
      const redirectResponse = NextResponse.redirect(
        role === "customer"
          ? buildMarketplaceUrl("/cuenta", request.headers)
          : buildAbsoluteUrlFromNextRequest("/dashboard", request)
      );
      session.copyCookies(redirectResponse);
      return redirectResponse;
    }
  }

  return session?.response ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

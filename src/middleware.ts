import { NextResponse, type NextRequest } from "next/server";

import { buildAbsoluteUrlFromNextRequest } from "@/lib/request-url";
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

    const isAuthRoute = pathname.startsWith("/auth");
    const isProtectedRoute = !isAuthRoute;

    if (pathname === "/") {
      const target = session.user ? "/dashboard" : "/auth/login";
      const redirectResponse = NextResponse.redirect(
        buildAbsoluteUrlFromNextRequest(target, request)
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

    if (isAuthRoute && session.user) {
      const redirectResponse = NextResponse.redirect(
        buildAbsoluteUrlFromNextRequest("/dashboard", request)
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

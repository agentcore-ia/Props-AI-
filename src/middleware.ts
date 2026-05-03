import { NextResponse, type NextRequest } from "next/server";

import { resolveTenantFromHost } from "@/lib/tenant-routing";

export function middleware(request: NextRequest) {
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

  if (resolved.kind === "app" && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (resolved.kind === "tenant" && resolved.tenantSlug) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      pathname === "/"
        ? `/site/${resolved.tenantSlug}`
        : `/site/${resolved.tenantSlug}${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

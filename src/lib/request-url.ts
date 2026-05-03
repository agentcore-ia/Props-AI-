import type { NextRequest } from "next/server";

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildRequestOrigin(headers: Headers) {
  const protocol =
    headers.get("x-forwarded-proto") ??
    headers.get("x-forwarded-protocol") ??
    "https";
  const host =
    headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";

  return `${protocol}://${host}`;
}

export function buildAbsoluteUrl(path: string, headers: Headers) {
  return new URL(normalizePath(path), buildRequestOrigin(headers));
}

export function buildAbsoluteUrlFromNextRequest(path: string, request: NextRequest) {
  return buildAbsoluteUrl(path, request.headers);
}

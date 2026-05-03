import type { NextRequest } from "next/server";

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeOrigin(origin: string | null) {
  if (!origin) return null;

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

export function buildRequestOrigin(headers: Headers) {
  const directOrigin =
    normalizeOrigin(headers.get("origin")) ??
    normalizeOrigin(headers.get("referer"));

  if (directOrigin) {
    return directOrigin;
  }

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

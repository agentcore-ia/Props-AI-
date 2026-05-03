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

function buildFixedHostUrl(path: string, headers: Headers, host: string) {
  const protocol =
    headers.get("x-forwarded-proto") ??
    headers.get("x-forwarded-protocol") ??
    "https";

  return new URL(normalizePath(path), `${protocol}://${host}`);
}

function resolvePublicRootHost(headers: Headers) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";

  if (host.endsWith("props.com.ar")) {
    return "props.com.ar";
  }

  return host.replace(/^app\./, "");
}

export function buildMarketplaceUrl(path: string, headers: Headers) {
  return buildFixedHostUrl(path, headers, resolvePublicRootHost(headers));
}

export function buildAppUrl(path: string, headers: Headers) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";

  if (host.endsWith("props.com.ar")) {
    return buildFixedHostUrl(path, headers, "app.props.com.ar");
  }

  return buildAbsoluteUrl(path, headers);
}

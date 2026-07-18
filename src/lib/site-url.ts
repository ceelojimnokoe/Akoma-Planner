// src/lib/site-url.ts
//
// One shared way to build an absolute URL back into this app — for every
// place an auth email needs a redirect target (signup confirmation,
// resend, password reset). Previously each call site built this ad hoc
// from the request's `host` header; centralizing it means local dev,
// Vercel preview deployments, and production all resolve correctly
// without hardcoding localhost anywhere.
//
// Preference order:
//   1. NEXT_PUBLIC_APP_URL, if set — this project's existing "canonical
//      site URL" variable (see .env.example). Sourced from an env var
//      rather than the request wherever available so a Vercel preview
//      deployment's own throwaway domain never leaks into an email link
//      when a fixed production URL is what's actually wanted.
//   2. The current request's own Host header (+ a protocol inferred from
//      x-forwarded-proto, which Vercel always sets) — correct for local
//      dev with zero configuration, and a safe fallback anywhere else.

import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

// src/lib/auth-errors.ts
//
// One shared place to turn a Supabase Auth error (or any unexpected
// failure alongside one, e.g. a local-DB sync error) into a message that
// is always safe to render — never the literal "null", "undefined",
// "[object Object]", an empty string, or a raw technical/DB error. Every
// auth Server Action (server/actions/auth.ts) routes its error handling
// through here instead of re-deriving its own ad hoc checks, so a fix or
// a new rate-limit code only has to be taught in one place.
//
// Supabase AuthError messages ARE meant to be shown to end users (they're
// already written in plain language, e.g. "Password should be at least 6
// characters") — the risk this file guards against is specifically:
//   1. The handful of messages that are technically accurate but wrong to
//      show verbatim (a raw rate-limit message reads like a server
//      complaint, not guidance for the visitor).
//   2. Anything that ISN'T a real Supabase AuthError at all (a network
//      failure, a Prisma error from syncLocalUser, or literally `null`/
//      `undefined` reaching here some other way) — those never get their
//      raw message shown, full stop.

/** Narrow, structural check — works for Supabase's real AuthError/AuthApiError
 *  instances without importing their class (different subclasses exist
 *  across supabase-js versions; duck-typing is the stable contract). */
function isAuthErrorShaped(error: unknown): error is { message: string; status?: number; code?: string; name?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

const GENERIC_FALLBACK = "Something went wrong. Please try again in a moment.";
const NETWORK_FALLBACK = "We couldn't reach the server. Check your connection and try again.";

/**
 * Formats an error returned directly from a Supabase Auth call
 * (`{ data, error } = await supabase.auth.xyz(...)`). Safe to call with
 * `null`/`undefined` (returns the generic fallback) or with something
 * that isn't actually an AuthError (same).
 */
export function formatAuthError(error: unknown): string {
  if (!error) return GENERIC_FALLBACK;

  if (!isAuthErrorShaped(error)) {
    // Not a recognizable Supabase error at all (a thrown TypeError, a
    // plain object, `null`/`undefined` smuggled in as `unknown`, ...) —
    // never guess at a message from something this shapeless.
    return GENERIC_FALLBACK;
  }

  const status = error.status;
  const code = error.code?.toLowerCase();
  const message = error.message.trim();
  const lower = message.toLowerCase();

  // --- Rate limiting -------------------------------------------------
  // Supabase's default (non-custom-SMTP) email sending is aggressively
  // throttled — this is the single most common real-world error this
  // project's signup/resend/reset flows hit. Never shown raw.
  if (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    code === "over_sms_send_rate_limit" ||
    lower.includes("rate limit")
  ) {
    return "Too many verification emails have been requested. Please wait a few minutes before trying again, or use an account that's already been created.";
  }

  // --- Already registered ---------------------------------------------
  if (code === "user_already_exists" || lower.includes("already registered") || lower.includes("already exists")) {
    return "That email is already registered — try logging in instead.";
  }

  // --- Unconfirmed email ------------------------------------------------
  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Please confirm your email before logging in — check your inbox for the confirmation link.";
  }

  // --- Invalid credentials ----------------------------------------------
  // Deliberately the same message whether the email doesn't exist or the
  // password is wrong — never reveal which one it was.
  if (code === "invalid_credentials" || lower.includes("invalid login credentials")) {
    return "That email and password don't match.";
  }

  // --- Expired / invalid recovery or confirmation link -------------------
  if (code === "otp_expired" || lower.includes("expired") || (lower.includes("invalid") && lower.includes("token"))) {
    return "That link has expired or was already used. Request a new one and try again.";
  }

  // --- Weak password (signup / password update) ---------------------------
  if (code === "weak_password" || lower.includes("password should be")) {
    return message; // Supabase's own copy here is already specific and safe (e.g. minimum length).
  }

  // --- Network-level failures -------------------------------------------
  if (lower.includes("fetch failed") || lower.includes("network")) {
    return NETWORK_FALLBACK;
  }

  // A real Supabase AuthError we haven't special-cased, with a real
  // (non-empty, non-"null"/"undefined") message — safe to show verbatim,
  // same reasoning as the file header comment.
  if (message.length > 0 && lower !== "null" && lower !== "undefined") {
    return message;
  }

  return GENERIC_FALLBACK;
}

/**
 * For failures alongside/after the Supabase call itself — most
 * importantly syncLocalUser() (a Prisma write) — where the error is
 * emphatically NOT a Supabase AuthError and must never be shown to the
 * visitor verbatim (it can carry schema/column detail, or just be
 * unhelpful). Always returns the same safe copy; pair with
 * logAuthServerError() so the real cause is still visible server-side.
 */
export function formatUnexpectedAuthError(): string {
  return "We hit a problem completing that. Please try again in a moment — if this keeps happening, contact support.";
}

/**
 * Structured, secret-safe server-side logging for an auth failure that
 * isn't one of the expected/handled cases above — printed to the server
 * console (Vercel's function logs capture this) so a real bug is still
 * diagnosable, without ever logging the raw form input (password, in
 * particular) or a full request/cookie object.
 */
export function logAuthServerError(context: string, error: unknown): void {
  const safe =
    isAuthErrorShaped(error)
      ? { name: error.name, status: error.status, code: error.code, message: error.message }
      : error instanceof Error
        ? { name: error.name, message: error.message }
        : { value: typeof error };

  console.error(
    JSON.stringify({
      scope: "auth",
      context,
      at: new Date().toISOString(),
      error: safe,
    })
  );
}

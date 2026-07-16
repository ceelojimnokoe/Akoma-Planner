// src/components/auth/GoogleSignInButton.tsx
//
// One real, working Google sign-in button — used in both LogInForm.tsx
// and SignUpForm.tsx (Google OAuth has no separate "sign up" step; the
// auth/callback route handler decides where a Google identity lands
// based on whether it already has a wedding plan). Replaces the old,
// deleted SocialLoginButtons.tsx grid of four disabled "coming soon"
// buttons — Apple/Facebook/Microsoft stay out since only Google was
// actually configured (Supabase + Google Cloud), not reintroduced as
// fake placeholders.
//
// Must call signInWithOAuth() from the *browser* client, not a Server
// Action — it performs a real window navigation to Google's own consent
// screen, which only makes sense client-side.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function GoogleSignInButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsRedirecting(true);
    // Dynamically imported: @supabase/ssr's browser client pulls in the
    // full supabase-js SDK, the single biggest chunk on the auth pages —
    // no reason to ship it in /login and /signup's initial bundle when
    // most visitors type a password instead of clicking this button.
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setIsRedirecting(false);
    }
    // On success the browser navigates away to Google immediately —
    // nothing further to do here.
  }

  return (
    <div>
      <Button type="button" variant="ghost" className="w-full gap-2" disabled={isRedirecting} onClick={handleClick}>
        <GoogleIcon />
        {isRedirecting ? "Redirecting to Google…" : "Continue with Google"}
      </Button>
      {error && <p className="mt-2 text-sm text-akoma-terracotta">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

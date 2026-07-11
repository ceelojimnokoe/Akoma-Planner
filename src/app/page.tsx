// src/app/page.tsx
//
// Public marketing landing page — the first thing a visitor sees, whether
// or not they're signed in. Mostly static, but the nav/hero CTAs are
// session-aware: getCurrentUser() always resolves to *someone* (falls
// back to the seeded stub — see lib/session.ts), so "signed in" here
// specifically means "a real session cookie exists," checked directly via
// getSessionUserId() rather than getCurrentUser(). No feature claims here
// should overstate what exists elsewhere in the app; the safety
// commitments section in particular has to stay accurate as features get
// built.

import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";
import { getSessionUserId } from "@/lib/auth";

const FEATURES = [
  {
    title: "Budget calculator",
    body: "Category-by-category breakdown against your total budget, in GHS.",
  },
  {
    title: "Ghana-relevant checklist",
    body: "Default tasks covering both traditional rites and the white wedding, timed against your date.",
  },
  {
    title: "Guest list & RSVPs",
    body: "Track guests by side, RSVP status, and plus-ones.",
  },
  {
    title: "Vendors across Accra & Kumasi",
    body: "Browse real seeded vendors by category, with Pro comparison tools.",
  },
  {
    title: "BisaAI assistant",
    body: "Ask questions, draft vendor messages, and get estimated pricing — always labelled, always your approval before anything sends.",
  },
  {
    title: "Traditional list pricing",
    body: "Estimated costs for drinks, kente, and customary gifts, sourced by market.",
  },
];

export default async function LandingPage() {
  const isSignedIn = (await getSessionUserId()) !== null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-akoma-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo className="h-12 w-auto" />
          <nav className="flex items-center gap-3">
            <LinkButton href="/pricing" variant="ghost" size="sm">
              Pricing
            </LinkButton>
            {isSignedIn ? (
              <LinkButton href="/dashboard" variant="primary" size="sm">
                Go to Dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/login" variant="ghost" size="sm">
                  Log in
                </LinkButton>
                <LinkButton href="/signup" variant="primary" size="sm">
                  Get Started
                </LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
          <Badge tone="gold" className="mb-4">
            Built for the Ghanaian wedding
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-akoma-ink sm:text-5xl">
            Plan your wedding, both traditions at once.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-akoma-ink/70">
            Budget, checklist, guest list, and vendors across Accra and Kumasi —
            with BisaAI to help you draft messages and estimate costs along the
            way. Nothing gets sent or booked without you.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            {isSignedIn ? (
              <LinkButton href="/dashboard" size="lg">
                Go to Dashboard
              </LinkButton>
            ) : (
              <LinkButton href="/signup" size="lg">
                Start Planning — Free
              </LinkButton>
            )}
            <LinkButton href="/pricing" variant="ghost" size="lg">
              See Pro Features
            </LinkButton>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <h3 className="font-semibold text-akoma-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm text-akoma-ink/70">{f.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-akoma-ink/10 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold text-akoma-ink">
              How we handle AI, honestly
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <div>
                <h3 className="font-medium text-akoma-ink">
                  You approve everything sent
                </h3>
                <p className="mt-1.5 text-sm text-akoma-ink/70">
                  BisaAI can draft vendor messages, but only you can tap Send —
                  and only you can accept a quote.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-akoma-ink">
                  Prices are always estimates
                </h3>
                <p className="mt-1.5 text-sm text-akoma-ink/70">
                  Traditional-list and shopping-list pricing is clearly labelled
                  as an estimate, never a firm quote.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-akoma-ink">
                  Dress try-on is experimental
                </h3>
                <p className="mt-1.5 text-sm text-akoma-ink/70">
                  It&apos;s an opt-in preview with consent required, clearly
                  marked as inaccurate — not a purchase tool.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-akoma-ink/10 px-6 py-8 text-center text-sm text-akoma-ink/50">
        AkomaPlanner — a wedding planning MVP for the Ghanaian market.
      </footer>
    </div>
  );
}

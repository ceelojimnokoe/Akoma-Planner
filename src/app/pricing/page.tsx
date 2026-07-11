// src/app/pricing/page.tsx
//
// Standalone marketing-style page (outside the (app) route group, so no
// sidebar) — reachable both from the public landing page and from the
// sidebar's bottom nav link while inside the app.

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PricingCards } from "@/components/pricing/PricingCards";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader backHref="/dashboard" backLabel="Back to dashboard" />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-akoma-ink">Simple, honest pricing</h1>
          <p className="mt-2 text-akoma-ink/60">
            Free covers real wedding planning. Pro adds BisaAI&apos;s advanced tools and unlimited everything.
          </p>
        </div>
        <PricingCards />
      </main>
    </div>
  );
}

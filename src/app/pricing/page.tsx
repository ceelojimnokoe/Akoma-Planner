// src/app/pricing/page.tsx
//
// Standalone marketing-style page (outside the (app) route group, so no
// sidebar) — reachable both from the public landing page and from the
// sidebar's bottom nav link while inside the app.

import Link from "next/link";
import { PricingCards } from "@/components/pricing/PricingCards";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-akoma-cream">
      <header className="border-b border-akoma-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-akoma-green">
            AkomaPlanner
          </Link>
          <Link href="/dashboard" className="text-sm text-akoma-ink/60 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </header>

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

// src/app/(app)/settings/page.tsx
//
// Account/plan info plus the Export feature. Export doesn't warrant its
// own nav item — it's a couple of download buttons, not a screen you'd
// return to repeatedly — so it lives here alongside the other "about
// your account" info, matching the "generate simple exports" free-tier
// bullet and "more" Pro-tier bullet from the pricing comparison.

import { getCurrentUser, getCurrentWeddingPlan } from "@/lib/session";
import { canAccessPassFeatures } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge, PassBadge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/dates";
import { downgradeToFree } from "@/server/actions/billing";
import { signOut } from "@/server/actions/auth";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const weddingPlan = await getCurrentWeddingPlan();
  // Only ever sourced from a real successful Payment row — a Pass granted
  // via the dev-only stub (no real payment) has hasWeddingPass=true but
  // no such row, and correctly shows no receipt rather than a fabricated one.
  const successfulPayment = canAccessPassFeatures(weddingPlan!)
    ? await prisma.payment.findFirst({
        where: { weddingPlanId: weddingPlan!.id, status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-akoma-ink">Settings</h1>
        <p className="mt-1 text-sm text-akoma-ink/60">Account, plan, and export.</p>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="mb-3 font-semibold text-akoma-ink">Account</h2>
            <p className="text-sm text-akoma-ink">{user.name}</p>
            <p className="text-sm text-akoma-ink/60">{user.email}</p>
            {!user.emailVerified && (
              <LinkButton href="/verify-email" size="sm" variant="ghost" className="mt-2">
                Verify email
              </LinkButton>
            )}
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
        <p className="mt-3 rounded-lg bg-akoma-ink/5 px-3 py-2 text-xs text-akoma-ink/50">
          Sign-up and log-in are real, with secure password storage. Session security is still a simplified
          version of what a full production rollout would use.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-akoma-ink">Profile</h2>
        <p className="text-sm text-akoma-ink/60">
          Partner details, wedding style, planning preferences, and more from your onboarding answers.
        </p>
        <LinkButton href="/profile" size="sm" variant="secondary" className="mt-3">
          Edit profile
        </LinkButton>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-akoma-ink">Wedding</h2>
        <dl className="space-y-1.5 text-sm">
          <Row label="Couple" value={weddingPlan!.coupleNames} />
          <Row label="Date" value={formatDate(weddingPlan!.weddingDate)} />
          <Row label="City" value={weddingPlan!.city.charAt(0) + weddingPlan!.city.slice(1).toLowerCase()} />
          <Row label="Tradition" value={weddingPlan!.tradition} />
          <Row label="Guest estimate" value={String(weddingPlan!.guestEstimate)} />
        </dl>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-akoma-ink/60">Plan:</span>
          {canAccessPassFeatures(weddingPlan!) ? <PassBadge /> : <Badge tone="neutral">Free</Badge>}
          {!canAccessPassFeatures(weddingPlan!) && (
            <LinkButton href="/pricing" size="sm" variant="ghost">
              Get the Wedding Pass
            </LinkButton>
          )}
          {/* Dev-only: a real one-time purchase has no "downgrade" concept —
              this exists purely so a local test account can revisit the
              Free experience without editing the database by hand. */}
          {process.env.NODE_ENV === "development" && canAccessPassFeatures(weddingPlan!) && (
            <form action={downgradeToFree.bind(null, weddingPlan!.id)}>
              <Button type="submit" size="sm" variant="ghost">
                Switch back to Free (dev only)
              </Button>
            </form>
          )}
        </div>
        {successfulPayment && (
          <p className="mt-2 text-xs text-akoma-ink/40">
            Wedding Pass active since {formatDate(successfulPayment.createdAt)}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-akoma-ink">Export</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-akoma-ink">Schedule PDF</p>
              <p className="text-xs text-akoma-ink/50">Your checklist, grouped by category, with due dates.</p>
            </div>
            <LinkButton href="/api/export/schedule-pdf" size="sm" variant="secondary">
              Download
            </LinkButton>
          </div>
          <div className="flex items-center justify-between border-t border-akoma-ink/10 pt-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-akoma-ink">
                Full report PDF <PassBadge />
              </p>
              <p className="text-xs text-akoma-ink/50">Schedule, plus your budget breakdown and guest RSVP summary.</p>
            </div>
            {canAccessPassFeatures(weddingPlan!) ? (
              <LinkButton href="/api/export/full-report-pdf" size="sm" variant="secondary">
                Download
              </LinkButton>
            ) : (
              <LinkButton href="/pricing" size="sm" variant="ghost">
                Get the Wedding Pass
              </LinkButton>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-akoma-ink/50">{label}</dt>
      <dd className="text-akoma-ink">{value}</dd>
    </div>
  );
}

// src/components/vendors/VendorInterestPanel.tsx
//
// The vendor negotiation lifecycle UI: draft -> send -> record quote ->
// approve/decline. This is the component that makes the "draft-and-
// approve, never autonomous" rule visible and concrete — every status
// transition here corresponds to a named server action in
// src/server/actions/vendors.ts, and ACCEPTED only ever happens after a
// confirm() dialog on this exact button.

"use client";

import { useState, useTransition } from "react";
import type { VendorInterest } from "@prisma/client";
import {
  createDraftEnquiry,
  sendVendorMessage,
  recordQuote,
  approveQuote,
  declineQuote,
  getNegotiationDraft,
  sendReminderStub,
} from "@/server/actions/vendors";
import { Button } from "@/components/ui/Button";
import { Badge, MockBadge } from "@/components/ui/Badge";
import { formatGHS } from "@/lib/currency";

export function VendorInterestPanel({
  weddingPlanId,
  vendorId,
  initialInterest,
}: {
  weddingPlanId: string;
  vendorId: string;
  initialInterest: VendorInterest | null;
}) {
  const [interest, setInterest] = useState(initialInterest);
  const [draftText, setDraftText] = useState(initialInterest?.draftMessage ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ctx = { weddingPlanId, vendorId };

  function handleDraft() {
    setError(null);
    startTransition(async () => {
      const result = await createDraftEnquiry(weddingPlanId, vendorId);
      if (!result.ok) return setError(result.error ?? "Couldn't draft a message.");
      // The server action revalidates the page's data, but this component
      // holds its own copy of `interest` for instant UI feedback — refetch
      // via a full reload of this panel's initial state on next render.
      window.location.reload();
    });
  }

  function handleSend() {
    if (!interest) return;
    setError(null);
    startTransition(async () => {
      const result = await sendVendorMessage({ vendorInterestId: interest.id, finalMessage: draftText, ...ctx });
      if (!result.ok) return setError(result.error ?? "Couldn't send.");
      setInterest({ ...interest, status: "SENT", draftMessage: draftText });
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{error}</p>}
      {notice && <p className="rounded-lg bg-akoma-green/10 px-3 py-2 text-sm text-akoma-green">{notice}</p>}

      {!interest && (
        <div>
          <p className="mb-3 text-sm text-akoma-ink/70">No enquiry started with this vendor yet.</p>
          <Button size="sm" disabled={isPending} onClick={handleDraft}>
            {isPending ? "Drafting…" : "Draft an enquiry with BisaAI"}
          </Button>
          <MockBadge className="ml-2" />
        </div>
      )}

      {interest?.status === "DRAFT" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge tone="neutral">Draft — not sent</Badge>
            <MockBadge />
          </div>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-akoma-ink/15 p-3 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
          <p className="text-xs text-akoma-ink/50">Edit this however you like — nothing is sent until you tap Send.</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={handleSend}>
              {isPending ? "Sending…" : "Send"}
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={handleDraft}>
              Regenerate draft
            </Button>
          </div>
        </div>
      )}

      {interest?.status === "SENT" && (
        <SentPanel interest={interest} ctx={ctx} onUpdate={setInterest} onNotice={setNotice} onError={setError} />
      )}

      {interest?.status === "QUOTED" && (
        <QuotedPanel interest={interest} ctx={ctx} onUpdate={setInterest} onNotice={setNotice} onError={setError} />
      )}

      {interest?.status === "ACCEPTED" && (
        <div className="rounded-lg bg-akoma-green/10 p-4">
          <p className="font-medium text-akoma-green">Booked ✓</p>
          {interest.quoteAmountGHS != null && (
            <p className="mt-1 text-sm text-akoma-ink/70">Accepted quote: {formatGHS(interest.quoteAmountGHS)}</p>
          )}
          <p className="mt-2 text-xs text-akoma-ink/50">
            Payment/deposit is handled outside the app — this MVP has no real payment integration (see Pricing page).
          </p>
        </div>
      )}

      {interest?.status === "DECLINED" && (
        <div>
          <Badge tone="terracotta">Declined</Badge>
          <div className="mt-3">
            <Button size="sm" disabled={isPending} onClick={handleDraft}>
              Start a new enquiry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SentPanel({
  interest,
  ctx,
  onUpdate,
  onNotice,
  onError,
}: {
  interest: VendorInterest;
  ctx: { weddingPlanId: string; vendorId: string };
  onUpdate: (i: VendorInterest) => void;
  onNotice: (s: string | null) => void;
  onError: (s: string | null) => void;
}) {
  const [quoteAmountGHS, setQuoteAmountGHS] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRecordQuote(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    startTransition(async () => {
      const amount = Number(quoteAmountGHS);
      const result = await recordQuote({ vendorInterestId: interest.id, quoteAmountGHS: amount, notes, ...ctx });
      if (!result.ok) return onError(result.error ?? "Couldn't save the quote.");
      onUpdate({ ...interest, status: "QUOTED", quoteAmountGHS: amount, notes: notes || null });
    });
  }

  function handleReminder() {
    startTransition(async () => {
      const result = await sendReminderStub({ vendorInterestId: interest.id, ...ctx });
      onNotice(result.message ?? null);
    });
  }

  return (
    <div className="space-y-4">
      <Badge tone="green">Message sent</Badge>
      <p className="whitespace-pre-wrap rounded-lg bg-akoma-ink/5 p-3 text-sm text-akoma-ink/70">{interest.draftMessage}</p>
      <Button size="sm" variant="ghost" disabled={isPending} onClick={handleReminder}>
        Send follow-up reminder
      </Button>

      <form onSubmit={handleRecordQuote} className="space-y-2 border-t border-akoma-ink/10 pt-4">
        <p className="text-sm font-medium text-akoma-ink">Record the quote you received</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            min={0}
            required
            placeholder="Quote amount (GHS)"
            value={quoteAmountGHS}
            onChange={(e) => setQuoteAmountGHS(e.target.value)}
            className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
          <Button type="submit" size="sm" disabled={isPending}>
            Save quote
          </Button>
        </div>
      </form>
    </div>
  );
}

function QuotedPanel({
  interest,
  ctx,
  onUpdate,
  onNotice,
  onError,
}: {
  interest: VendorInterest;
  ctx: { weddingPlanId: string; vendorId: string };
  onUpdate: (i: VendorInterest) => void;
  onNotice: (s: string | null) => void;
  onError: (s: string | null) => void;
}) {
  const [negotiationDraft, setNegotiationDraft] = useState<string | null>(null);
  const [targetGHS, setTargetGHS] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    if (!confirm(`Approve this ${interest.quoteAmountGHS ? formatGHS(interest.quoteAmountGHS) : ""} quote? This confirms the booking.`)) {
      return;
    }
    onError(null);
    startTransition(async () => {
      const result = await approveQuote({ vendorInterestId: interest.id, ...ctx });
      if (!result.ok) return onError(result.error ?? "Couldn't approve.");
      onUpdate({ ...interest, status: "ACCEPTED" });
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineQuote({ vendorInterestId: interest.id, ...ctx });
      if (!result.ok) return onError(result.error ?? "Couldn't update.");
      onUpdate({ ...interest, status: "DECLINED" });
    });
  }

  function handleNegotiationDraft() {
    startTransition(async () => {
      const result = await getNegotiationDraft({
        ...ctx,
        currentQuoteGHS: interest.quoteAmountGHS ?? undefined,
        targetGHS: targetGHS ? Number(targetGHS) : undefined,
      });
      if (!result.ok) return onError(result.error ?? "Couldn't draft a negotiation message.");
      setNegotiationDraft(result.draftMessage ?? null);
    });
  }

  function handleReminder() {
    startTransition(async () => {
      const result = await sendReminderStub({ vendorInterestId: interest.id, ...ctx });
      onNotice(result.message ?? null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge tone="gold">Quote received</Badge>
        {interest.quoteAmountGHS != null && (
          <span className="text-sm font-medium text-akoma-ink">{formatGHS(interest.quoteAmountGHS)}</span>
        )}
      </div>
      {interest.notes && <p className="whitespace-pre-wrap text-sm text-akoma-ink/60">{interest.notes}</p>}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={handleApprove}>
          Approve quote
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={handleDecline}>
          Decline
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={handleReminder}>
          Send follow-up reminder
        </Button>
      </div>

      <div className="border-t border-akoma-ink/10 pt-4">
        <p className="mb-2 text-sm font-medium text-akoma-ink">Want to negotiate? Ask BisaAI to draft a message</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            min={0}
            placeholder="Target price (optional)"
            value={targetGHS}
            onChange={(e) => setTargetGHS(e.target.value)}
            className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
          />
          <Button size="sm" variant="secondary" disabled={isPending} onClick={handleNegotiationDraft}>
            Draft negotiation message
          </Button>
          <MockBadge />
        </div>
        {negotiationDraft && (
          <div className="mt-3 rounded-lg bg-akoma-ink/5 p-3">
            <p className="whitespace-pre-wrap text-sm text-akoma-ink/70">{negotiationDraft}</p>
            <p className="mt-2 text-xs text-akoma-ink/50">
              This is a suggestion only — copy it into WhatsApp, email, or wherever you&apos;re talking to this vendor.
              It isn&apos;t sent from here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

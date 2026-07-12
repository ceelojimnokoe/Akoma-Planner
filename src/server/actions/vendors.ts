// src/server/actions/vendors.ts
//
// Mutations for vendor browsing and the vendor negotiation lifecycle.
// Every action here that touches VendorInterest is gated behind the
// Wedding Pass (vendor messaging/quote-tracking is a Pass tool) and is the ONLY code allowed to
// write that table — lib/bisaai.ts only ever returns drafted text, never
// persists it. Read the comment on each action for exactly which status
// transition it performs; together they implement the "draft-and-approve,
// never autonomous" safety rule end to end:
//
//   createDraftEnquiry   -> creates/resets a row at status DRAFT
//   sendVendorMessage    -> DRAFT       -> SENT     (explicit human tap)
//   recordQuote          -> SENT        -> QUOTED   (couple manually enters what a vendor quoted them)
//   approveQuote         -> QUOTED      -> ACCEPTED (explicit human approval — BisaAI can never do this)
//   declineQuote         -> QUOTED      -> DECLINED
//
// No function in this file calls a bisaai.ts function and writes its
// result anywhere except the draftMessage field of a DRAFT row — nothing
// here can silently move a quote to ACCEPTED.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePass } from "@/lib/plan";
import { draftVendorMessage, draftNegotiationMessage } from "@/lib/bisaai";

async function requirePassForWedding(weddingPlanId: string, featureLabel: string) {
  const weddingPlan = await prisma.weddingPlan.findUniqueOrThrow({ where: { id: weddingPlanId } });
  return requirePass(weddingPlan, featureLabel);
}

/** Creates a fresh DRAFT enquiry (or resets a DECLINED one back to DRAFT
 *  with new text). Refuses to touch an ACCEPTED interest — never
 *  overwrite a confirmed booking. */
export async function createDraftEnquiry(
  weddingPlanId: string,
  vendorId: string
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requirePassForWedding(weddingPlanId, "Vendor messaging");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const existing = await prisma.vendorInterest.findUnique({
    where: { weddingPlanId_vendorId: { weddingPlanId, vendorId } },
  });
  if (existing?.status === "ACCEPTED") {
    return { ok: false, error: "This vendor is already booked — drafting a new enquiry would overwrite that record." };
  }

  const draft = await draftVendorMessage({ weddingPlanId, vendorId });
  if (!draft.ok) return { ok: false, error: draft.error };

  await prisma.vendorInterest.upsert({
    where: { weddingPlanId_vendorId: { weddingPlanId, vendorId } },
    create: { weddingPlanId, vendorId, status: "DRAFT", draftMessage: draft.data.draftMessage },
    update: { status: "DRAFT", draftMessage: draft.data.draftMessage },
  });

  revalidatePath(`/vendors/${vendorId}`);
  return { ok: true };
}

const sendSchema = z.object({ vendorInterestId: z.string().min(1), finalMessage: z.string().trim().min(1) });

/** DRAFT -> SENT. The only transition to SENT anywhere in the app, and it
 *  only ever runs because a person clicked a button — never called from
 *  lib/bisaai.ts. */
export async function sendVendorMessage(input: {
  vendorInterestId: string;
  finalMessage: string;
  weddingPlanId: string;
  vendorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Message can't be empty." };

  const gate = await requirePassForWedding(input.weddingPlanId, "Vendor messaging");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.vendorInterest.update({
    where: { id: parsed.data.vendorInterestId },
    data: { status: "SENT", draftMessage: parsed.data.finalMessage },
  });

  revalidatePath(`/vendors/${input.vendorId}`);
  return { ok: true };
}

const quoteSchema = z.object({
  vendorInterestId: z.string().min(1),
  quoteAmountGHS: z.coerce.number().min(0).max(10_000_000),
  notes: z.string().trim().max(500).optional(),
});

/** SENT -> QUOTED. The couple manually records what a vendor quoted them
 *  (e.g. over a phone call) — nothing here is AI-generated. */
export async function recordQuote(input: {
  vendorInterestId: string;
  quoteAmountGHS: number;
  notes?: string;
  weddingPlanId: string;
  vendorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const gate = await requirePassForWedding(input.weddingPlanId, "Vendor messaging");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.vendorInterest.update({
    where: { id: parsed.data.vendorInterestId },
    data: { status: "QUOTED", quoteAmountGHS: parsed.data.quoteAmountGHS, notes: parsed.data.notes || null },
  });

  revalidatePath(`/vendors/${input.vendorId}`);
  return { ok: true };
}

/** QUOTED -> ACCEPTED. THE explicit human-approval action referenced
 *  throughout this codebase's safety comments — a quote becomes accepted
 *  here and nowhere else, and only because a person tapped this specific
 *  button after seeing a confirm dialog client-side. */
export async function approveQuote(input: {
  vendorInterestId: string;
  weddingPlanId: string;
  vendorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const gate = await requirePassForWedding(input.weddingPlanId, "Vendor messaging");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.vendorInterest.update({ where: { id: input.vendorInterestId }, data: { status: "ACCEPTED" } });
  revalidatePath(`/vendors/${input.vendorId}`);
  return { ok: true };
}

export async function declineQuote(input: {
  vendorInterestId: string;
  weddingPlanId: string;
  vendorId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const gate = await requirePassForWedding(input.weddingPlanId, "Vendor messaging");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  await prisma.vendorInterest.update({ where: { id: input.vendorInterestId }, data: { status: "DECLINED" } });
  revalidatePath(`/vendors/${input.vendorId}`);
  return { ok: true };
}

/** Generates a negotiation message for the couple to read/copy. Purely
 *  transient — the text is returned to the client and never persisted,
 *  so it can never be mistaken for something that was actually sent. */
export async function getNegotiationDraft(input: {
  weddingPlanId: string;
  vendorId: string;
  currentQuoteGHS?: number;
  targetGHS?: number;
  notes?: string;
}): Promise<{ ok: boolean; draftMessage?: string; error?: string }> {
  const gate = await requirePassForWedding(input.weddingPlanId, "Vendor negotiation drafting");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const result = await draftNegotiationMessage(input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, draftMessage: result.data.draftMessage };
}

/** Stubbed reminder — safe rule: never present a stub as a real send.
 *  Appends a visible note so the "save quotes/invoices/notes" Pass tool
 *  has something to show, but does not contact any vendor. */
export async function sendReminderStub(input: {
  vendorInterestId: string;
  weddingPlanId: string;
  vendorId: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  const gate = await requirePassForWedding(input.weddingPlanId, "Vendor reminders");
  if (!gate.allowed) return { ok: false, error: gate.upgradeReason };

  const interest = await prisma.vendorInterest.findUniqueOrThrow({ where: { id: input.vendorInterestId } });
  const stampedNote = `[Reminder stub — no real message sent, ${new Date().toLocaleDateString("en-GH")}]`;
  await prisma.vendorInterest.update({
    where: { id: input.vendorInterestId },
    data: { notes: [interest.notes, stampedNote].filter(Boolean).join("\n") },
  });

  revalidatePath(`/vendors/${input.vendorId}`);
  return { ok: true, message: "Reminder stub logged — no real message was sent (auto-reminders aren't wired up to a real channel yet)." };
}

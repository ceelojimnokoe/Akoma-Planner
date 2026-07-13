// src/server/actions/vendor-booking.ts
//
// The real-world vendor booking tracker — deliberately separate from
// vendors.ts's Pass-gated enquiry/quote lifecycle. setVendorBookingProgress
// is NOT Pass-gated: tracking "where am I with this vendor" must work
// regardless of whether the couple ever used this app's drafting tools
// (a phone call or a WhatsApp chat counts just as much as an in-app
// enquiry — see the philosophy note in prisma/schema.prisma's
// VendorBookingProgress comment). It only ever touches bookingProgress/
// onboardingCategory on VendorInterest — never status, draftMessage, or
// quoteAmountGHS, which stay exclusively owned by vendors.ts.
//
// Two sync helpers keep the rest of the app honest after every
// bookingProgress change: syncVendorBookingStatusMirror re-derives the
// legacy per-category VendorBookingStatus row (Decision 3 — every
// existing read site keeps working unchanged), and
// syncChecklistFromVendorBooking auto-completes the matching default
// checklist item(s) (Decision 4 — one-directional only, never reopens;
// see checklist-defaults.ts's ONBOARDING_CATEGORY_CHECKLIST_TITLES).

"use server";

import { revalidatePath } from "next/cache";
import type { OnboardingVendorCategory, VendorBookingProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveCategoryBookingStatus, guessOnboardingCategory } from "@/lib/vendor-booking-progress";
import { ONBOARDING_CATEGORY_CHECKLIST_TITLES } from "@/lib/checklist-defaults";

export interface SetBookingProgressResult {
  ok: boolean;
  error?: string;
  conflict?: { vendorId: string; vendorName: string };
}

async function syncVendorBookingStatusMirror(weddingPlanId: string, category: OnboardingVendorCategory) {
  const interests = await prisma.vendorInterest.findMany({
    where: { weddingPlanId, onboardingCategory: category },
    select: { bookingProgress: true },
  });
  const status = deriveCategoryBookingStatus(interests.map((i) => i.bookingProgress));
  await prisma.vendorBookingStatus.upsert({
    where: { weddingPlanId_category: { weddingPlanId, category } },
    create: { weddingPlanId, category, status },
    update: { status },
  });
}

async function syncChecklistFromVendorBooking(weddingPlanId: string, category: OnboardingVendorCategory) {
  const titles = ONBOARDING_CATEGORY_CHECKLIST_TITLES[category];
  if (!titles || titles.length === 0) return;

  const bookedCount = await prisma.vendorInterest.count({
    where: { weddingPlanId, onboardingCategory: category, bookingProgress: "BOOKED" },
  });
  if (bookedCount === 0) return; // one-directional — never reopens a completed item

  await prisma.checklistItem.updateMany({
    where: { weddingPlanId, isDefault: true, title: { in: titles }, done: false },
    data: { done: true },
  });
}

async function syncCategory(weddingPlanId: string, category: OnboardingVendorCategory) {
  await syncVendorBookingStatusMirror(weddingPlanId, category);
  await syncChecklistFromVendorBooking(weddingPlanId, category);
}

/** The one action behind every status control in the new Vendor Status
 *  UI — segmented control, category dropdown, booking-confirmation and
 *  replace-vendor dialogs all call this. Deliberately not Pass-gated. */
export async function setVendorBookingProgress(
  weddingPlanId: string,
  vendorId: string,
  progress: VendorBookingProgress,
  options?: { onboardingCategory?: OnboardingVendorCategory | null; confirmReplace?: boolean }
): Promise<SetBookingProgressResult> {
  const [vendor, existing] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } }),
    prisma.vendorInterest.findUnique({ where: { weddingPlanId_vendorId: { weddingPlanId, vendorId } } }),
  ]);

  const previousCategory = existing?.onboardingCategory ?? null;
  const effectiveCategory =
    options?.onboardingCategory !== undefined
      ? options.onboardingCategory
      : (previousCategory ?? guessOnboardingCategory(vendor.category));

  if (progress === "BOOKED" && effectiveCategory) {
    const conflict = await prisma.vendorInterest.findFirst({
      where: { weddingPlanId, onboardingCategory: effectiveCategory, bookingProgress: "BOOKED", vendorId: { not: vendorId } },
      include: { vendor: true },
      orderBy: { updatedAt: "desc" },
    });
    if (conflict && !options?.confirmReplace) {
      return { ok: false, conflict: { vendorId: conflict.vendorId, vendorName: conflict.vendor.name } };
    }
    if (conflict) {
      await prisma.$transaction([
        prisma.vendorInterest.updateMany({
          where: { weddingPlanId, onboardingCategory: effectiveCategory, bookingProgress: "BOOKED", vendorId: { not: vendorId } },
          data: { bookingProgress: "NOT_SELECTED" },
        }),
        prisma.vendorInterest.upsert({
          where: { weddingPlanId_vendorId: { weddingPlanId, vendorId } },
          create: { weddingPlanId, vendorId, bookingProgress: progress, onboardingCategory: effectiveCategory },
          update: { bookingProgress: progress, onboardingCategory: effectiveCategory },
        }),
      ]);
    } else {
      await prisma.vendorInterest.upsert({
        where: { weddingPlanId_vendorId: { weddingPlanId, vendorId } },
        create: { weddingPlanId, vendorId, bookingProgress: progress, onboardingCategory: effectiveCategory },
        update: { bookingProgress: progress, onboardingCategory: effectiveCategory },
      });
    }
  } else {
    await prisma.vendorInterest.upsert({
      where: { weddingPlanId_vendorId: { weddingPlanId, vendorId } },
      create: { weddingPlanId, vendorId, bookingProgress: progress, onboardingCategory: effectiveCategory },
      update: { bookingProgress: progress, onboardingCategory: effectiveCategory },
    });
  }

  if (effectiveCategory) await syncCategory(weddingPlanId, effectiveCategory);
  if (previousCategory && previousCategory !== effectiveCategory) await syncCategory(weddingPlanId, previousCategory);

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/dashboard");
  revalidatePath("/checklist");
  return { ok: true };
}

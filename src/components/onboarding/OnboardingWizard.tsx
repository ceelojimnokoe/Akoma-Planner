// src/components/onboarding/OnboardingWizard.tsx
//
// Nine-step version of what used to be a single-page form (see git history
// for the old OnboardingForm.tsx). State for every field lives here, in one
// object, for the whole wizard's lifetime — each step component just reads
// a slice of it and calls `update`. Nothing is sent to the server until the
// final step, same "one atomic submit" shape createWeddingPlan already had.
//
// The progress bar follows the project's established "meter" convention
// (see ProgressRing.tsx/BudgetProgressBar.tsx): one hue for the filled
// portion, the same hue at low opacity for the track.

"use client";

import { useState, useTransition } from "react";
import { createWeddingPlan, type CreateWeddingPlanResult } from "@/server/actions/wedding";
import type { OnboardingInput } from "@/lib/validation/wedding";
import { emptyOnboardingForm, type OnboardingFormData } from "@/components/onboarding/onboarding-types";
import { CoupleInfoStep } from "@/components/onboarding/steps/CoupleInfoStep";
import { WeddingDetailsStep } from "@/components/onboarding/steps/WeddingDetailsStep";
import { GuestInfoStep } from "@/components/onboarding/steps/GuestInfoStep";
import { BudgetStep } from "@/components/onboarding/steps/BudgetStep";
import { StyleStep } from "@/components/onboarding/steps/StyleStep";
import { PreferencesStep } from "@/components/onboarding/steps/PreferencesStep";
import { VendorStatusStep } from "@/components/onboarding/steps/VendorStatusStep";
import { RelationshipStep } from "@/components/onboarding/steps/RelationshipStep";
import { NotesStep } from "@/components/onboarding/steps/NotesStep";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STEPS: Array<{
  title: string;
  description: string;
  Component: typeof CoupleInfoStep;
  isValid: (form: OnboardingFormData) => boolean;
}> = [
  { title: "Couple Information", description: "Who's getting married?", Component: CoupleInfoStep, isValid: (f) => f.coupleNames.trim().length >= 2 },
  { title: "Wedding Details", description: "When and where.", Component: WeddingDetailsStep, isValid: (f) => f.weddingDate !== "" && f.tradition.trim().length >= 2 },
  { title: "Guest Information", description: "Roughly how many people.", Component: GuestInfoStep, isValid: (f) => f.guestEstimate !== "" && Number(f.guestEstimate) >= 1 },
  { title: "Budget", description: "Your working total, in GHS.", Component: BudgetStep, isValid: (f) => f.totalBudgetGHS !== "" && Number(f.totalBudgetGHS) >= 0 },
  { title: "Wedding Style", description: "Theme, colors, vision — all optional.", Component: StyleStep, isValid: () => true },
  { title: "Planning Preferences", description: "How you like to plan, and how BisaAI should help.", Component: PreferencesStep, isValid: () => true },
  { title: "Vendor Status", description: "What's already booked, if anything.", Component: VendorStatusStep, isValid: () => true },
  { title: "Relationship", description: "Your story, if you'd like to share it.", Component: RelationshipStep, isValid: () => true },
  { title: "Additional Notes", description: "Anything else we should know.", Component: NotesStep, isValid: () => true },
];

export function OnboardingWizard({ prefillName }: { prefillName?: string }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>(() => emptyOnboardingForm(prefillName));
  const [result, setResult] = useState<CreateWeddingPlanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const percent = ((step + 1) / STEPS.length) * 100;

  function goNext() {
    if (!current.isValid(form)) return;
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSubmit() {
    setResult(null);
    startTransition(async () => {
      const input: OnboardingInput = {
        ...form,
        weddingDate: form.weddingDate as unknown as Date,
        guestEstimate: form.guestEstimate as unknown as number,
        totalBudgetGHS: form.totalBudgetGHS as unknown as number,
        bridalPartySize: form.bridalPartySize ? (form.bridalPartySize as unknown as number) : undefined,
        groomPartySize: form.groomPartySize ? (form.groomPartySize as unknown as number) : undefined,
        vendorStatus: form.vendorStatus as OnboardingInput["vendorStatus"],
      };
      const response = await createWeddingPlan(input);
      // On success the action redirects server-side and this line never runs.
      setResult(response);
    });
  }

  const StepComponent = current.Component;

  return (
    <Card className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-akoma-ink">
            Step {step + 1} of {STEPS.length}: {current.title}
          </span>
          <span className="text-akoma-ink/50">{Math.round(percent)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-akoma-green/15">
          <div className="h-full rounded-full bg-akoma-green transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-sm text-akoma-ink/60">{current.description}</p>
      </div>

      <StepComponent form={form} update={update} errors={result?.fieldErrors} />

      {result?.error && (
        <p className="mt-4 rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || isPending}>
          Back
        </Button>
        <Button type="button" onClick={goNext} disabled={!current.isValid(form) || isPending}>
          {isPending ? "Creating your wedding plan…" : isLastStep ? "Finish" : "Next"}
        </Button>
      </div>
    </Card>
  );
}

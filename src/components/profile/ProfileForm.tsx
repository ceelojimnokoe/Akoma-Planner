// src/components/profile/ProfileForm.tsx
//
// Editable view of everything the onboarding wizard collects onto
// CoupleProfile (not the core WeddingPlan fields — those are on
// /settings — and not vendor-booking status, which lives on /vendors).
// One page, grouped into the same sections as the wizard, single submit.

"use client";

import { useState, useTransition } from "react";
import type { CoupleProfile } from "@prisma/client";
import { updateCoupleProfile, type UpdateCoupleProfileResult } from "@/server/actions/profile";
import type { CoupleProfileInput } from "@/lib/validation/profile";
import { toDateInputValue } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ColorPaletteField } from "@/components/onboarding/ColorPaletteField";

type FormState = {
  [K in keyof CoupleProfileInput]: CoupleProfileInput[K] extends boolean | undefined ? boolean : string;
};

function toFormState(profile: CoupleProfile | null): FormState {
  return {
    partner1Name: profile?.partner1Name ?? "",
    partner2Name: profile?.partner2Name ?? "",
    displayName1: profile?.displayName1 ?? "",
    displayName2: profile?.displayName2 ?? "",
    partner1Phone: profile?.partner1Phone ?? "",
    partner2Phone: profile?.partner2Phone ?? "",
    partner2Email: profile?.partner2Email ?? "",
    ceremonyDate: profile?.ceremonyDate ? toDateInputValue(profile.ceremonyDate) : "",
    receptionDate: profile?.receptionDate ? toDateInputValue(profile.receptionDate) : "",
    venueName: profile?.venueName ?? "",
    indoorOutdoor: profile?.indoorOutdoor ?? "",
    weddingType: profile?.weddingType ?? "",
    bridalPartySize: profile?.bridalPartySize != null ? String(profile.bridalPartySize) : "",
    groomPartySize: profile?.groomPartySize != null ? String(profile.groomPartySize) : "",
    budgetFlexibility: profile?.budgetFlexibility ?? "",
    isDiaspora: profile?.isDiaspora ?? false,
    theme: profile?.theme ?? "",
    primaryColor: profile?.primaryColor ?? "",
    secondaryColor: profile?.secondaryColor ?? "",
    dressCode: profile?.dressCode ?? "",
    visionNotes: profile?.visionNotes ?? "",
    pinterestUrl: profile?.pinterestUrl ?? "",
    biggestConcern: profile?.biggestConcern ?? "",
    planningExperience: profile?.planningExperience ?? "",
    diyVsProfessional: profile?.diyVsProfessional ?? "",
    needVendorRecommendations: profile?.needVendorRecommendations ?? true,
    needTimelineAssistance: profile?.needTimelineAssistance ?? true,
    communicationStyle: profile?.communicationStyle ?? "",
    proposalDate: profile?.proposalDate ? toDateInputValue(profile.proposalDate) : "",
    engagementDate: profile?.engagementDate ? toDateInputValue(profile.engagementDate) : "",
    loveStory: profile?.loveStory ?? "",
    specialRequests: profile?.specialRequests ?? "",
    accessibilityRequirements: profile?.accessibilityRequirements ?? "",
    culturalReligiousRequirements: profile?.culturalReligiousRequirements ?? "",
  } as FormState;
}

export function ProfileForm({ profile }: { profile: CoupleProfile | null }) {
  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [result, setResult] = useState<UpdateCoupleProfileResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await updateCoupleProfile({
        ...form,
        bridalPartySize: form.bridalPartySize ? (form.bridalPartySize as unknown as number) : undefined,
        groomPartySize: form.groomPartySize ? (form.groomPartySize as unknown as number) : undefined,
      } as unknown as CoupleProfileInput);
      setResult(response);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Couple information</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Partner 1 name">
            <Input value={form.partner1Name} onChange={(e) => update("partner1Name", e.target.value)} />
          </Field>
          <Field label="Partner 2 name">
            <Input value={form.partner2Name} onChange={(e) => update("partner2Name", e.target.value)} />
          </Field>
          <Field label="Display name 1">
            <Input value={form.displayName1} onChange={(e) => update("displayName1", e.target.value)} />
          </Field>
          <Field label="Display name 2">
            <Input value={form.displayName2} onChange={(e) => update("displayName2", e.target.value)} />
          </Field>
          <Field label="Partner 1 phone">
            <Input type="tel" value={form.partner1Phone} onChange={(e) => update("partner1Phone", e.target.value)} />
          </Field>
          <Field label="Partner 2 phone">
            <Input type="tel" value={form.partner2Phone} onChange={(e) => update("partner2Phone", e.target.value)} />
          </Field>
          <Field label="Partner 2 email" error={result?.fieldErrors?.partner2Email}>
            <Input type="email" value={form.partner2Email} onChange={(e) => update("partner2Email", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Wedding details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ceremony date">
            <Input type="date" value={form.ceremonyDate} onChange={(e) => update("ceremonyDate", e.target.value)} />
          </Field>
          <Field label="Reception date">
            <Input type="date" value={form.receptionDate} onChange={(e) => update("receptionDate", e.target.value)} />
          </Field>
          <Field label="Venue">
            <Input value={form.venueName} onChange={(e) => update("venueName", e.target.value)} />
          </Field>
          <Field label="Indoor / outdoor">
            <Select value={form.indoorOutdoor} onChange={(e) => update("indoorOutdoor", e.target.value)}>
              <option value="">Not sure yet</option>
              <option value="INDOOR">Indoor</option>
              <option value="OUTDOOR">Outdoor</option>
              <option value="BOTH">Both</option>
            </Select>
          </Field>
          <Field label="Wedding type">
            <Select value={form.weddingType} onChange={(e) => update("weddingType", e.target.value)}>
              <option value="">Not sure yet</option>
              <option value="TRADITIONAL">Traditional</option>
              <option value="WHITE_WEDDING">White wedding</option>
              <option value="CIVIL">Civil</option>
              <option value="DESTINATION">Destination</option>
              <option value="MULTIPLE_CEREMONIES">Multiple ceremonies</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Guests</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bridal party size">
            <Input type="number" min={0} value={form.bridalPartySize} onChange={(e) => update("bridalPartySize", e.target.value)} />
          </Field>
          <Field label="Groom's party size">
            <Input type="number" min={0} value={form.groomPartySize} onChange={(e) => update("groomPartySize", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Budget</h2>
        <div className="space-y-4">
          <Field label="Budget flexibility">
            <Select value={form.budgetFlexibility} onChange={(e) => update("budgetFlexibility", e.target.value)}>
              <option value="">Not sure yet</option>
              <option value="STRICT">Strict — this is the ceiling</option>
              <option value="SOMEWHAT_FLEXIBLE">Somewhat flexible</option>
              <option value="VERY_FLEXIBLE">Very flexible</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-akoma-ink">
            <input
              type="checkbox"
              checked={form.isDiaspora}
              onChange={(e) => update("isDiaspora", e.target.checked)}
              className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
            />
            We&apos;re planning this wedding from abroad
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Wedding style</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Theme">
              <Input value={form.theme} onChange={(e) => update("theme", e.target.value)} />
            </Field>
            <Field label="Dress code">
              <Input value={form.dressCode} onChange={(e) => update("dressCode", e.target.value)} />
            </Field>
          </div>
          <ColorPaletteField
            primaryColor={form.primaryColor}
            secondaryColor={form.secondaryColor}
            onPrimaryChange={(hex) => update("primaryColor", hex)}
            onSecondaryChange={(hex) => update("secondaryColor", hex)}
          />
          <Field label="Vision or inspiration">
            <Textarea value={form.visionNotes} onChange={(e) => update("visionNotes", e.target.value)} />
          </Field>
          <Field label="Pinterest board" error={result?.fieldErrors?.pinterestUrl}>
            <Input type="url" value={form.pinterestUrl} onChange={(e) => update("pinterestUrl", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Planning preferences</h2>
        <div className="space-y-4">
          <Field label="Biggest planning concern">
            <Textarea value={form.biggestConcern} onChange={(e) => update("biggestConcern", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Planning experience">
              <Select value={form.planningExperience} onChange={(e) => update("planningExperience", e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="FIRST_TIME">First time planning a wedding</option>
                <option value="PLANNED_BEFORE">I&apos;ve planned one before</option>
                <option value="HIRING_A_PLANNER">We&apos;re hiring a planner</option>
              </Select>
            </Field>
            <Field label="DIY vs. professional">
              <Select value={form.diyVsProfessional} onChange={(e) => update("diyVsProfessional", e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="MOSTLY_DIY">Mostly DIY</option>
                <option value="MOSTLY_PROFESSIONAL">Mostly professional vendors</option>
                <option value="A_MIX">A mix of both</option>
              </Select>
            </Field>
          </div>
          <Field label="How BisaAI should communicate with you">
            <Select value={form.communicationStyle} onChange={(e) => update("communicationStyle", e.target.value)}>
              <option value="">No preference</option>
              <option value="DETAILED_EXPLANATIONS">Detailed explanations</option>
              <option value="QUICK_SUMMARIES">Quick summaries</option>
              <option value="WEEKLY_CHECK_IN">A weekly check-in</option>
            </Select>
          </Field>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-akoma-ink">
              <input
                type="checkbox"
                checked={form.needVendorRecommendations}
                onChange={(e) => update("needVendorRecommendations", e.target.checked)}
                className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
              />
              I&apos;d like vendor recommendations
            </label>
            <label className="flex items-center gap-2 text-sm text-akoma-ink">
              <input
                type="checkbox"
                checked={form.needTimelineAssistance}
                onChange={(e) => update("needTimelineAssistance", e.target.checked)}
                className="h-4 w-4 rounded border-akoma-ink/30 text-akoma-green focus:ring-akoma-green"
              />
              I&apos;d like help building a timeline
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Relationship</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Proposal date">
              <Input type="date" value={form.proposalDate} onChange={(e) => update("proposalDate", e.target.value)} />
            </Field>
            <Field label="Engagement date">
              <Input type="date" value={form.engagementDate} onChange={(e) => update("engagementDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Your love story">
            <Textarea value={form.loveStory} onChange={(e) => update("loveStory", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-akoma-ink">Additional notes</h2>
        <div className="space-y-4">
          <Field label="Special requests">
            <Textarea value={form.specialRequests} onChange={(e) => update("specialRequests", e.target.value)} />
          </Field>
          <Field label="Accessibility requirements">
            <Textarea
              value={form.accessibilityRequirements}
              onChange={(e) => update("accessibilityRequirements", e.target.value)}
            />
          </Field>
          <Field label="Religious / cultural requirements">
            <Textarea
              value={form.culturalReligiousRequirements}
              onChange={(e) => update("culturalReligiousRequirements", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {result?.error && (
        <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
      )}
      {result?.ok && (
        <p className="rounded-lg bg-akoma-green/10 px-3 py-2 text-sm text-akoma-green">Saved.</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

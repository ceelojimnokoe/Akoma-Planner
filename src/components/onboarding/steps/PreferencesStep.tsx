// src/components/onboarding/steps/PreferencesStep.tsx

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const EXPERIENCE_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "FIRST_TIME", label: "First time planning a wedding" },
  { value: "PLANNED_BEFORE", label: "I've planned one before" },
  { value: "HIRING_A_PLANNER", label: "We're hiring a planner" },
] as const;

const DIY_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "MOSTLY_DIY", label: "Mostly DIY" },
  { value: "MOSTLY_PROFESSIONAL", label: "Mostly professional vendors" },
  { value: "A_MIX", label: "A mix of both" },
] as const;

const COMMUNICATION_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "DETAILED_EXPLANATIONS", label: "Detailed explanations" },
  { value: "QUICK_SUMMARIES", label: "Quick summaries" },
  { value: "WEEKLY_CHECK_IN", label: "A weekly check-in" },
] as const;

export function PreferencesStep({ form, update }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="What's your biggest planning concern right now? (optional)">
        <Textarea
          placeholder="e.g. Coordinating both families' schedules"
          value={form.biggestConcern}
          onChange={(e) => update("biggestConcern", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Planning experience">
          <Select
            value={form.planningExperience}
            onChange={(e) => update("planningExperience", e.target.value as typeof form.planningExperience)}
          >
            {EXPERIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="DIY vs. professional">
          <Select
            value={form.diyVsProfessional}
            onChange={(e) => update("diyVsProfessional", e.target.value as typeof form.diyVsProfessional)}
          >
            {DIY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="How would you like BisaAI to communicate with you?">
        <Select
          value={form.communicationStyle}
          onChange={(e) => update("communicationStyle", e.target.value as typeof form.communicationStyle)}
        >
          {COMMUNICATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
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
  );
}

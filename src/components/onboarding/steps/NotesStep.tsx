// src/components/onboarding/steps/NotesStep.tsx

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";

export function NotesStep({ form, update }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="Special requests (optional)">
        <Textarea value={form.specialRequests} onChange={(e) => update("specialRequests", e.target.value)} />
      </Field>
      <Field label="Accessibility requirements (optional)">
        <Textarea
          value={form.accessibilityRequirements}
          onChange={(e) => update("accessibilityRequirements", e.target.value)}
        />
      </Field>
      <Field label="Religious / cultural requirements (optional)">
        <Textarea
          value={form.culturalReligiousRequirements}
          onChange={(e) => update("culturalReligiousRequirements", e.target.value)}
        />
      </Field>
    </div>
  );
}

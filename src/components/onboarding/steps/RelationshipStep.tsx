// src/components/onboarding/steps/RelationshipStep.tsx

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export function RelationshipStep({ form, update }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Proposal date (optional)">
          <Input type="date" value={form.proposalDate} onChange={(e) => update("proposalDate", e.target.value)} />
        </Field>
        <Field label="Engagement date (optional)">
          <Input type="date" value={form.engagementDate} onChange={(e) => update("engagementDate", e.target.value)} />
        </Field>
      </div>

      <Field label="Your love story (optional)" hint="A couple of sentences — BisaAI can use this for personalized touches">
        <Textarea value={form.loveStory} onChange={(e) => update("loveStory", e.target.value)} />
      </Field>
    </div>
  );
}

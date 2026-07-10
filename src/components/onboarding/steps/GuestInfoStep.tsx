// src/components/onboarding/steps/GuestInfoStep.tsx

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export function GuestInfoStep({ form, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="Estimated guest count" error={errors?.guestEstimate}>
        <Input
          type="number"
          required
          min={1}
          placeholder="250"
          value={form.guestEstimate}
          onChange={(e) => update("guestEstimate", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Bridal party size (optional)">
          <Input
            type="number"
            min={0}
            placeholder="6"
            value={form.bridalPartySize}
            onChange={(e) => update("bridalPartySize", e.target.value)}
          />
        </Field>
        <Field label="Groom's party size (optional)">
          <Input
            type="number"
            min={0}
            placeholder="6"
            value={form.groomPartySize}
            onChange={(e) => update("groomPartySize", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

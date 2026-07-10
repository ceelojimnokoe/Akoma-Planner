// src/components/onboarding/steps/CoupleInfoStep.tsx

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export function CoupleInfoStep({ form, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="How should we refer to you as a couple?" error={errors?.coupleNames}>
        <Input
          required
          placeholder="Ama & Kwame"
          value={form.coupleNames}
          onChange={(e) => update("coupleNames", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Partner 1 name">
          <Input
            placeholder="Ama Owusu"
            value={form.partner1Name}
            onChange={(e) => update("partner1Name", e.target.value)}
          />
        </Field>
        <Field label="Partner 2 name">
          <Input
            placeholder="Kwame Boateng"
            value={form.partner2Name}
            onChange={(e) => update("partner2Name", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Preferred display name (Partner 1)" hint="What we'll call you around the app">
          <Input placeholder="Ama" value={form.displayName1} onChange={(e) => update("displayName1", e.target.value)} />
        </Field>
        <Field label="Preferred display name (Partner 2)">
          <Input placeholder="Kwame" value={form.displayName2} onChange={(e) => update("displayName2", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Partner 1 phone (optional)">
          <Input
            type="tel"
            placeholder="0244000000"
            value={form.partner1Phone}
            onChange={(e) => update("partner1Phone", e.target.value)}
          />
        </Field>
        <Field label="Partner 2 phone (optional)">
          <Input
            type="tel"
            placeholder="0244000001"
            value={form.partner2Phone}
            onChange={(e) => update("partner2Phone", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Partner 2 email (optional)" hint="Your own email is already on your account" error={errors?.partner2Email}>
        <Input
          type="email"
          placeholder="kwame@example.com"
          value={form.partner2Email}
          onChange={(e) => update("partner2Email", e.target.value)}
        />
      </Field>
    </div>
  );
}

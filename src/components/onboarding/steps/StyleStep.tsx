// src/components/onboarding/steps/StyleStep.tsx

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export function StyleStep({ form, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Theme">
          <Input placeholder="Garden Romance" value={form.theme} onChange={(e) => update("theme", e.target.value)} />
        </Field>
        <Field label="Dress code">
          <Input
            placeholder="Formal, with kente accents"
            value={form.dressCode}
            onChange={(e) => update("dressCode", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Color palette" hint="e.g. Gold, Ivory, Forest Green">
        <Input value={form.colorPalette} onChange={(e) => update("colorPalette", e.target.value)} />
      </Field>

      <Field label="Vision or inspiration (optional)">
        <Textarea
          placeholder="What feeling are you going for?"
          value={form.visionNotes}
          onChange={(e) => update("visionNotes", e.target.value)}
        />
      </Field>

      <Field label="Pinterest board (optional)" error={errors?.pinterestUrl}>
        <Input
          type="url"
          placeholder="https://pinterest.com/..."
          value={form.pinterestUrl}
          onChange={(e) => update("pinterestUrl", e.target.value)}
        />
      </Field>
    </div>
  );
}

// src/components/onboarding/steps/WeddingDetailsStep.tsx

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const CITY_OPTIONS = [
  { value: "ACCRA", label: "Accra" },
  { value: "KUMASI", label: "Kumasi" },
  { value: "OTHER", label: "Other" },
] as const;

const INDOOR_OUTDOOR_OPTIONS = [
  { value: "", label: "Not sure yet" },
  { value: "INDOOR", label: "Indoor" },
  { value: "OUTDOOR", label: "Outdoor" },
  { value: "BOTH", label: "Both" },
] as const;

const WEDDING_TYPE_OPTIONS = [
  { value: "", label: "Not sure yet" },
  { value: "TRADITIONAL", label: "Traditional" },
  { value: "WHITE_WEDDING", label: "White wedding" },
  { value: "CIVIL", label: "Civil" },
  { value: "DESTINATION", label: "Destination" },
  { value: "MULTIPLE_CEREMONIES", label: "Multiple ceremonies" },
] as const;

export function WeddingDetailsStep({ form, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tentative wedding date" error={errors?.weddingDate}>
          <Input type="date" required value={form.weddingDate} onChange={(e) => update("weddingDate", e.target.value)} />
        </Field>
        <Field label="Location" error={errors?.city}>
          <Select value={form.city} onChange={(e) => update("city", e.target.value as typeof form.city)}>
            {CITY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Ceremony date (optional)" hint="If different from the date above">
          <Input type="date" value={form.ceremonyDate} onChange={(e) => update("ceremonyDate", e.target.value)} />
        </Field>
        <Field label="Reception date (optional)">
          <Input type="date" value={form.receptionDate} onChange={(e) => update("receptionDate", e.target.value)} />
        </Field>
      </div>

      <Field label="Venue (if known)">
        <Input
          placeholder="La Beach Gardens, Accra"
          value={form.venueName}
          onChange={(e) => update("venueName", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Indoor or outdoor?">
          <Select value={form.indoorOutdoor} onChange={(e) => update("indoorOutdoor", e.target.value as typeof form.indoorOutdoor)}>
            {INDOOR_OUTDOOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Wedding type">
          <Select value={form.weddingType} onChange={(e) => update("weddingType", e.target.value as typeof form.weddingType)}>
            {WEDDING_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Tradition / cultural group" hint='e.g. "Akan", "Ewe", "Interfaith"' error={errors?.tradition}>
        <Input required value={form.tradition} onChange={(e) => update("tradition", e.target.value)} />
      </Field>
    </div>
  );
}

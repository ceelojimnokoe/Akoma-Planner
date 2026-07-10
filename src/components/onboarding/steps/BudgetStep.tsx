// src/components/onboarding/steps/BudgetStep.tsx
//
// isDiaspora stands in for the "Currency" question from the original spec
// — AkomaPlanner is deliberately GHS-only (lib/currency.ts), so instead of
// a currency picker this just flags a couple planning/budgeting from
// abroad, for BisaAI/future features to take into account.

import type { StepProps } from "@/components/onboarding/onboarding-types";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const FLEXIBILITY_OPTIONS = [
  { value: "", label: "Not sure yet" },
  { value: "STRICT", label: "Strict — this is the ceiling" },
  { value: "SOMEWHAT_FLEXIBLE", label: "Somewhat flexible" },
  { value: "VERY_FLEXIBLE", label: "Very flexible" },
] as const;

export function BudgetStep({ form, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="Total budget (GHS)" error={errors?.totalBudgetGHS}>
        <Input
          type="number"
          required
          min={0}
          placeholder="120000"
          value={form.totalBudgetGHS}
          onChange={(e) => update("totalBudgetGHS", e.target.value)}
        />
      </Field>

      <Field label="How flexible is this budget?">
        <Select
          value={form.budgetFlexibility}
          onChange={(e) => update("budgetFlexibility", e.target.value as typeof form.budgetFlexibility)}
        >
          {FLEXIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
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
  );
}

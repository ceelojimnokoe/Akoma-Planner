// src/components/onboarding/OnboardingForm.tsx
//
// The wedding setup form. A Client Component because it needs local state
// for the controlled inputs and pending/error UI — but the actual create
// logic lives entirely in the createWeddingPlan Server Action; this
// component just collects input and reports what the server said back.

"use client";

import { useState, useTransition } from "react";
import { createWeddingPlan, type CreateWeddingPlanResult } from "@/server/actions/wedding";
import type { WeddingSetupInput } from "@/lib/validation/wedding";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const CITY_OPTIONS = [
  { value: "ACCRA", label: "Accra" },
  { value: "KUMASI", label: "Kumasi" },
  { value: "OTHER", label: "Other" },
] as const;

const emptyForm = {
  coupleNames: "",
  weddingDate: "",
  city: "ACCRA" as WeddingSetupInput["city"],
  guestEstimate: "",
  tradition: "",
  totalBudgetGHS: "",
};

export function OnboardingForm() {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<CreateWeddingPlanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await createWeddingPlan({
        coupleNames: form.coupleNames,
        // Coerced to Date by the zod schema server-side; a plain string is fine to send.
        weddingDate: form.weddingDate as unknown as Date,
        city: form.city,
        guestEstimate: form.guestEstimate as unknown as number,
        tradition: form.tradition,
        totalBudgetGHS: form.totalBudgetGHS as unknown as number,
      });
      // On success the action redirects server-side and this line never
      // runs; we only ever reach here with a failure result.
      setResult(response);
    });
  }

  return (
    <Card className="mx-auto max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Couple's names" error={result?.fieldErrors?.coupleNames}>
          <input
            type="text"
            required
            placeholder="Ama & Kwame"
            value={form.coupleNames}
            onChange={(e) => update("coupleNames", e.target.value)}
            className={inputClasses}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Wedding date" error={result?.fieldErrors?.weddingDate}>
            <input
              type="date"
              required
              value={form.weddingDate}
              onChange={(e) => update("weddingDate", e.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="City" error={result?.fieldErrors?.city}>
            <select
              value={form.city}
              onChange={(e) => update("city", e.target.value as WeddingSetupInput["city"])}
              className={inputClasses}
            >
              {CITY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Guest estimate" error={result?.fieldErrors?.guestEstimate}>
            <input
              type="number"
              required
              min={1}
              placeholder="250"
              value={form.guestEstimate}
              onChange={(e) => update("guestEstimate", e.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Tradition / side" error={result?.fieldErrors?.tradition}>
            <input
              type="text"
              required
              placeholder="Akan, Ewe, Interfaith…"
              value={form.tradition}
              onChange={(e) => update("tradition", e.target.value)}
              className={inputClasses}
            />
          </Field>
        </div>

        <Field label="Total budget (GHS)" error={result?.fieldErrors?.totalBudgetGHS}>
          <input
            type="number"
            required
            min={0}
            placeholder="120000"
            value={form.totalBudgetGHS}
            onChange={(e) => update("totalBudgetGHS", e.target.value)}
            className={inputClasses}
          />
        </Field>

        {result?.error && !result.fieldErrors && (
          <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creating your wedding plan…" : "Create my wedding plan"}
        </Button>
      </form>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-akoma-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-akoma-terracotta">{error}</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green";

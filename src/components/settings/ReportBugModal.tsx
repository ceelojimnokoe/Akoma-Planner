// src/components/settings/ReportBugModal.tsx
//
// Settings' "Report a bug" flow. The form only ever mounts once the modal
// is opened (Modal.tsx returns null while closed) — nothing here is part
// of the server-rendered Settings page itself, so there's no hydration
// surface to worry about, same reasoning as ImportGuestsModal.tsx.
//
// Technical context sent alongside the form (current route, browser user
// agent, app environment/version) is gathered here client-side where it
// can only be observed client-side (the route, the UA as a fallback) —
// everything else (userId, a second UA reading from the request header,
// environment, app version) is derived server-side in
// server/actions/bug-reports.ts instead of trusted from this component.
// Nothing here ever touches secrets, tokens, cookies, or payment data.

"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitBugReport, type SubmitBugReportResult } from "@/server/actions/bug-reports";
import { BUG_SEVERITIES, type BugReportInput } from "@/lib/validation/bug-report";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

const SEVERITY_LABEL: Record<(typeof BUG_SEVERITIES)[number], string> = {
  MINOR: "Minor — cosmetic or barely noticeable",
  MODERATE: "Moderate — annoying but there's a workaround",
  MAJOR: "Major — a feature doesn't work",
  BLOCKING: "Blocking — can't use the app at all",
};

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

type FormState = Omit<BugReportInput, "screenshotUrl" | "route" | "weddingPlanId">;

function emptyForm(contactEmail: string): FormState {
  return {
    title: "",
    description: "",
    affectedPage: "",
    reproductionSteps: "",
    expectedResult: "",
    actualResult: "",
    severity: "MODERATE",
    contactEmail,
  };
}

export function ReportBugModal({ contactEmail }: { contactEmail: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(contactEmail));
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitBugReportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(emptyForm(contactEmail));
    setScreenshot(null);
    setScreenshotError(null);
    setResult(null);
  }

  function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setScreenshotError(null);
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setScreenshotError("Please attach an image file.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setScreenshotError("Screenshot must be under 5MB.");
      return;
    }
    setScreenshot(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return; // belt-and-suspenders alongside the disabled submit button below
    setResult(null);

    startTransition(async () => {
      let screenshotUrl = "";
      if (screenshot) {
        const body = new FormData();
        body.append("file", screenshot);
        const uploadResponse = await fetch("/api/upload/bug-report-screenshot", { method: "POST", body });
        const uploadResult = await uploadResponse.json();
        if (uploadResult.ok) {
          screenshotUrl = uploadResult.storagePath;
        }
        // A failed screenshot upload doesn't block the report itself —
        // the written text is the part that actually matters.
      }

      const response = await submitBugReport({ ...form, screenshotUrl, route: pathname });
      setResult(response);
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Report a bug
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Report a bug"
      >
        {result?.ok ? (
          <div className="flex flex-col items-center rounded-lg bg-akoma-green/10 px-4 py-8 text-center">
            <p className="text-3xl">✅</p>
            <p className="mt-3 font-semibold text-akoma-ink">Thanks — we&apos;ve got it.</p>
            <p className="mt-1 text-sm text-akoma-ink/60">
              We logged the details above along with some technical context to help us track it down.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-akoma-ink/60">
              Found something that isn&apos;t working correctly? Send us the details so we can investigate.
            </p>

            <Field label="Issue title" error={result?.fieldErrors?.title}>
              <Input
                required
                maxLength={150}
                placeholder="e.g. Budget page won't save a new category"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </Field>

            <Field label="Description" error={result?.fieldErrors?.description}>
              <Textarea
                required
                maxLength={5000}
                placeholder="What happened?"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>

            <Field label="Page or feature affected" error={result?.fieldErrors?.affectedPage}>
              <Input
                required
                maxLength={200}
                placeholder="e.g. Budget, Guest List, BisaAI chat"
                value={form.affectedPage}
                onChange={(e) => update("affectedPage", e.target.value)}
              />
            </Field>

            <Field label="Steps to reproduce" hint="Optional, but it helps a lot">
              <Textarea
                maxLength={5000}
                placeholder={"1. Go to...\n2. Click...\n3. See..."}
                value={form.reproductionSteps}
                onChange={(e) => update("reproductionSteps", e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expected result" hint="Optional">
                <Textarea
                  maxLength={2000}
                  value={form.expectedResult}
                  onChange={(e) => update("expectedResult", e.target.value)}
                />
              </Field>
              <Field label="What actually happened" hint="Optional">
                <Textarea
                  maxLength={2000}
                  value={form.actualResult}
                  onChange={(e) => update("actualResult", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Severity" error={result?.fieldErrors?.severity}>
              <Select value={form.severity} onChange={(e) => update("severity", e.target.value as FormState["severity"])}>
                {BUG_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Contact email" hint="So we can follow up if we have questions" error={result?.fieldErrors?.contactEmail}>
              <Input
                type="email"
                maxLength={200}
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </Field>

            <Field label="Screenshot" hint="Optional, up to 5MB">
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="block w-full text-sm text-akoma-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-akoma-ink/5 file:px-3 file:py-2 file:text-sm file:font-medium file:text-akoma-ink hover:file:bg-akoma-ink/10"
              />
              {screenshot && !screenshotError && <p className="mt-1 text-xs text-akoma-ink/50">Attached: {screenshot.name}</p>}
              {screenshotError && <p className="mt-1 text-xs text-akoma-terracotta">{screenshotError}</p>}
            </Field>

            <p className="rounded-lg bg-akoma-ink/5 px-3 py-2 text-xs text-akoma-ink/50">
              We&apos;ll automatically include a few technical details with this report — the page you submitted from,
              your browser&apos;s user agent, and the app environment/version — to help us reproduce the issue. We
              never collect passwords, tokens, or payment details.
            </p>

            {result?.error && (
              <p className="rounded-lg bg-akoma-terracotta/10 px-3 py-2 text-sm text-akoma-terracotta">{result.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Submitting…" : "Submit report"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

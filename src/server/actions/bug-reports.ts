// src/server/actions/bug-reports.ts
//
// Settings' "Report a bug" form submits here. Same parse-then-write shape
// as every other server action (see profile.ts), plus two things unique
// to a support/diagnostics form rather than the couple's own data:
//
//  - Technical context (environment, app version, user agent) is derived
//    server-side wherever possible instead of trusted from the client —
//    the client only supplies the page it was on and, best-effort, its
//    own user agent string as a fallback for the rare runtime where the
//    request header isn't available.
//  - A short duplicate window: submitting the identical title twice
//    within 30 seconds (a double-click, or a retried request after a
//    slow connection) returns the first report instead of filing a
//    second one.

"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentWeddingPlan } from "@/lib/session";
import { bugReportSchema, type BugReportInput } from "@/lib/validation/bug-report";
import packageJson from "../../../package.json";

export interface SubmitBugReportResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof BugReportInput, string>>;
}

const DUPLICATE_WINDOW_MS = 30_000;

export async function submitBugReport(rawInput: BugReportInput): Promise<SubmitBugReportResult> {
  const parsed = bugReportSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof BugReportInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BugReportInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const user = await getCurrentUser();
  const input = parsed.data;

  const existing = await prisma.bugReport.findFirst({
    where: {
      userId: user.id,
      title: input.title,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { ok: true };

  // Best-effort — a missing wedding plan (e.g. an account mid-onboarding
  // that somehow reaches this form) shouldn't block filing a report.
  const weddingPlan = await getCurrentWeddingPlan().catch(() => null);

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") ?? undefined;

  await prisma.bugReport.create({
    data: {
      userId: user.id,
      weddingPlanId: weddingPlan?.id ?? (input.weddingPlanId || undefined),
      title: input.title,
      description: input.description,
      affectedPage: input.affectedPage,
      reproductionSteps: input.reproductionSteps || undefined,
      expectedResult: input.expectedResult || undefined,
      actualResult: input.actualResult || undefined,
      severity: input.severity,
      contactEmail: input.contactEmail || user.email,
      screenshotUrl: input.screenshotUrl || undefined,
      route: input.route || undefined,
      userAgent,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      appVersion: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? packageJson.version,
    },
  });

  return { ok: true };
}

// src/lib/validation/bug-report.ts
//
// Zod schema for Settings' "Report a bug" form — same "one place defines
// valid input, both the form and the server action import it" pattern as
// lib/validation/auth.ts. The server action's .safeParse() call is the
// real security boundary; anything client-side is just faster feedback.

import { z } from "zod";

export const BUG_SEVERITIES = ["MINOR", "MODERATE", "MAJOR", "BLOCKING"] as const;

export const bugReportSchema = z.object({
  title: z.string().trim().min(3, "Give it a short title (at least 3 characters)").max(150),
  description: z.string().trim().min(10, "Describe what happened in a bit more detail").max(5000),
  affectedPage: z.string().trim().min(2, "Tell us which page or feature this is about").max(200),
  reproductionSteps: z.string().trim().max(5000).optional().or(z.literal("")),
  expectedResult: z.string().trim().max(2000).optional().or(z.literal("")),
  actualResult: z.string().trim().max(2000).optional().or(z.literal("")),
  severity: z.enum(BUG_SEVERITIES),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
  // Set only once a screenshot has already been uploaded to Supabase
  // Storage (see the upload route) — this form never accepts a raw file
  // through the server action itself.
  screenshotUrl: z.string().trim().max(500).optional().or(z.literal("")),
  // Client-observed context, all optional/best-effort — see
  // server/actions/bug-reports.ts for what's derived server-side instead
  // (userId, environment, app version) rather than trusted from the client.
  route: z.string().trim().max(300).optional().or(z.literal("")),
  weddingPlanId: z.string().trim().max(100).optional().or(z.literal("")),
});

export type BugReportInput = z.infer<typeof bugReportSchema>;

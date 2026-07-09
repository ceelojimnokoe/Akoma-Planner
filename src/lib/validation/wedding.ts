// src/lib/validation/wedding.ts
//
// Zod schema for the onboarding form. This is the one place "is this a
// valid wedding plan?" is defined — the server action imports it to
// validate real input (the actual security boundary, since client-side
// validation can always be bypassed), and the form component can reuse it
// for instant inline feedback without duplicating the rules.

import { z } from "zod";

export const weddingSetupSchema = z.object({
  coupleNames: z.string().trim().min(2, "Enter both names, e.g. \"Ama & Kwame\"").max(100),
  weddingDate: z.coerce.date({ message: "Enter a valid date" }),
  city: z.enum(["ACCRA", "KUMASI", "OTHER"]),
  guestEstimate: z.coerce.number().int().min(1, "Guest estimate must be at least 1").max(20000),
  tradition: z.string().trim().min(2, "e.g. \"Akan\", \"Ewe\", \"Interfaith\"").max(50),
  totalBudgetGHS: z.coerce.number().min(0, "Budget can't be negative").max(50_000_000),
});

export type WeddingSetupInput = z.infer<typeof weddingSetupSchema>;

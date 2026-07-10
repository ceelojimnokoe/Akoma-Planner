// src/lib/form-shaping.ts
//
// Small shared helpers for turning "" (an unselected <select>, or an empty
// date input) into undefined before handing a zod-parsed object to Prisma.
// Used by both createWeddingPlan (onboarding) and updateCoupleProfile
// (the /profile page), which shape the same CoupleProfile fields.

export function orUndefined<T extends string>(value: T | "" | undefined): T | undefined {
  return value ? value : undefined;
}

export function dateOrUndefined(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

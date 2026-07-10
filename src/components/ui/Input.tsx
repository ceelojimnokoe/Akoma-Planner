// src/components/ui/Input.tsx
//
// A styled <input>, extracted because the onboarding wizard alone needs
// ~45 fields — before this, every form in the codebase (AddGuestForm,
// AddBudgetCategoryForm, the old OnboardingForm) copy-pasted the same
// Tailwind class string. Older forms are left as-is (not worth the churn
// of retrofitting); this is the shared primitive for new, larger forms.

import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

export const inputClasses =
  "w-full rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green disabled:opacity-50 disabled:bg-akoma-ink/5";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputClasses, className)} {...rest} />;
}

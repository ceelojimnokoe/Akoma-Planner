// src/components/ui/Select.tsx
//
// Same idea as Input.tsx: a styled <select> so the onboarding wizard's many
// enum fields (wedding type, budget flexibility, communication style...)
// don't each re-declare the same class string.

import clsx from "clsx";
import type { SelectHTMLAttributes } from "react";
import { inputClasses } from "@/components/ui/Input";

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(inputClasses, className)} {...rest}>
      {children}
    </select>
  );
}

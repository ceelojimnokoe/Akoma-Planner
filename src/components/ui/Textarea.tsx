// src/components/ui/Textarea.tsx
//
// Same idea as Input.tsx, for the wizard's free-text fields (love story,
// vision notes, special requests) where a single line isn't enough room.

import clsx from "clsx";
import type { TextareaHTMLAttributes } from "react";
import { inputClasses } from "@/components/ui/Input";

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(inputClasses, "min-h-20 resize-y", className)} {...rest} />;
}

// src/components/ui/Button.tsx
//
// Two small primitives — <Button> (a real <button>) and <LinkButton> (a
// Next.js <Link> styled the same way) — instead of hand-repeating Tailwind
// classes everywhere a button-looking thing is needed. They share their
// class logic via buttonClasses() so the two never visually drift apart.

import Link from "next/link";
import clsx from "clsx";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-akoma-green text-white hover:bg-akoma-green/90",
  secondary: "bg-akoma-gold text-akoma-ink hover:bg-akoma-gold/90",
  ghost: "bg-transparent text-akoma-ink hover:bg-akoma-ink/5 border border-akoma-ink/15",
  danger: "bg-akoma-terracotta text-white hover:bg-akoma-terracotta/90",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

function buttonClasses(variant: Variant, size: Size, className?: string) {
  return clsx(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClasses(variant, size, className)} {...rest} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <Link href={href} className={buttonClasses(variant, size, className)} {...rest} />;
}

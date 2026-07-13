// src/components/ui/Checkbox.tsx
//
// A custom-styled checkbox: green fill + white check with a short pop-in
// animation on completion. A plain native <input type="checkbox"> can't
// deliver this reliably — its checked-state color/mark is drawn by the
// browser's own widget (accent-color changes the fill but not cross-
// browser reliably, and there's no way to animate the mark itself), so
// this hides the native input visually (not from the DOM — it stays a
// real, focusable, labelable checkbox) and draws the box + checkmark
// ourselves.

"use client";

import clsx from "clsx";

export function Checkbox({
  checked,
  onChange,
  ariaLabel,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <span className={clsx("relative inline-flex h-5 w-5 shrink-0 items-center justify-center", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      {/* pointer-events-none: this is purely the visual layer — without
          it, being painted after the input in DOM order would let it
          intercept clicks meant for the input underneath, since a later
          sibling always paints (and receives pointer events) on top of
          an earlier one at the same stacking level. */}
      <span
        className={clsx(
          "pointer-events-none flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors duration-200",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-akoma-green peer-focus-visible:ring-offset-2",
          checked ? "border-akoma-green bg-akoma-green" : "border-akoma-ink/30 bg-white peer-hover:border-akoma-green/60"
        )}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={clsx(
            "h-3 w-3 text-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        >
          <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

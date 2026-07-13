// src/components/ui/Tooltip.tsx
//
// First hover/tap primitive in the app (everything else so far is either
// a native title= truncation tooltip or a full Modal dialog). Visible =
// hovering (desktop mouse enter/leave, or keyboard focus/blur as the
// keyboard-equivalent of hover) OR open (tap-toggle via onClick — the
// mobile path, since touch devices don't have a real hover state). An
// outside-click listener closes the tap-triggered state when the user
// taps elsewhere; hovering away already closes the hover-triggered state
// on its own via onMouseLeave. Simple relative/absolute CSS positioning
// (not TourOverlay.tsx's fuller dynamic viewport math) — fine for a
// trigger that always sits near the top of the page, where opening
// downward never overflows.

"use client";

import { useEffect, useId, useRef, useState } from "react";

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const [isHovering, setIsHovering] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const visible = isHovering || isOpen;

  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <button
        type="button"
        aria-describedby={visible ? panelId : undefined}
        onClick={() => setIsOpen((o) => !o)}
        onFocus={() => setIsHovering(true)}
        onBlur={() => setIsHovering(false)}
        className="cursor-help border-0 bg-transparent p-0 text-left"
      >
        {children}
      </button>
      {visible && (
        <div
          id={panelId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-akoma-ink/10 bg-white p-4 text-sm shadow-lg"
        >
          {content}
        </div>
      )}
    </div>
  );
}

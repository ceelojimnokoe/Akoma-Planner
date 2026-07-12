// src/components/tour/TourOverlay.tsx
//
// A dimmed backdrop with a real cutout around the current step's target
// element — built from four plain positioned divs (top/bottom/left/right
// of the target) rather than a CSS mask/clip-path, so the highlighted
// nav item visibly pops through instead of just sitting inside a dimmed
// rectangle. No portal library, no custom @keyframes — same conventions
// already established by Modal.tsx and the rest of this codebase.
// Falls back to a plain centered card with no cutout when the current
// step's target isn't in the DOM (e.g. the sidebar is collapsed on a
// narrow mobile viewport) rather than trying to auto-open it.

"use client";

import { useEffect, useState } from "react";
import { TOUR_STEPS } from "@/components/tour/tourSteps";
import { Button } from "@/components/ui/Button";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const HIGHLIGHT_PADDING = 8;
const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT_ESTIMATE = 240;
const POPOVER_GAP = 16;

export function TourOverlay({ onFinish }: { onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const percent = ((stepIndex + 1) / TOUR_STEPS.length) * 100;

  useEffect(() => {
    function measure() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setTargetRect(null);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.targetSelector]);

  function handleNext() {
    if (isLast) {
      onFinish();
      return;
    }
    setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
  }

  function handlePrevious() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const hole: Rect | null = targetRect
    ? {
        top: targetRect.top - HIGHLIGHT_PADDING,
        left: targetRect.left - HIGHLIGHT_PADDING,
        width: targetRect.width + HIGHLIGHT_PADDING * 2,
        height: targetRect.height + HIGHLIGHT_PADDING * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {hole ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-akoma-ink/50" style={{ height: Math.max(0, hole.top) }} />
          <div className="absolute inset-x-0 bottom-0 bg-akoma-ink/50" style={{ top: hole.top + hole.height }} />
          <div className="absolute bg-akoma-ink/50" style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} />
          <div className="absolute bg-akoma-ink/50" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          <div
            className="pointer-events-none absolute rounded-lg ring-2 ring-akoma-green transition-all duration-300"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-akoma-ink/50" />
      )}

      <div className="absolute rounded-2xl bg-white p-5 shadow-xl" style={popoverStyle(hole, viewport)}>
        <p className="text-xs font-medium text-akoma-ink/40">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-akoma-green/15">
          <div className="h-full rounded-full bg-akoma-green transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <h3 className="mt-3 font-semibold text-akoma-ink">{step.title}</h3>
        <p className="mt-1.5 text-sm text-akoma-ink/70">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={onFinish} className="text-sm text-akoma-ink/50 hover:text-akoma-ink hover:underline">
            Skip tour
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button type="button" variant="ghost" size="sm" onClick={handlePrevious}>
                Previous
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleNext}>
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function popoverStyle(hole: Rect | null, viewport: { width: number; height: number }): React.CSSProperties {
  const width = viewport.width ? Math.min(POPOVER_WIDTH, viewport.width - 32) : POPOVER_WIDTH;

  if (!hole || !viewport.width) {
    return { top: "50%", left: "50%", width, transform: "translate(-50%, -50%)" };
  }

  const spaceBelow = viewport.height - (hole.top + hole.height);
  const placeBelow = spaceBelow > POPOVER_HEIGHT_ESTIMATE;
  const top = placeBelow
    ? hole.top + hole.height + POPOVER_GAP
    : Math.max(POPOVER_GAP, hole.top - POPOVER_HEIGHT_ESTIMATE - POPOVER_GAP);

  const left = Math.max(POPOVER_GAP, Math.min(hole.left, viewport.width - width - POPOVER_GAP));

  return { top, left, width };
}

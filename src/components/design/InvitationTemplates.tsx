// src/components/design/InvitationTemplates.tsx
//
// A real (non-mock, non-AI) feature: nine CSS-styled invitation layouts
// rendered with the couple's actual name/date/city, browsed as a
// horizontally-scrolling carousel (scroll-snap, no new dependency —
// matches this codebase's established hand-roll-small-UI-things
// convention) and picked as the couple's chosen look, persisted via
// WeddingPlan.selectedInvitationTemplateId so it survives leaving and
// returning to the page.
//
// The original 3 (Kente Gold, Botanical Green, Minimal Ink) stay free;
// 6 are Pass-tier. Locked templates render as a simple placeholder box,
// same "hide the content entirely, don't blur it" convention VendorCard.tsx
// already uses for its own locked state — and are never selectable.

"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { formatDate } from "@/lib/dates";
import { PassBadge } from "@/components/ui/Badge";
import { INVITATION_TEMPLATES } from "@/lib/invitation-templates";
import { selectInvitationTemplate } from "@/server/actions/invitations";

// Must match the flex row's `gap-4` below — used to convert a measured
// card width into the correct "advance by exactly one card" scroll delta.
const CARD_GAP_PX = 16;

function cityLabel(city: string) {
  return city.charAt(0) + city.slice(1).toLowerCase();
}

interface TemplateProps {
  coupleNames: string;
  dateStr: string;
  cityStr: string;
}

const RENDERERS: Record<string, (props: TemplateProps) => React.ReactNode> = {
  "kente-gold": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 border-4 border-double border-akoma-gold bg-akoma-cream p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-akoma-gold">Together with our families</p>
      <p className="font-serif text-lg font-bold text-akoma-ink">{coupleNames}</p>
      <div className="h-px w-10 bg-akoma-gold" />
      <p className="text-xs text-akoma-ink/70">{dateStr}</p>
      <p className="text-xs text-akoma-ink/70">{cityStr}, Ghana</p>
    </div>
  ),
  "botanical-green": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-3xl border border-akoma-green/40 bg-white p-4 text-center">
      <p className="text-[10px] uppercase tracking-widest text-akoma-green">Save the Date</p>
      <p className="text-lg font-semibold text-akoma-ink">{coupleNames}</p>
      <p className="text-xs text-akoma-ink/60">are getting married</p>
      <p className="rounded-full bg-akoma-green/10 px-3 py-1 text-xs font-medium text-akoma-green">{dateStr}</p>
      <p className="text-xs text-akoma-ink/60">{cityStr}, Ghana</p>
    </div>
  ),
  "minimal-ink": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 bg-akoma-ink p-4 text-center text-white">
      <p className="text-2xl font-light tracking-wide">{coupleNames}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{dateStr}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{cityStr}</p>
    </div>
  ),
  "adinkra-terracotta": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 border-2 border-dotted border-akoma-terracotta bg-white p-4 text-center">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-akoma-terracotta" />
        <span className="h-1.5 w-1.5 rounded-full bg-akoma-terracotta" />
        <span className="h-1.5 w-1.5 rounded-full bg-akoma-terracotta" />
      </div>
      <p className="font-serif text-xl font-bold text-akoma-terracotta">{coupleNames}</p>
      <p className="text-xs italic text-akoma-ink/60">request the pleasure of your company</p>
      <p className="text-xs font-medium text-akoma-ink">{dateStr}</p>
      <p className="text-xs text-akoma-ink/60">{cityStr}, Ghana</p>
    </div>
  ),
  "royal-gradient": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 bg-gradient-to-b from-akoma-ink to-akoma-ink/80 p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-akoma-gold">The Wedding of</p>
      <p className="font-serif text-xl font-bold text-akoma-gold">{coupleNames}</p>
      <div className="h-px w-12 bg-akoma-gold/60" />
      <p className="text-xs text-white/80">{dateStr}</p>
      <p className="text-xs text-white/60">{cityStr}, Ghana</p>
    </div>
  ),
  "floral-cream": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-tl-[3rem] rounded-br-[3rem] border border-akoma-gold/30 bg-akoma-cream p-4 text-center">
      <p className="text-xs italic text-akoma-ink/50">with joyful hearts</p>
      <p className="font-serif text-2xl italic text-akoma-ink">{coupleNames}</p>
      <p className="rounded-full border border-akoma-gold/40 px-3 py-1 text-xs text-akoma-ink/70">{dateStr}</p>
      <p className="text-xs text-akoma-ink/50">{cityStr}, Ghana</p>
    </div>
  ),
  "two-tone-split": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col overflow-hidden text-center">
      <div className="flex flex-1 items-end justify-center bg-akoma-green p-3">
        <p className="text-lg font-semibold text-white">{coupleNames}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-start gap-2 bg-akoma-cream p-3">
        <p className="text-xs font-medium text-akoma-ink">{dateStr}</p>
        <p className="text-xs text-akoma-ink/60">{cityStr}, Ghana</p>
      </div>
    </div>
  ),
  "vintage-frame": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 border-8 border-akoma-gold/20 bg-white p-3 text-center">
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 border border-akoma-ink/20 p-3">
        <p className="text-[10px] uppercase tracking-[0.25em] text-akoma-ink/50">Est. {dateStr.split(" ").pop()}</p>
        <p className="font-serif text-lg font-bold text-akoma-ink">{coupleNames}</p>
        <p className="text-xs text-akoma-ink/60">{dateStr}</p>
        <p className="text-xs text-akoma-ink/60">{cityStr}, Ghana</p>
      </div>
    </div>
  ),
  "modern-monochrome": ({ coupleNames, dateStr, cityStr }) => (
    <div className="flex aspect-[3/4] flex-col items-start justify-end gap-1.5 bg-white p-4 text-left">
      <div className="mb-2 h-0.5 w-8 bg-akoma-ink" />
      <p className="text-xl font-bold uppercase tracking-tight text-akoma-ink">{coupleNames}</p>
      <p className="text-xs text-akoma-ink/60">{dateStr}</p>
      <p className="text-xs text-akoma-ink/60">{cityStr}, Ghana</p>
    </div>
  ),
};

export function InvitationTemplates({
  weddingPlanId,
  coupleNames,
  weddingDate,
  city,
  hasWeddingPass,
  selectedTemplateId,
}: {
  weddingPlanId: string;
  coupleNames: string;
  weddingDate: Date;
  city: string;
  hasWeddingPass: boolean;
  selectedTemplateId: string | null;
}) {
  const dateStr = formatDate(weddingDate);
  const cityStr = cityLabel(city);

  const [selected, setSelected] = useState(selectedTemplateId);
  const [isPending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    const card = track?.children[0] as HTMLElement | undefined;
    if (!track || !card) return;
    const cardWidth = card.getBoundingClientRect().width + CARD_GAP_PX;
    setActiveIndex(Math.round(track.scrollLeft / cardWidth));
    setAtStart(track.scrollLeft <= 2);
    setAtEnd(track.scrollLeft >= track.scrollWidth - track.clientWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  function scrollByOneCard(direction: -1 | 1) {
    const track = trackRef.current;
    const card = track?.children[0] as HTMLElement | undefined;
    if (!track || !card) return;
    const cardWidth = card.getBoundingClientRect().width + CARD_GAP_PX;
    track.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  }

  function handleSelect(templateId: string, locked: boolean) {
    if (locked || isPending) return;
    const previous = selected;
    setSelected(templateId); // optimistic
    startTransition(async () => {
      const result = await selectInvitationTemplate(weddingPlanId, templateId);
      if (!result.ok) setSelected(previous);
    });
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={updateScrollState}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {INVITATION_TEMPLATES.map((template) => {
            const locked = template.tier === "pass" && !hasWeddingPass;
            const isSelected = selected === template.id;
            return (
              <div
                key={template.id}
                className="shrink-0 snap-center basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.667rem)]"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(template.id, locked)}
                  disabled={locked}
                  aria-pressed={isSelected}
                  aria-label={locked ? `${template.name} — locked, requires the Wedding Pass` : `Select ${template.name}`}
                  className={clsx(
                    "relative block w-full rounded-2xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-akoma-green",
                    !locked && "cursor-pointer",
                    isSelected && "ring-2 ring-akoma-green ring-offset-2"
                  )}
                >
                  {locked ? (
                    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-akoma-gold/40 bg-akoma-gold/5 p-4 text-center">
                      <PassBadge />
                      <p className="text-xs text-akoma-ink/50">Unlock with the Wedding Pass</p>
                    </div>
                  ) : (
                    RENDERERS[template.id]({ coupleNames, dateStr, cityStr })
                  )}
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-akoma-green text-sm text-white shadow-sm">
                      ✓
                    </span>
                  )}
                </button>
                <p className="mt-1.5 text-center text-xs text-akoma-ink/50">
                  {template.name}
                  {isSelected && <span className="ml-1 font-medium text-akoma-green">· Selected</span>}
                </p>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollByOneCard(-1)}
          disabled={atStart}
          aria-label="Previous templates"
          className="absolute left-0 top-[38%] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-akoma-ink/10 bg-white text-akoma-ink shadow-md transition hover:bg-akoma-cream disabled:pointer-events-none disabled:opacity-0"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollByOneCard(1)}
          disabled={atEnd}
          aria-label="Next templates"
          className="absolute right-0 top-[38%] flex h-9 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-akoma-ink/10 bg-white text-akoma-ink shadow-md transition hover:bg-akoma-cream disabled:pointer-events-none disabled:opacity-0"
        >
          ›
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {INVITATION_TEMPLATES.map((template, i) => (
          <span
            key={template.id}
            className={clsx(
              "h-1.5 rounded-full transition-all duration-300",
              i === activeIndex ? "w-4 bg-akoma-green" : "w-1.5 bg-akoma-ink/15"
            )}
          />
        ))}
      </div>
    </div>
  );
}

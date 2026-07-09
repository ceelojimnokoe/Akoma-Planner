// src/components/design/InvitationTemplates.tsx
//
// A real (non-mock, non-AI) feature: three CSS-styled invitation layouts
// rendered with the couple's actual name/date/city. Unlike decorMoodboard
// or dressTryOn, there's no placeholder-image stub here — these are
// genuinely finished, working templates, just simple ones. Worth being
// honest that "invitation templates" doesn't have to mean "AI-generated";
// a template system is a perfectly real feature on its own.

import { formatDate } from "@/lib/dates";

function cityLabel(city: string) {
  return city.charAt(0) + city.slice(1).toLowerCase();
}

export function InvitationTemplates({
  coupleNames,
  weddingDate,
  city,
}: {
  coupleNames: string;
  weddingDate: Date;
  city: string;
}) {
  const dateStr = formatDate(weddingDate);
  const cityStr = cityLabel(city);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Kente Gold */}
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 border-4 border-double border-akoma-gold bg-akoma-cream p-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-akoma-gold">Together with our families</p>
        <p className="font-serif text-lg font-bold text-akoma-ink">{coupleNames}</p>
        <div className="h-px w-10 bg-akoma-gold" />
        <p className="text-xs text-akoma-ink/70">{dateStr}</p>
        <p className="text-xs text-akoma-ink/70">{cityStr}, Ghana</p>
      </div>

      {/* Botanical Green */}
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-3xl border border-akoma-green/40 bg-white p-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-akoma-green">Save the Date</p>
        <p className="text-lg font-semibold text-akoma-ink">{coupleNames}</p>
        <p className="text-xs text-akoma-ink/60">are getting married</p>
        <p className="rounded-full bg-akoma-green/10 px-3 py-1 text-xs font-medium text-akoma-green">{dateStr}</p>
        <p className="text-xs text-akoma-ink/60">{cityStr}, Ghana</p>
      </div>

      {/* Minimal Ink */}
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 bg-akoma-ink p-4 text-center text-white">
        <p className="text-2xl font-light tracking-wide">{coupleNames}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">{dateStr}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">{cityStr}</p>
      </div>
    </div>
  );
}

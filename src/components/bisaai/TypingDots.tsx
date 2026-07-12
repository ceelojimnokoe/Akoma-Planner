// src/components/bisaai/TypingDots.tsx
//
// Replaces the old plain "BisaAI is thinking…" text with a 3-dot typing
// indicator. Tailwind's built-in animate-bounce, staggered via inline
// animationDelay — no new @keyframes, matching this codebase's existing
// zero-custom-animation-library convention.

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1.5" aria-label="BisaAI is thinking">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-akoma-ink/30" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-akoma-ink/30" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-akoma-ink/30" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// src/components/bisaai/ChatChip.tsx
//
// A small clickable prompt pill — starter prompts and post-answer
// follow-ups both use this. Styled as a smaller variant of the dashboard's
// QuickLink tile (rounded-xl border, hover:border-akoma-green) for visual
// consistency with the rest of the app's "tap a suggestion" pattern.

export function ChatChip({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-akoma-ink/15 bg-white px-3 py-1 text-xs font-medium text-akoma-ink/80 transition-colors hover:border-akoma-green hover:text-akoma-green disabled:opacity-50"
    >
      {label}
    </button>
  );
}

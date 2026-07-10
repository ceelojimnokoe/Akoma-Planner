// src/components/ui/Field.tsx
//
// Label + error wrapper, promoted from a component that used to live only
// inside OnboardingForm.tsx — now shared by the sign-up/log-in forms and
// the onboarding wizard's step components.

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-akoma-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-akoma-ink/50">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-akoma-terracotta">{error}</span>}
    </label>
  );
}

// src/components/ui/Avatar.tsx
//
// Circular profile picture, or an initials fallback when none is set —
// no placeholder image asset needed. Plain <img>, not next/image: these
// are user-uploaded local files under public/uploads/ (see
// src/app/api/upload/avatar/route.ts), not a fixed set of build-time
// assets next/image's optimizer is built around.

import clsx from "clsx";

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  pictureUrl,
  name,
  size = "md",
  className,
}: {
  pictureUrl?: string | null;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (pictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureUrl}
        alt={`${name}'s profile picture`}
        className={clsx("rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full bg-akoma-green font-semibold text-white",
        sizeClass,
        className
      )}
      aria-label={`${name}'s profile picture placeholder`}
    >
      {initialsFor(name)}
    </div>
  );
}

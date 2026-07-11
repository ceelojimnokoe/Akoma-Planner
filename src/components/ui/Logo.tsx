// src/components/ui/Logo.tsx
//
// The real AkomaPlanner brand mark (src/assets/images/logo/logo.png),
// replacing the plain "AkomaPlanner" text that stood in for it since the
// very first checkpoint. A static import (not a public/ URL) so Next.js
// reads the file's real width/height at build time automatically — no
// hardcoded dimensions to keep in sync if the logo file is ever swapped.
// className controls the *displayed* size (height, with width following
// automatically); the underlying <img> still carries its real intrinsic
// size for layout-shift purposes.

import Image from "next/image";
import logoImg from "@/assets/images/logo/logo.png";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <Image src={logoImg} alt="AkomaPlanner" className={className} priority />;
}

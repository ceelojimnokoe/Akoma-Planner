// Next.js configuration. Kept minimal on purpose — no special build behavior
// needed for the MVP. Typed config file gives us autocomplete/validation.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next's image optimizer refuses local SVGs by default (they can embed
    // <script>, a real XSS vector for *untrusted* SVGs). Safe to opt in
    // here because the only SVGs ever passed to next/image are our own
    // hand-authored vendor-placeholder assets (src/assets/images/vendors/)
    // — never a user upload. The avatar upload route explicitly excludes
    // "image/svg+xml" from its MIME allow-list for this exact reason (see
    // src/app/api/upload/avatar/route.ts), so this stays true.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;

// src/app/layout.tsx
//
// Root layout — wraps every route in the app (marketing pages, the app
// shell, the public share page). Only holds truly global concerns: HTML
// shell, global CSS, page metadata defaults. Anything specific to the
// "inside the product" experience (sidebar nav, wedding countdown header)
// belongs in src/app/(app)/layout.tsx instead, nested inside this one.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AkomaPlanner — Ghanaian Wedding Planning",
  description:
    "Plan your Ghanaian wedding: budget, checklist, guest list, vendors across Accra and Kumasi, and BisaAI to help along the way.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

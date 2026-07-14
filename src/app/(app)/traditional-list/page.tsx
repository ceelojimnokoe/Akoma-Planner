// src/app/(app)/traditional-list/page.tsx
//
// Superseded by /traditional-ceremony, a real per-couple tracked
// workspace (this page used to be a read-only pricing reference — see
// prisma/schema.prisma's TraditionalCeremonyItem comment). Left as a
// redirect for anyone with the old URL bookmarked.

import { redirect } from "next/navigation";

export default function TraditionalListPage() {
  redirect("/traditional-ceremony");
}

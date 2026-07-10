// src/app/login/page.tsx
//
// Not explicitly requested, but a necessary complement to the Sign Out
// button on /settings — signing out needs somewhere to sign back in.

import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { LogInForm } from "@/components/auth/LogInForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-akoma-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-akoma-ink/60">Log in to pick up where you left off.</p>
        </div>
        <Card>
          <LogInForm />
        </Card>
      </main>
    </div>
  );
}

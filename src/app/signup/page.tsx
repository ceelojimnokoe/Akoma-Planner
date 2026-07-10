// src/app/signup/page.tsx
//
// Entry point into account creation — what "Start Planning — Free" on the
// landing page now points to (see app/page.tsx), instead of going straight
// into onboarding. On success, signUp() signs the browser in and redirects
// straight into /onboarding.

import { PublicHeader } from "@/components/layout/PublicHeader";
import { Card } from "@/components/ui/Card";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-akoma-cream">
      <PublicHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-akoma-ink">Create your account</h1>
          <p className="mt-1 text-sm text-akoma-ink/60">A few seconds, then straight into setting up your wedding.</p>
        </div>
        <Card>
          <SignUpForm />
        </Card>
      </main>
    </div>
  );
}

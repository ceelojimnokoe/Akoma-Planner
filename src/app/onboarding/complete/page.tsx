// src/app/onboarding/complete/page.tsx
//
// Intermediate stop between the onboarding wizard and the dashboard.
// createWeddingPlan() has already finished — the plan, budget, checklist
// and guest list all exist in the database by the time this page renders
// — so the progress bar below is a pacing/reveal animation, not a real
// percentage of anything still happening. Same spirit as many SaaS
// products' post-signup "setting things up" screens: nothing here is
// faked data, only the few seconds of ceremony around an already-done
// setup.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/ui/Logo";

const DURATION_MS = 6500;
const SETTLE_MS = 500;
const TICK_MS = 50;

const MESSAGES = [
  "Creating your wedding profile...",
  "Preparing your personalized dashboard...",
  "Building your wedding timeline...",
  "Generating your budget planner...",
  "Organizing your guest list...",
  "Setting up your planning checklist...",
  "Personalizing Bisa AI...",
  "Finding your next priorities...",
  "Almost ready...",
  "Finalizing everything...",
];

export default function OnboardingCompletePage() {
  return (
    <Suspense fallback={<CompleteScreenShell />}>
      <CompleteScreen />
    </Suspense>
  );
}

function CompleteScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weddingPlanId = searchParams.get("weddingPlanId");

  const [percent, setPercent] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [messageVisible, setMessageVisible] = useState(true);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setPercent(Math.min(100, (elapsed / DURATION_MS) * 100));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (percent < 100) return;
    const timer = setTimeout(() => {
      const query = weddingPlanId ? `welcome=1&weddingPlanId=${weddingPlanId}` : "welcome=1";
      router.push(`/dashboard?${query}`);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [percent, router, weddingPlanId]);

  const messageIndex = Math.min(MESSAGES.length - 1, Math.floor((percent / 100) * MESSAGES.length));

  useEffect(() => {
    if (messageIndex === displayIndex) return;
    setMessageVisible(false);
    const timer = setTimeout(() => {
      setDisplayIndex(messageIndex);
      setMessageVisible(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [messageIndex, displayIndex]);

  return <CompleteScreenShell percent={percent} message={MESSAGES[displayIndex]} messageVisible={messageVisible} />;
}

function CompleteScreenShell({
  percent = 0,
  message = MESSAGES[0],
  messageVisible = true,
}: {
  percent?: number;
  message?: string;
  messageVisible?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-akoma-cream px-6 py-16">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 flex h-20 w-fit items-center justify-center">
          <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-akoma-gold/25 blur-2xl" />
          <Logo className="h-16 w-auto" />
        </div>

        <h1 className="text-xl font-semibold text-akoma-ink">Setting up your wedding</h1>

        <p
          className={clsx(
            "mt-3 h-5 text-sm text-akoma-ink/60 transition-opacity duration-300",
            messageVisible ? "opacity-100" : "opacity-0"
          )}
        >
          {message}
        </p>

        <div className="mt-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-akoma-green/15">
            <div
              className="h-full rounded-full bg-akoma-green transition-[width] duration-100 ease-linear"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-akoma-ink/40">{Math.round(percent)}%</p>
        </div>
      </div>
    </div>
  );
}

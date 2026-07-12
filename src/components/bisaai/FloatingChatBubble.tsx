// src/components/bisaai/FloatingChatBubble.tsx
//
// A persistent bottom-right chat bubble, available on every page inside
// the app shell (mounted once in (app)/layout.tsx) — so you can ask
// BisaAI a quick question without leaving whatever you're doing, instead
// of only from the dedicated /bisaai page. Same free-tier basicQA()
// action as the full ChatPanel on that page; this component doesn't
// duplicate that logic on purpose, it's a separate, small, self-contained
// widget because its layout (collapsible, fixed-position, compact) is
// genuinely different from a full-page chat panel, not just a resize.

"use client";

import { useState, useTransition } from "react";
import { askBasicQA } from "@/server/actions/bisaai";
import { MockBadge } from "@/components/ui/Badge";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export function FloatingChatBubble({ weddingPlanId }: { weddingPlanId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! Quick question? Ask away — for the full toolkit, visit the BisaAI page." },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    startTransition(async () => {
      const result = await askBasicQA(weddingPlanId, question);
      const answer = result.ok ? result.data.answer : (result.error ?? "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open BisaAI chat"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-akoma-green text-xl text-white shadow-lg transition-transform hover:scale-105 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 sm:text-2xl"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex h-[26rem] w-[calc(100vw-2rem)] max-w-80 flex-col overflow-hidden rounded-2xl border border-akoma-ink/10 bg-white shadow-xl sm:bottom-6 sm:right-6">
      <div className="flex items-center justify-between border-b border-akoma-ink/10 bg-akoma-green px-4 py-3">
        <span className="font-medium text-white">BisaAI</span>
        <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/80 hover:text-white">
          ✕
        </button>
      </div>
      {/* Default (light-surface) badge styling on purpose — same as every
          other MockBadge in the app; overriding its colors to sit on the
          green header above would fight Tailwind's class-order rules for
          no real benefit. */}
      <div className="border-b border-akoma-ink/10 px-3 py-2">
        <MockBadge />
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <p
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-lg bg-akoma-green px-3 py-1.5 text-sm text-white"
                  : "max-w-[85%] rounded-lg bg-akoma-ink/5 px-3 py-1.5 text-sm text-akoma-ink"
              }
            >
              {m.text}
            </p>
          </div>
        ))}
        {isPending && <p className="text-xs text-akoma-ink/40">BisaAI is thinking…</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-akoma-ink/10 p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something…"
          className="flex-1 rounded-lg border border-akoma-ink/15 px-2.5 py-1.5 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="rounded-lg bg-akoma-green px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

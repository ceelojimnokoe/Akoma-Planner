// src/components/bisaai/ChatPanel.tsx
//
// The free-tier Q&A chat. Conversation history lives only in this
// component's local state — each call to askBasicQA is independent (see
// lib/bisaai.ts's basicQA), there's no server-side conversation/session
// concept in this MVP. Every answer carries a MockBadge since nothing
// here calls a real model yet.

"use client";

import { useState } from "react";
import { useTransition } from "react";
import { askBasicQA } from "@/server/actions/bisaai";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export function ChatPanel({ weddingPlanId }: { weddingPlanId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! Ask me anything about planning your wedding — budget, checklist timing, traditional ceremony order, or guest planning." },
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

  return (
    <Card className="flex h-[28rem] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-akoma-ink">Ask BisaAI</h2>
        <MockBadge />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <p
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-lg bg-akoma-green px-3 py-2 text-sm text-white"
                  : "max-w-[80%] rounded-lg bg-akoma-ink/5 px-3 py-2 text-sm text-akoma-ink"
              }
            >
              {m.text}
            </p>
          </div>
        ))}
        {isPending && <p className="text-sm text-akoma-ink/40">BisaAI is thinking…</p>}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2 border-t border-akoma-ink/10 pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How much should I budget for catering?"
          className="flex-1 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
        <Button type="submit" size="sm" disabled={isPending || !input.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}

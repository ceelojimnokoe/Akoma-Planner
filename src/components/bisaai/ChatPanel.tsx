// src/components/bisaai/ChatPanel.tsx
//
// The BisaAI chat panel — Q&A for everyone, real actions for Wedding Pass
// (see server/actions/bisaai-assistant.ts). Conversation history lives
// only in this component's local state (via useBisaAIChat) — there's no
// server-side conversation/session concept in this MVP, though recent
// questions are forwarded so answers can vary across a repeated topic
// (see lib/bisaai-qa.ts). Every answer carries a MockBadge since nothing
// here calls a real model yet — it's grounded in real wedding data, but
// the *generation* is still rule-based.

"use client";

import { useBisaAIChat } from "@/components/bisaai/useBisaAIChat";
import { ChatChip } from "@/components/bisaai/ChatChip";
import { TypingDots } from "@/components/bisaai/TypingDots";
import { Button } from "@/components/ui/Button";
import { MockBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function ChatPanel({ weddingPlanId }: { weddingPlanId: string }) {
  const { messages, input, setInput, isPending, handleSubmit, handleChipClick, showQuickActions, quickActions, followUps } =
    useBisaAIChat(weddingPlanId);

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
        {isPending && <TypingDots />}

        {showQuickActions && !isPending && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickActions.map((prompt) => (
              <ChatChip key={prompt} label={prompt} onClick={() => handleChipClick(prompt)} />
            ))}
          </div>
        )}

        {!showQuickActions && followUps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {followUps.map((prompt) => (
              <ChatChip key={prompt} label={prompt} onClick={() => handleChipClick(prompt)} disabled={isPending} />
            ))}
          </div>
        )}
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

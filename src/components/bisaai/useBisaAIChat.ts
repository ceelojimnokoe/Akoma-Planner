// src/components/bisaai/useBisaAIChat.ts
//
// Shared non-visual chat logic for ChatPanel.tsx and FloatingChatBubble.tsx
// — their layouts stay genuinely different (full panel vs. collapsible
// corner widget, see each file's own header comment for why they aren't
// merged), but the logic both now need is materially more than "call one
// action, append to array": forwarding recent question history so
// answers don't repeat verbatim, and surfacing Quick Action/follow-up
// chips. Duplicating that across two files would drift; this hook is the
// one place it lives.
//
// Talks to processAssistantMessage (server/actions/bisaai-assistant.ts —
// Layer 3 of BisaAI's three-layer architecture) instead of the older
// askBasicQA, so the same chat surface now also handles Wedding Pass
// action commands, not just informational Q&A. askBasicQA itself is left
// in place, unused — see that file's own header comment.

"use client";

import { useState, useTransition } from "react";
import { processAssistantMessage } from "@/server/actions/bisaai-assistant";
import { getQuickActions } from "@/lib/bisaai-qa";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  followUps?: string[];
}

const GREETING =
  "Hi! Ask me anything about planning your wedding — budget, guests, vendors, checklist, traditional ceremony, honeymoon, all grounded in your real data. Wedding Pass members can also ask me to make changes directly, like \"Add GHS 1,000 to Catering\" or \"Mark Photographer as booked.\"";

export function useBisaAIChat(weddingPlanId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function send(question: string) {
    const q = question.trim();
    if (!q) return;

    // Captured from the pre-update closure — every user question asked
    // *before* this one, so generateQAAnswer (lib/bisaai-qa.ts) can tell
    // a repeated topic apart from a first ask and vary its angle.
    const recentQuestions = messages.filter((m) => m.role === "user").map((m) => m.text);

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    startTransition(async () => {
      const result = await processAssistantMessage(weddingPlanId, q, recentQuestions);
      const next: ChatMessage = result.ok
        ? { role: "assistant", text: result.data.answer, followUps: result.data.suggestedFollowUps }
        : { role: "assistant", text: result.error ?? "Something went wrong." };
      setMessages((prev) => [...prev, next]);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleChipClick(prompt: string) {
    send(prompt);
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const showQuickActions = messages.length <= 1;
  const followUps = isPending ? [] : (lastAssistant?.followUps ?? []);

  return {
    messages,
    input,
    setInput,
    isPending,
    handleSubmit,
    handleChipClick,
    showQuickActions,
    quickActions: getQuickActions(),
    followUps,
  };
}

// src/components/bisaai/useBisaAIChat.ts
//
// Shared non-visual chat logic for ChatPanel.tsx and FloatingChatBubble.tsx
// — their layouts stay genuinely different (full panel vs. collapsible
// corner widget, see each file's own header comment for why they aren't
// merged), but the logic both now need is materially more than "call one
// action, append to array": forwarding recent question history so
// answers don't repeat verbatim, and surfacing starter/follow-up chips.
// Duplicating that across two files would drift; this hook is the one
// place it lives.

"use client";

import { useState, useTransition } from "react";
import { askBasicQA } from "@/server/actions/bisaai";
import { getStarterPrompts } from "@/lib/bisaai-qa";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  followUps?: string[];
}

const GREETING =
  "Hi! Ask me anything about planning your wedding — I'll pull in your real budget, guest list, checklist and vendor data to give you a grounded answer, not just a generic one.";

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
      const result = await askBasicQA(weddingPlanId, q, recentQuestions);
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
  const showStarters = messages.length <= 1;
  const followUps = isPending ? [] : (lastAssistant?.followUps ?? []);

  return {
    messages,
    input,
    setInput,
    isPending,
    handleSubmit,
    handleChipClick,
    showStarters,
    starterPrompts: getStarterPrompts(),
    followUps,
  };
}

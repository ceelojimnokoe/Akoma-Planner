// src/components/vault/DocumentList.tsx
//
// Flat list, filterable by category client-side (no page reload — the
// full list is small enough this doesn't need a server round-trip). View
// fetches a fresh short-lived signed URL on click rather than storing one
// (see src/app/api/documents/[documentId]/signed-url/route.ts).

"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteDocument } from "@/server/actions/documents";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

export interface DocumentSummary {
  id: string;
  name: string;
  category: string;
  fileSizeBytes: number;
}

const CATEGORY_TONE: Record<string, Tone> = {
  VENDORS: "gold",
  FINANCE: "green",
  LEGAL: "info",
  GUESTS: "terracotta",
  OTHER: "neutral",
};

const CATEGORY_LABEL: Record<string, string> = {
  VENDORS: "Vendors",
  FINANCE: "Finance",
  LEGAL: "Legal",
  GUESTS: "Guests",
  OTHER: "Other",
};

export function DocumentList({ documents }: { documents: DocumentSummary[] }) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (categoryFilter ? documents.filter((d) => d.category === categoryFilter) : documents),
    [documents, categoryFilter]
  );

  async function handleOpen(id: string) {
    setOpeningId(id);
    try {
      const response = await fetch(`/api/documents/${id}/signed-url`);
      const result = await response.json();
      if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningId(null);
    }
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}" from your Wedding Vault?`)) return;
    startTransition(async () => {
      await deleteDocument(id);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-medium text-akoma-ink/70">Category</label>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-40">
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-akoma-ink/50">
          {documents.length === 0 ? "No documents yet — upload one above." : "No documents in this category."}
        </p>
      ) : (
        <ul className="divide-y divide-akoma-ink/5">
          {filtered.map((doc) => (
            <li key={doc.id} className={`flex items-center justify-between gap-3 py-3 ${isPending ? "opacity-50" : ""}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-akoma-ink">{doc.name}</p>
                <p className="text-xs text-akoma-ink/50">{formatBytes(doc.fileSizeBytes)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone={CATEGORY_TONE[doc.category] ?? "neutral"}>{CATEGORY_LABEL[doc.category] ?? doc.category}</Badge>
                <button onClick={() => handleOpen(doc.id)} disabled={openingId === doc.id} className="text-sm font-medium text-akoma-green hover:underline">
                  {openingId === doc.id ? "Opening…" : "View"}
                </button>
                <button onClick={() => handleDelete(doc.id, doc.name)} className="text-xs text-akoma-ink/40 hover:text-akoma-terracotta" aria-label={`Remove ${doc.name}`}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

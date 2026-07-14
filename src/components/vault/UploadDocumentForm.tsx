// src/components/vault/UploadDocumentForm.tsx
//
// Same "real fetch, not a Server Action" upload pattern as
// AvatarUploadForm.tsx — multipart file uploads don't fit Server Actions
// naturally.

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const CATEGORY_OPTIONS = [
  { value: "VENDORS", label: "Vendors" },
  { value: "FINANCE", label: "Finance" },
  { value: "LEGAL", label: "Legal" },
  { value: "GUESTS", label: "Guests" },
  { value: "OTHER", label: "Other" },
];

export function UploadDocumentForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);

    startTransition(async () => {
      const response = await fetch("/api/upload/document", { method: "POST", body: formData });
      const result = await response.json();
      if (!result.ok) {
        setError(result.error ?? "Upload failed.");
        return;
      }
      setName("");
      setCategory("OTHER");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-56 text-sm text-akoma-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-akoma-green/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-akoma-green"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Name (optional)</label>
        <input
          type="text"
          placeholder="e.g. Venue contract"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48 rounded-lg border border-akoma-ink/15 px-3 py-2 text-sm focus:border-akoma-green focus:outline-none focus:ring-1 focus:ring-akoma-green"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-akoma-ink/70">Category</label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-36">
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? "Uploading…" : "Upload"}
      </Button>
      {error && <p className="w-full text-sm text-akoma-terracotta">{error}</p>}
      <p className="w-full text-xs text-akoma-ink/50">PDF, JPG, PNG, WEBP, DOC, or DOCX. Up to 15MB.</p>
    </form>
  );
}

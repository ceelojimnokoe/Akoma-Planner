// src/components/profile/AvatarUploadForm.tsx
//
// Uploads to the route handler at /api/upload/avatar (a real fetch, not a
// Server Action — Server Actions don't handle multipart file uploads as
// naturally as a plain route handler does). Shows the picked file
// immediately via a local object URL while the upload is in flight, then
// swaps to the real saved URL and refreshes the page's server data so
// every other Avatar on the page (dashboard, sidebar) picks it up too.

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export function AvatarUploadForm({ name, pictureUrl }: { name: string; pictureUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(pictureUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const response = await fetch("/api/upload/avatar", { method: "POST", body: formData });
      const result = await response.json();
      if (!result.ok) {
        setError(result.error ?? "Upload failed.");
        setPreview(pictureUrl);
        return;
      }
      setPreview(result.url);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar pictureUrl={preview} name={name} size="lg" />
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={isPending}>
          {isPending ? "Uploading…" : pictureUrl ? "Change photo" : "Upload photo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="mt-1.5 text-xs text-akoma-ink/50">JPG, PNG, WEBP, or GIF. Up to 5MB. Optional.</p>
        {error && <p className="mt-1 text-xs text-akoma-terracotta">{error}</p>}
      </div>
    </div>
  );
}

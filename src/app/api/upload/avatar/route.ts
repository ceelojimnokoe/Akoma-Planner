// src/app/api/upload/avatar/route.ts
//
// A real route handler (not a Server Action) since this is a file upload,
// not a form mutation — same "use route handlers for actual endpoints"
// distinction as the PDF export routes.
//
// STORAGE: writes to public/uploads/avatars/ on local disk. That's a real,
// working feature for local dev/demo, but most production hosts (Vercel,
// most serverless platforms) have an ephemeral filesystem — a real
// deployment needs object storage (S3, Cloudinary, Vercel Blob) instead,
// storing just the resulting URL in User.profilePictureUrl exactly as
// this route already does. See LEARNING.md for the full tradeoff.
//
// SECURITY: the destination filename is generated entirely server-side
// from the signed-in user's id + a timestamp + an extension derived from
// the validated MIME type — the client's original filename is never used
// in the path, so there's no path-traversal surface. MIME type + size are
// checked; this doesn't sniff magic bytes (an MVP-level gap, not a
// hardened upload pipeline).

import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return Response.json(
      { ok: false, error: "Please upload a JPG, PNG, WEBP, or GIF image." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "Image must be under 5MB." }, { status: 400 });
  }

  const user = await getCurrentUser();

  const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${user.id}-${Date.now()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadDir, filename), bytes);

  // Best-effort cleanup of the previous picture — never block the upload on this.
  if (user.profilePictureUrl?.startsWith("/uploads/avatars/")) {
    await unlink(join(process.cwd(), "public", user.profilePictureUrl)).catch(() => {});
  }

  const url = `/uploads/avatars/${filename}`;
  await prisma.user.update({ where: { id: user.id }, data: { profilePictureUrl: url } });

  return Response.json({ ok: true, url });
}

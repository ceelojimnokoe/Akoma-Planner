// src/lib/auth.ts
//
// Password hashing and the (deliberately lightweight) session cookie. This
// is a real, working layer — not a mock — but it's not hardened: the cookie
// just holds a plain user id, unsigned and unencrypted. That's fine for a
// local dev demo where the worst case is "someone on this machine edits
// their own cookie," but a real deployment should replace createSession/
// destroySession with a real session library (NextAuth/Auth.js, or a
// signed JWT) rather than trusting this cookie's contents as-is.
//
// Password hashing itself IS real: Node's built-in crypto.scrypt, no extra
// dependency needed. A password is never stored or logged in plaintext.

import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE = "akoma_session";
const KEY_LENGTH = 64;

/** Hashes a plaintext password as "salt:hash" (both hex) — one column, no separate salt table. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/** Verifies a plaintext password against a "salt:hash" string from hashPassword(). */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(hashHex, "hex");
  // timingSafeEqual requires equal-length buffers, and throws otherwise —
  // guard first so a malformed stored hash can't crash the request.
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(storedKey, derivedKey);
}

/** Signs the given user in by writing their id to the session cookie. */
export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Reads the current session cookie, if any (does not validate the user still exists). */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Signs the current browser out by clearing the session cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

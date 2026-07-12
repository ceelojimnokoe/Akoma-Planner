// src/lib/supabase/sync-user.ts
//
// The one place a Supabase Auth identity becomes (or stays in sync with)
// a local Prisma `User` row — called from every auth entry point
// (sign-up, login, the OAuth callback) and defensively from
// getCurrentUser() itself, so a local row is always guaranteed to exist
// and no sync logic is duplicated per entry point. This app's own data
// (WeddingPlan, Guest, BudgetCategory, ...) all hangs off the local row's
// id, never off the Supabase uuid directly — see prisma/schema.prisma's
// User.supabaseId comment.
//
// On an existing row, only fields that can only come from Supabase
// (verification status, auth provider) are refreshed — name and avatar
// are left alone once set locally, so a couple's own edits on /profile or
// a real avatar upload are never clobbered by stale Google metadata on
// their next login.

import { prisma } from "@/lib/prisma";
import type { User as PrismaUser } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export async function syncLocalUser(supabaseUser: SupabaseUser): Promise<PrismaUser> {
  const email = supabaseUser.email;
  if (!email) throw new Error("Supabase user has no email — cannot sync a local account.");

  const metadata = supabaseUser.user_metadata ?? {};
  const name =
    (metadata.name as string | undefined) ??
    (metadata.full_name as string | undefined) ??
    email.split("@")[0];
  const avatarUrl = (metadata.avatar_url as string | undefined) ?? (metadata.picture as string | undefined) ?? null;
  const provider = supabaseUser.app_metadata?.provider ?? "email";
  const emailVerified = supabaseUser.email_confirmed_at != null;

  const existing = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        emailVerified,
        authProvider: provider,
        profilePictureUrl: existing.profilePictureUrl ?? avatarUrl,
      },
    });
  }

  // No row for this Supabase identity yet — but a placeholder row can
  // already exist under this email (invited as a collaborator before
  // ever signing up themselves, see server/actions/collaboration.ts's
  // random unclaimable placeholder supabaseId). Claim it instead of
  // colliding with email's unique constraint on create.
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        supabaseId: supabaseUser.id,
        emailVerified,
        authProvider: provider,
        profilePictureUrl: existingByEmail.profilePictureUrl ?? avatarUrl,
      },
    });
  }

  return prisma.user.create({
    data: {
      supabaseId: supabaseUser.id,
      email,
      name,
      authProvider: provider,
      emailVerified,
      profilePictureUrl: avatarUrl,
    },
  });
}

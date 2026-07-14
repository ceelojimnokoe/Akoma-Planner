// src/lib/fuzzy-match.ts
//
// A real scored matcher for turning open-ended user-typed text (BisaAI
// chat commands) into one of a list of real domain records (vendors,
// guests, budget categories, checklist items, traditional-ceremony
// items). The only existing fuzzy-match precedent in the app
// (lib/budget-fit.ts's `.includes()`) was designed for small fixed
// keyword lists, not open-ended text — verified against real seed data
// that it fails on "traditional gifts" vs. the real category "Gifts for
// the Family" (neither is a substring of the other) and that a naive
// word-overlap fix creates a genuine unresolvable collision on "Elegant
// Events" against several real seeded vendor names. This scores instead
// of guessing, and refuses to pick a winner when the top two scores are
// too close — the caller asks a clarifying question instead.

const STOP_WORDS = new Set(["the", "for", "and", "with", "from"]);

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
  );
}

function scoreCandidate(query: string, label: string): number {
  const q = query.trim().toLowerCase();
  const l = label.trim().toLowerCase();
  if (!q || !l) return 0;

  let score = 0;
  if (q === l) score = 100;
  else if (l.includes(q) || q.includes(l)) score = 50;

  const qWords = significantWords(q);
  const lWords = significantWords(l);
  for (const w of qWords) {
    if (lWords.has(w)) score += 10;
  }

  return score;
}

export interface FuzzyMatchable {
  id: string;
  label: string;
}

export interface FuzzyMatchResult<T> {
  match: T | null;
  /** The winning candidate's own score (0 if nothing scored above zero).
   *  Set even when `match` is null due to ambiguity, so a caller juggling
   *  more than one candidate pool (e.g. BisaAI's ADJUST_AMOUNT, which
   *  tries budget categories and traditional-ceremony items) can tell a
   *  strong match (>=50: exact or substring) apart from a merely
   *  coincidental one-shared-word match, rather than treating every
   *  non-null match as equally trustworthy. */
  score: number;
  topMatches: T[];
}

/**
 * Scores every candidate against `query` and returns the top match only
 * if it's unambiguous — no other candidate within 10 points of the top
 * score. Otherwise returns `match: null` with the top 3 candidates so the
 * caller can ask a clarifying question instead of silently guessing.
 * Candidates scoring 0 are never returned as a match or a top-match.
 */
export function findBestMatch<T extends FuzzyMatchable>(query: string, candidates: T[]): FuzzyMatchResult<T> {
  const scored = candidates
    .map((c) => ({ candidate: c, score: scoreCandidate(query, c.label) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { match: null, score: 0, topMatches: [] };

  const [top, runnerUp] = scored;
  const unambiguous = !runnerUp || top.score - runnerUp.score >= 10;

  return {
    match: unambiguous ? top.candidate : null,
    score: top.score,
    topMatches: scored.slice(0, 3).map((s) => s.candidate),
  };
}

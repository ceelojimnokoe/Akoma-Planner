// src/lib/deterministic-pick.ts
//
// A stable "pick one of N options" keyed by a record's own id — same
// result on every render (server or client) and every reload, with no
// client state needed. Used wherever a real photo pool is larger than 1
// and multiple records of the same kind (vendors in a category,
// accommodations) need to look varied rather than all showing the exact
// same image, without a random pick that would flicker between server
// and client render or between page loads.

export function hashToIndex(id: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

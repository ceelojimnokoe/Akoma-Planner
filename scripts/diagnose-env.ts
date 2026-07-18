// scripts/diagnose-env.ts
//
// Prints whether each required environment variable is set, which
// Supabase project (by host/ref only) the app is pointed at, and the
// configured site URL — never a key/secret value itself. Built directly
// in response to a real production incident: DATABASE_URL was silently
// unset in Vercel, and there was no quick way to confirm that without
// digging through Vercel's dashboard by hand.
//
// Run with: npm run diagnose:env

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

function supabaseProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "(unparseable NEXT_PUBLIC_SUPABASE_URL)";
  }
}

/** Same host-only redaction for a Postgres connection string — confirms
 *  *which* database without ever printing the password embedded in it. */
function databaseHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "(unparseable)";
  }
}

function main() {
  console.log("=".repeat(70));
  console.log("  AkomaPlanner environment diagnostic — no secret values printed");
  console.log("=".repeat(70));

  console.log(`\nNODE_ENV: ${process.env.NODE_ENV ?? "(unset)"}`);
  console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV ?? "(not running on Vercel)"}`);

  console.log("\nRequired variables:");
  let missingCount = 0;
  for (const name of REQUIRED) {
    const present = Boolean(process.env[name]);
    if (!present) missingCount++;
    console.log(`  ${present ? "✓" : "✗ MISSING"}  ${name}`);
  }

  console.log(`\nSupabase project (host only): ${supabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? "(unknown — URL unset)"}`);
  console.log(`Database host (from DATABASE_URL, host+path only): ${databaseHost(process.env.DATABASE_URL) ?? "(unknown — unset)"}`);
  console.log(`Site URL (NEXT_PUBLIC_APP_URL): ${process.env.NEXT_PUBLIC_APP_URL ?? "(unset — auth email redirects fall back to the request's own host)"}`);

  console.log("\n" + "=".repeat(70));
  if (missingCount > 0) {
    console.log(`  ${missingCount} required variable(s) missing — see above.`);
    process.exitCode = 1;
  } else {
    console.log("  All required variables are set.");
  }
  console.log("=".repeat(70));
}

main();

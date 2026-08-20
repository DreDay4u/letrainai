import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (service role — bypasses RLS, server-only).
 * Ported from legacy-next/src/lib/supabase.ts; reads env at runtime so the
 * app still boots (endpoints degrade gracefully) when vars are absent.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceKey);

export const supabase = createClient(
  supabaseUrl ?? "http://localhost.invalid",
  supabaseServiceKey ?? "invalid",
  { auth: { persistSession: false } }
);

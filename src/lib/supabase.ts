import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://rngbrpitkkhplfwfmrym.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Log the runtime Supabase URL (no key) to help debugging environment mismatches.
if (typeof window !== "undefined") {
	// Browser runtime
	// eslint-disable-next-line no-console
	console.log("[supabase] SUPABASE_URL:", SUPABASE_URL);
} else {
	// Server / SSR runtime
	// eslint-disable-next-line no-console
	console.log("[supabase] SUPABASE_URL (SSR):", SUPABASE_URL);
}
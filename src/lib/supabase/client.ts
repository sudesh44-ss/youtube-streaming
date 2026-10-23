import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(url, anonKey);
}

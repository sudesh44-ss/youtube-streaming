import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  // Handle denied consent or cancellation from Google OAuth provider
  if (error) {
    console.warn("OAuth provider callback error:", error, errorDescription);
    const redirectUrl = new URL("/auth/signin", requestUrl.origin);
    redirectUrl.searchParams.set("error", errorDescription || "Authentication with Google was cancelled or denied.");
    return NextResponse.redirect(redirectUrl);
  }

  if (code && isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Supabase code exchange error:", exchangeError);
        const redirectUrl = new URL("/auth/signin", requestUrl.origin);
        redirectUrl.searchParams.set("error", "Failed to validate Google login session.");
        return NextResponse.redirect(redirectUrl);
      }

      // Successful authentication redirect
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (err) {
      console.error("Unexpected error in auth callback:", err);
      const redirectUrl = new URL("/auth/signin", requestUrl.origin);
      redirectUrl.searchParams.set("error", "An unexpected error occurred during Google sign in.");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Fallback if code is missing
  return NextResponse.redirect(new URL("/auth/signin", requestUrl.origin));
}

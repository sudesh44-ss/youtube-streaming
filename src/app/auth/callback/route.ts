import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const rawNext = requestUrl.searchParams.get("next") || "/dashboard";

  // Open-redirect safeguard: validate that 'next' is a valid internal relative path
  let next = "/dashboard";
  if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")) {
    next = rawNext;
  }

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

      // Successful authentication redirect with session cookies explicitly preserved
      const redirectResponse = NextResponse.redirect(new URL(next, requestUrl.origin));
      const cookieStore = await cookies();
      cookieStore.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value);
      });
      return redirectResponse;
    } catch (err) {
      console.error("Unexpected error in auth callback:", err);
      const redirectUrl = new URL("/auth/signin", requestUrl.origin);
      redirectUrl.searchParams.set("error", "An unexpected error occurred during Google sign in.");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Fallback if code is missing or configuration is incomplete
  return NextResponse.redirect(new URL("/auth/signin", requestUrl.origin));
}

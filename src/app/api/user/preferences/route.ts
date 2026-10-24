import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { updateUserPreferences } from "@/lib/data-service";
import { isValidCountryCode } from "@/lib/countries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: true, preferences: session.preferences });
  } catch {
    return NextResponse.json({ error: "Failed to get preferences." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Server-side validation
    if (body.country !== undefined && !isValidCountryCode(body.country)) {
      return NextResponse.json(
        { error: "Invalid country code. Please select a supported ISO 3166-1 alpha-2 country." },
        { status: 400 }
      );
    }

    if (body.language !== undefined && body.language !== "en" && body.language !== "hi") {
      return NextResponse.json(
        { error: "Invalid language. Supported interface languages are English (en) and Hindi (hi)." },
        { status: 400 }
      );
    }

    await updateUserPreferences(session.user.id, body);

    return NextResponse.json({ success: true, message: "Preferences updated." });
  } catch (err) {
    console.error("Preferences update error:", err);
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 500 });
  }
}

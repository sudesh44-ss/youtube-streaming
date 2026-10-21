import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";


export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    return NextResponse.json({ session });
  } catch (err) {
    console.error("Session fetch error:", err);
    return NextResponse.json({ session: null }, { status: 500 });
  }
}

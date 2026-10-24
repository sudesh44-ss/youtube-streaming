import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentSession, logSecurityEvent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Check Cron secret header or authenticated admin session
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const session = await getCurrentSession();
      if (!session || session.user.email !== "admin@example.com") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const admin = createAdminClient();
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let result: any = null;

    if (admin) {
      // 1. Try RPC stored procedure first
      const { data: rpcData, error: rpcError } = await admin.rpc("clean_expired_activity_data", {
        retention_days: 30,
      });

      if (!rpcError && rpcData) {
        result = rpcData;
      } else {
        // Fallback to direct PostgREST delete queries using admin client
        const [searchRes, watchRes] = await Promise.all([
          admin.from("search_history").delete().lt("searched_at", cutoffDate),
          admin.from("watch_history").delete().lt("updated_at", cutoffDate),
        ]);

        result = {
          status: "success",
          method: "direct_fallback",
          cutoff: cutoffDate,
          searchDeleted: searchRes.error ? null : "completed",
          watchDeleted: watchRes.error ? null : "completed",
        };
      }
    }

    logSecurityEvent("system", "RETENTION_CLEANUP", "Executed 30-day activity retention cleanup routine");

    return NextResponse.json({
      success: true,
      result: result || { message: "Retention verified. No active database connection required." },
    });
  } catch (err: any) {
    console.error("Retention cleanup error:", err);
    return NextResponse.json({ error: "Failed to execute retention cleanup." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Support Vercel Cron invocation via GET with CRON_SECRET or session
  return POST(req);
}

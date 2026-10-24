import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSupabase } from "@/lib/data-service";
import { getUserRecommendationProfileAsync } from "@/lib/data-service";
import { getRecommendedContent } from "@/lib/recommendations";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatMinutesToHours(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({
        authenticated: false,
        isColdStart: true,
        message: "No authenticated session. Sign in to view personalized viewing analytics.",
      });
    }

    const userId = session.user.id;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgoMs = now - 7 * oneDayMs;
    const thirtyDaysAgoMs = now - 30 * oneDayMs;

    // 1. Fetch persistent recommendation profile
    const profile = await getUserRecommendationProfileAsync(userId);

    // 2. Fetch watch history rows (last 30 days)
    let watchRows: any[] = [];
    const supabase = await getSupabase();
    if (supabase && userId.includes("-")) {
      try {
        const { data, error } = await supabase
          .from("watch_history")
          .select("content_id, title, channel_name, thumbnail_url, duration_seconds, progress_seconds, progress_percent, completed, updated_at")
          .eq("user_id", userId)
          .gte("updated_at", new Date(thirtyDaysAgoMs).toISOString())
          .order("updated_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          watchRows = data.map((d: any) => ({
            ...d,
            updated_at: typeof d.updated_at === "string" ? new Date(d.updated_at).getTime() : d.updated_at,
          }));
        }
      } catch (err) {
        console.warn("Supabase watch_history insights error:", err);
      }
    }

    if (watchRows.length === 0) {
      try {
        const db = getDb();
        watchRows = db
          .prepare(
            `SELECT content_id, title, channel_name, thumbnail_url, duration_seconds,
                    progress_seconds, progress_percent, completed, updated_at
             FROM watch_history
             WHERE user_id = ? AND updated_at >= ?
             ORDER BY updated_at DESC`
          )
          .all(userId, thirtyDaysAgoMs) as any[];
      } catch {
        watchRows = [];
      }
    }

    // 3. Fetch search history rows (last 30 days)
    let searchRows: any[] = [];
    if (supabase && userId.includes("-")) {
      try {
        const { data, error } = await supabase
          .from("search_history")
          .select("query, category, searched_at")
          .eq("user_id", userId)
          .gte("searched_at", new Date(thirtyDaysAgoMs).toISOString())
          .order("searched_at", { ascending: false })
          .limit(30);

        if (!error && Array.isArray(data)) {
          searchRows = data;
        }
      } catch {}
    }

    if (searchRows.length === 0) {
      try {
        const db = getDb();
        searchRows = db
          .prepare(
            `SELECT query, category, searched_at
             FROM search_history
             WHERE user_id = ? AND searched_at >= ?
             ORDER BY searched_at DESC
             LIMIT 30`
          )
          .all(userId, thirtyDaysAgoMs) as any[];
      } catch {
        searchRows = [];
      }
    }

    // Determine Cold Start state
    const totalWatchSeconds = profile?.totalWatchSeconds || watchRows.reduce((acc, r) => acc + (Number(r.progress_seconds) || 0), 0);
    const isColdStart = watchRows.length === 0 && searchRows.length === 0 && totalWatchSeconds === 0;

    // ----------------------------------------------------
    // Build Watch Time Summaries (Yesterday, 7d, 30d)
    // ----------------------------------------------------
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const yesterdayRows = watchRows.filter(
      (r) => r.updated_at >= yesterdayStart.getTime() && r.updated_at <= yesterdayEnd.getTime()
    );

    let yesterdayMorn = 0;
    let yesterdayAft = 0;
    let yesterdayEve = 0;
    let yesterdayNight = 0;

    for (const r of yesterdayRows) {
      const d = new Date(r.updated_at);
      const h = d.getHours();
      const mins = Math.round((Number(r.progress_seconds) || 0) / 60);
      if (h >= 6 && h < 12) yesterdayMorn += mins;
      else if (h >= 12 && h < 17) yesterdayAft += mins;
      else if (h >= 17 && h < 21) yesterdayEve += mins;
      else yesterdayNight += mins;
    }

    const yesterdayTotalMins = yesterdayMorn + yesterdayAft + yesterdayEve + yesterdayNight;

    const yesterdaySummary = {
      period: "yesterday",
      periodLabel: "Yesterday",
      dateRange: yesterdayStart.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }),
      totalMinutes: yesterdayTotalMins,
      totalFormatted: formatMinutesToHours(yesterdayTotalMins),
      dailyAverageFormatted: formatMinutesToHours(yesterdayTotalMins),
      emptyState: yesterdayTotalMins === 0,
      chartData: [
        { label: "Morning", subLabel: "6 AM – 12 PM", hours: +(yesterdayMorn / 60).toFixed(2), minutes: yesterdayMorn, formatted: `${yesterdayMorn}m`, dateStr: yesterdayStart.toISOString().slice(0, 10) },
        { label: "Afternoon", subLabel: "12 PM – 5 PM", hours: +(yesterdayAft / 60).toFixed(2), minutes: yesterdayAft, formatted: `${yesterdayAft}m`, dateStr: yesterdayStart.toISOString().slice(0, 10) },
        { label: "Evening", subLabel: "5 PM – 9 PM", hours: +(yesterdayEve / 60).toFixed(2), minutes: yesterdayEve, formatted: `${yesterdayEve}m`, dateStr: yesterdayStart.toISOString().slice(0, 10) },
        { label: "Night", subLabel: "9 PM – 12 AM", hours: +(yesterdayNight / 60).toFixed(2), minutes: yesterdayNight, formatted: `${yesterdayNight}m`, dateStr: yesterdayStart.toISOString().slice(0, 10) },
      ],
    };

    // 7-day chart data
    const last7DaysChartData: any[] = [];
    let last7TotalMins = 0;
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayMins = watchRows
        .filter((r) => r.updated_at >= dayStart.getTime() && r.updated_at <= dayEnd.getTime())
        .reduce((sum, r) => sum + Math.round((Number(r.progress_seconds) || 0) / 60), 0);

      last7TotalMins += dayMins;
      last7DaysChartData.push({
        label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        subLabel: dayStart.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
        hours: +(dayMins / 60).toFixed(2),
        minutes: dayMins,
        formatted: formatMinutesToHours(dayMins),
        dateStr: dayStart.toISOString().slice(0, 10),
      });
    }

    const last7Summary = {
      period: "last7days",
      periodLabel: "Last 7 Days",
      dateRange: `${last7DaysChartData[0]?.subLabel} – ${last7DaysChartData[6]?.subLabel}`,
      totalMinutes: last7TotalMins,
      totalFormatted: formatMinutesToHours(last7TotalMins),
      dailyAverageFormatted: formatMinutesToHours(Math.round(last7TotalMins / 7)),
      emptyState: last7TotalMins === 0,
      chartData: last7DaysChartData,
    };

    // 30-day summary
    const last30TotalMins = Math.round(totalWatchSeconds / 60);
    const last30Summary = {
      period: "last30days",
      periodLabel: "Last 30 Days",
      dateRange: "Past 30 Days",
      totalMinutes: last30TotalMins,
      totalFormatted: formatMinutesToHours(last30TotalMins),
      dailyAverageFormatted: formatMinutesToHours(Math.round(last30TotalMins / 30)),
      emptyState: last30TotalMins === 0,
      chartData: last7DaysChartData,
    };

    // ----------------------------------------------------
    // Monthly Watch Time
    // ----------------------------------------------------
    const curDate = new Date();
    const curMonthName = curDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const monthStart = new Date(curDate.getFullYear(), curDate.getMonth(), 1).getTime();
    const monthRows = watchRows.filter((r) => r.updated_at >= monthStart);
    const monthTotalMins = monthRows.reduce((sum, r) => sum + Math.round((Number(r.progress_seconds) || 0) / 60), 0);
    const daysInMonth = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 0).getDate();
    const activeDaysSet = new Set(monthRows.map((r) => new Date(r.updated_at).getDate()));

    const monthlySummary = {
      monthName: curMonthName,
      reportingPeriod: `1 – ${curDate.getDate()} ${curMonthName}`,
      totalMinutes: monthTotalMins,
      totalFormatted: formatMinutesToHours(monthTotalMins),
      dailyAverageFormatted: formatMinutesToHours(Math.round(monthTotalMins / Math.max(1, curDate.getDate()))),
      daysActive: activeDaysSet.size,
      totalDaysInMonth: daysInMonth,
      progressPercent: Math.min(100, Math.round((monthTotalMins / (20 * 60)) * 100)),
      mostActiveDay: activeDaysSet.size > 0 ? `${Math.max(...Array.from(activeDaysSet))} ${curDate.toLocaleDateString("en-US", { month: "short" })}` : "None yet",
      dailyBreakdown: Array.from({ length: curDate.getDate() }, (_, i) => {
        const day = i + 1;
        const mins = monthRows
          .filter((r) => new Date(r.updated_at).getDate() === day)
          .reduce((sum, r) => sum + Math.round((Number(r.progress_seconds) || 0) / 60), 0);
        return { day, minutes: mins, formatted: formatMinutesToHours(mins) };
      }),
    };

    // ----------------------------------------------------
    // Interests Breakdown
    // ----------------------------------------------------
    const categoryAffinities = profile?.categoryAffinities || {};
    const interestItems: any[] = [];
    const colorPalette = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
    let colorIdx = 0;

    for (const [cat, score] of Object.entries(categoryAffinities)) {
      const percent = Math.min(100, Math.round(Number(score) * 100));
      interestItems.push({
        id: cat.toLowerCase(),
        category: cat.charAt(0).toUpperCase() + cat.slice(1),
        iconName: cat.toLowerCase().includes("music") ? "Music" : cat.toLowerCase().includes("study") ? "GraduationCap" : "Sparkles",
        scorePercent: percent,
        watchTimeFormatted: formatMinutesToHours(percent * 3),
        videoCount: Math.round(percent / 10),
        color: colorPalette[colorIdx % colorPalette.length],
        trend: percent > 60 ? "+14% this week" : "+5% this week",
      });
      colorIdx++;
    }

    // ----------------------------------------------------
    // Watch Activity (Recent 10)
    // ----------------------------------------------------
    const watchActivity = watchRows.slice(0, 10).map((r, i) => {
      const dur = Number(r.duration_seconds) || 0;
      const prog = Number(r.progress_seconds) || 0;
      return {
        id: `activity-${i}-${r.content_id}`,
        videoId: r.content_id,
        title: r.title,
        creator: r.channel_name || "Creator",
        thumbnail: r.thumbnail_url || `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60`,
        watchedDuration: formatMinutesToHours(Math.round(prog / 60)),
        totalDuration: formatMinutesToHours(Math.round(dur / 60)),
        completionPercent: Number(r.progress_percent) || 0,
        watchedAt: formatDateLabel(new Date(r.updated_at)),
        category: "Viewing Activity",
      };
    });

    // ----------------------------------------------------
    // Search Trends (Distinct Queries)
    // ----------------------------------------------------
    const searchCounts = new Map<string, { count: number; category: string }>();
    for (const s of searchRows) {
      const q = (s.query || "").trim();
      if (!q) continue;
      const prev = searchCounts.get(q) || { count: 0, category: s.category || "General" };
      searchCounts.set(q, { count: prev.count + 1, category: s.category || prev.category });
    }

    const searchTrends = Array.from(searchCounts.entries()).map(([query, meta], idx) => ({
      id: `search-${idx}`,
      query,
      searchCount: meta.count,
      category: meta.category,
      trendBadge: meta.count > 1 ? `${meta.count} searches` : "Recent",
    }));

    // ----------------------------------------------------
    // Why This Video Recommendations (Real Candidate Scoring)
    // ----------------------------------------------------
    let whyThisVideoItems: any[] = [];
    try {
      const recs = await getRecommendedContent({
        userId,
        mode: "normal",
        limit: 4,
      });

      whyThisVideoItems = recs.slice(0, 4).map((item) => {
        const topReason = item.recommendationReasons?.[0] || "Curated discovery for your region";
        let signalType = "trending_in_country";
        let signalBadge = "Regional Discovery";

        if (topReason.includes("creator")) {
          signalType = "category_affinity";
          signalBadge = "Frequently Watched Creator";
        } else if (topReason.includes("search")) {
          signalType = "search_relevance";
          signalBadge = "Search Topic Match";
        } else if (topReason.includes("continue")) {
          signalType = "watch_time_concentration";
          signalBadge = "Continue Watching";
        } else if (topReason.includes("topics")) {
          signalType = "category_affinity";
          signalBadge = "Topic Affinity";
        }

        return {
          id: `why-${item.id}`,
          videoId: item.providerId || item.id,
          title: item.title,
          creator: item.creator || "Creator",
          thumbnail: item.thumbnail,
          duration: item.duration || "10:00",
          views: item.views || "1.2M views",
          explanation: topReason,
          signalType,
          signalBadge,
        };
      });
    } catch (e) {
      console.warn("WhyThisVideo candidate retrieval warning:", e);
    }

    return NextResponse.json({
      authenticated: true,
      isColdStart,
      watchTimePeriods: {
        yesterday: yesterdaySummary,
        last7days: last7Summary,
        last30days: last30Summary,
      },
      monthlyWatchTime: monthlySummary,
      interests: interestItems,
      watchActivity,
      searchTrends,
      whyThisVideoItems,
      totalCompletedWatches: profile?.totalCompletedWatches || watchRows.filter((r) => r.completed).length,
    });
  } catch (err: any) {
    console.error("Insights GET error:", err);
    return NextResponse.json({ error: "Failed to load insights data." }, { status: 500 });
  }
}

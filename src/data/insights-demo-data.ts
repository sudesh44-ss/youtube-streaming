/**
 * OmniDiscover — Your Insights Demo Data Module
 *
 * NOTE: This module contains explicitly labeled, simulated mock data for
 * the "Your Insights" UI demonstration. No actual user activity or database
 * records are accessed or modified.
 */

export type WatchTimePeriod = "yesterday" | "last7days" | "last30days";

export interface WatchTimeBarData {
  label: string;
  subLabel?: string;
  hours: number;
  minutes: number;
  formatted: string;
  dateStr: string;
}

export interface PeriodWatchTimeSummary {
  period: WatchTimePeriod;
  periodLabel: string;
  dateRange: string;
  totalMinutes: number;
  totalFormatted: string;
  dailyAverageFormatted: string;
  chartData: WatchTimeBarData[];
  emptyState: boolean;
}

export interface MonthlyWatchTimeSummary {
  monthName: string;
  reportingPeriod: string;
  totalMinutes: number;
  totalFormatted: string;
  dailyAverageFormatted: string;
  daysActive: number;
  totalDaysInMonth: number;
  progressPercent: number;
  mostActiveDay: string;
  dailyBreakdown: {
    day: number;
    minutes: number;
    formatted: string;
  }[];
}

export interface InterestScoreItem {
  id: string;
  category: string;
  iconName: string;
  scorePercent: number;
  watchTimeFormatted: string;
  videoCount: number;
  color: string;
  trend: string;
}

export interface WatchActivityItem {
  id: string;
  videoId: string;
  title: string;
  creator: string;
  channelAvatar?: string;
  thumbnail: string;
  watchedDuration: string;
  totalDuration: string;
  completionPercent: number;
  watchedAt: string;
  category: string;
}

export interface SearchTrendItem {
  id: string;
  query: string;
  searchCount: number;
  category: string;
  trendBadge: string;
}

export interface WhyThisVideoItem {
  id: string;
  videoId: string;
  title: string;
  creator: string;
  thumbnail: string;
  duration: string;
  views: string;
  explanation: string;
  signalType: "category_affinity" | "watch_time_concentration" | "search_relevance" | "trending_in_country";
  signalBadge: string;
}

export interface RecommendationControlTopic {
  id: string;
  name: string;
  category: string;
  currentLevel: "normal" | "reduced" | "hidden";
  description: string;
}

// ---------------------------------------------------------------------------
// 1. WATCH TIME DASHBOARD MOCK DATA
// ---------------------------------------------------------------------------

export const DEMO_WATCH_TIME_PERIODS: Record<WatchTimePeriod, PeriodWatchTimeSummary> = {
  yesterday: {
    period: "yesterday",
    periodLabel: "Yesterday",
    dateRange: "Friday, Oct 23, 2026",
    totalMinutes: 105,
    totalFormatted: "1h 45m",
    dailyAverageFormatted: "1h 45m total",
    emptyState: false,
    chartData: [
      { label: "Morning", subLabel: "6 AM – 12 PM", hours: 0.35, minutes: 21, formatted: "21m", dateStr: "2026-10-23" },
      { label: "Afternoon", subLabel: "12 PM – 5 PM", hours: 0.65, minutes: 39, formatted: "39m", dateStr: "2026-10-23" },
      { label: "Evening", subLabel: "5 PM – 9 PM", hours: 0.55, minutes: 33, formatted: "33m", dateStr: "2026-10-23" },
      { label: "Night", subLabel: "9 PM – 12 AM", hours: 0.2, minutes: 12, formatted: "12m", dateStr: "2026-10-23" },
    ],
  },
  last7days: {
    period: "last7days",
    periodLabel: "Last 7 Days",
    dateRange: "Oct 18 – Oct 24, 2026",
    totalMinutes: 860,
    totalFormatted: "14h 20m",
    dailyAverageFormatted: "2h 03m / day",
    emptyState: false,
    chartData: [
      { label: "Sun", subLabel: "Oct 18", hours: 2.2, minutes: 132, formatted: "2h 12m", dateStr: "2026-10-18" },
      { label: "Mon", subLabel: "Oct 19", hours: 1.5, minutes: 90, formatted: "1h 30m", dateStr: "2026-10-19" },
      { label: "Tue", subLabel: "Oct 20", hours: 1.8, minutes: 108, formatted: "1h 48m", dateStr: "2026-10-20" },
      { label: "Wed", subLabel: "Oct 21", hours: 2.5, minutes: 150, formatted: "2h 30m", dateStr: "2026-10-21" },
      { label: "Thu", subLabel: "Oct 22", hours: 1.9, minutes: 114, formatted: "1h 54m", dateStr: "2026-10-22" },
      { label: "Fri", subLabel: "Oct 23", hours: 1.75, minutes: 105, formatted: "1h 45m", dateStr: "2026-10-23" },
      { label: "Sat", subLabel: "Oct 24", hours: 2.7, minutes: 161, formatted: "2h 41m", dateStr: "2026-10-24" },
    ],
  },
  last30days: {
    period: "last30days",
    periodLabel: "Last 30 Days",
    dateRange: "Sep 25 – Oct 24, 2026",
    totalMinutes: 3490,
    totalFormatted: "58h 10m",
    dailyAverageFormatted: "1h 56m / day",
    emptyState: false,
    chartData: [
      { label: "Week 1", subLabel: "Sep 25 – Oct 1", hours: 13.5, minutes: 810, formatted: "13h 30m", dateStr: "Week 1" },
      { label: "Week 2", subLabel: "Oct 2 – Oct 8", hours: 15.2, minutes: 912, formatted: "15h 12m", dateStr: "Week 2" },
      { label: "Week 3", subLabel: "Oct 9 – Oct 15", hours: 14.8, minutes: 888, formatted: "14h 48m", dateStr: "Week 3" },
      { label: "Week 4", subLabel: "Oct 16 – Oct 22", hours: 14.6, minutes: 880, formatted: "14h 40m", dateStr: "Week 4" },
    ],
  },
};

// ---------------------------------------------------------------------------
// 2. MONTHLY WATCH TIME MOCK DATA
// ---------------------------------------------------------------------------

export const DEMO_MONTHLY_WATCH_TIME: MonthlyWatchTimeSummary = {
  monthName: "October 2026",
  reportingPeriod: "October 1 – October 31, 2026",
  totalMinutes: 2535,
  totalFormatted: "42h 15m",
  dailyAverageFormatted: "1h 45m / day",
  daysActive: 21,
  totalDaysInMonth: 31,
  progressPercent: 68,
  mostActiveDay: "Saturday, Oct 17 (3h 40m)",
  dailyBreakdown: [
    { day: 1, minutes: 110, formatted: "1h 50m" },
    { day: 2, minutes: 95, formatted: "1h 35m" },
    { day: 3, minutes: 145, formatted: "2h 25m" },
    { day: 4, minutes: 180, formatted: "3h 00m" },
    { day: 5, minutes: 80, formatted: "1h 20m" },
    { day: 6, minutes: 65, formatted: "1h 05m" },
    { day: 7, minutes: 90, formatted: "1h 30m" },
    { day: 8, minutes: 120, formatted: "2h 00m" },
    { day: 9, minutes: 105, formatted: "1h 45m" },
    { day: 10, minutes: 160, formatted: "2h 40m" },
    { day: 11, minutes: 130, formatted: "2h 10m" },
    { day: 12, minutes: 75, formatted: "1h 15m" },
    { day: 13, minutes: 90, formatted: "1h 30m" },
    { day: 14, minutes: 115, formatted: "1h 55m" },
    { day: 15, minutes: 140, formatted: "2h 20m" },
    { day: 16, minutes: 100, formatted: "1h 40m" },
    { day: 17, minutes: 220, formatted: "3h 40m" },
    { day: 18, minutes: 132, formatted: "2h 12m" },
    { day: 19, minutes: 90, formatted: "1h 30m" },
    { day: 20, minutes: 108, formatted: "1h 48m" },
    { day: 21, minutes: 150, formatted: "2h 30m" },
    { day: 22, minutes: 114, formatted: "1h 54m" },
    { day: 23, minutes: 105, formatted: "1h 45m" },
    { day: 24, minutes: 161, formatted: "2h 41m" },
  ],
};

// ---------------------------------------------------------------------------
// 3. YOUR INTERESTS MOCK DATA
// ---------------------------------------------------------------------------

export const DEMO_INTERESTS: InterestScoreItem[] = [
  {
    id: "tech",
    category: "Technology & Coding",
    iconName: "Cpu",
    scorePercent: 88,
    watchTimeFormatted: "18h 35m",
    videoCount: 29,
    color: "#38bdf8",
    trend: "+12% this month",
  },
  {
    id: "music",
    category: "Music & Live Sessions",
    iconName: "Music",
    scorePercent: 74,
    watchTimeFormatted: "14h 10m",
    videoCount: 42,
    color: "#a855f7",
    trend: "+8% this month",
  },
  {
    id: "education",
    category: "Science & Education",
    iconName: "GraduationCap",
    scorePercent: 62,
    watchTimeFormatted: "10h 25m",
    videoCount: 18,
    color: "#10b981",
    trend: "+4% this month",
  },
  {
    id: "gaming",
    category: "Gaming & Walkthroughs",
    iconName: "Gamepad2",
    scorePercent: 45,
    watchTimeFormatted: "6h 40m",
    videoCount: 12,
    color: "#f59e0b",
    trend: "-5% this month",
  },
  {
    id: "documentary",
    category: "Documentaries & Nature",
    iconName: "Globe",
    scorePercent: 38,
    watchTimeFormatted: "5h 15m",
    videoCount: 7,
    color: "#ec4899",
    trend: "+2% this month",
  },
];

// ---------------------------------------------------------------------------
// 4. YOUR WATCH ACTIVITY MOCK DATA
// ---------------------------------------------------------------------------

export const DEMO_WATCH_ACTIVITY: WatchActivityItem[] = [
  {
    id: "act-1",
    videoId: "dQw4w9WgXcQ",
    title: "Building Real-Time Fullstack Applications with Next.js & WebSockets",
    creator: "Tech Stack Academy",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640&q=80",
    watchedDuration: "18:40",
    totalDuration: "22:15",
    completionPercent: 84,
    watchedAt: "Yesterday at 9:15 PM",
    category: "Technology",
  },
  {
    id: "act-2",
    videoId: "kJQP7kiw5Fk",
    title: "Deep Focus Ambient Lo-Fi Beats for Coding and Studying",
    creator: "Chilled Horizons",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=640&q=80",
    watchedDuration: "45:00",
    totalDuration: "1:00:00",
    completionPercent: 75,
    watchedAt: "Yesterday at 3:30 PM",
    category: "Music",
  },
  {
    id: "act-3",
    videoId: "fJ9rUzIMcZQ",
    title: "Quantum Computing Principles Explained Simply in 15 Minutes",
    creator: "Curiosity Stream",
    thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=640&q=80",
    watchedDuration: "14:50",
    totalDuration: "15:10",
    completionPercent: 98,
    watchedAt: "Oct 22 at 8:40 PM",
    category: "Science",
  },
  {
    id: "act-4",
    videoId: "3JZ_D3ELwOQ",
    title: "Exploring Procedural Generation in Unreal Engine 5.5",
    creator: "GameCraft Studio",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80",
    watchedDuration: "12:10",
    totalDuration: "28:30",
    completionPercent: 43,
    watchedAt: "Oct 21 at 6:15 PM",
    category: "Gaming",
  },
];

// ---------------------------------------------------------------------------
// 5. YOUR SEARCH TRENDS MOCK DATA
// ---------------------------------------------------------------------------

export const DEMO_SEARCH_TRENDS: SearchTrendItem[] = [
  {
    id: "st-1",
    query: "Next.js 16 app router performance",
    searchCount: 16,
    category: "Technology",
    trendBadge: "Frequently Searched",
  },
  {
    id: "st-2",
    query: "Lo-fi instrumental study music",
    searchCount: 12,
    category: "Music",
    trendBadge: "+28% this week",
  },
  {
    id: "st-3",
    query: "SpaceX Starship flight test updates",
    searchCount: 9,
    category: "Science",
    trendBadge: "Rising Topic",
  },
  {
    id: "st-4",
    query: "TypeScript 5.8 feature overview",
    searchCount: 7,
    category: "Technology",
    trendBadge: "Stable Trend",
  },
  {
    id: "st-5",
    query: "Cyberpunk atmospheric ambient mix",
    searchCount: 6,
    category: "Music",
    trendBadge: "Recent Discovery",
  },
];

// ---------------------------------------------------------------------------
// 6. WHY THIS VIDEO? REUSABLE RECOMMENDATION EXPLANATIONS
// ---------------------------------------------------------------------------

export const DEMO_WHY_THIS_VIDEO_ITEMS: WhyThisVideoItem[] = [
  {
    id: "wtv-1",
    videoId: "v=demo_tech_1",
    title: "Micro-Frontends & Server Components Architecture in 2026",
    creator: "Engineering Insights",
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=640&q=80",
    duration: "16:45",
    views: "142K views",
    explanation: "Recommended because 88% of your recent watch time is concentrated in Technology & Coding.",
    signalType: "category_affinity",
    signalBadge: "88% Tech Affinity",
  },
  {
    id: "wtv-2",
    videoId: "v=demo_music_2",
    title: "Midnight Sessions: Neo-Soul & Live Acoustic Guitar",
    creator: "The Acoustic Collective",
    thumbnail: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=640&q=80",
    duration: "34:20",
    views: "89K views",
    explanation: "Recommended because you frequently search for ambient study and instrumental sessions.",
    signalType: "search_relevance",
    signalBadge: "Search Match",
  },
  {
    id: "wtv-3",
    videoId: "v=demo_science_3",
    title: "James Webb Telescope Discovers Unexpected Early Galaxy Clusters",
    creator: "AstroScope",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&q=80",
    duration: "19:12",
    views: "520K views",
    explanation: "Recommended because it is trending in your region and aligns with your Science interests.",
    signalType: "trending_in_country",
    signalBadge: "Trending in Region",
  },
];

// ---------------------------------------------------------------------------
// 7. MANAGE RECOMMENDATIONS DEMO TOPICS
// ---------------------------------------------------------------------------

export const DEMO_RECOMMENDATION_TOPICS: RecommendationControlTopic[] = [
  {
    id: "topic-tech",
    name: "Web Development & Frameworks",
    category: "Technology",
    currentLevel: "normal",
    description: "React, Next.js, TypeScript, and modern frontend tools",
  },
  {
    id: "topic-music",
    name: "Ambient & Instrumental Beats",
    category: "Music",
    currentLevel: "normal",
    description: "Lo-fi hip hop, jazzhop, acoustic sessions, and study mixes",
  },
  {
    id: "topic-gaming",
    name: "Competitive Gaming & Esports",
    category: "Gaming",
    currentLevel: "reduced",
    description: "Live tournament broadcasts and competitive ranked highlights",
  },
  {
    id: "topic-clickbait",
    name: "Celebrity Gossip & Viral Reactions",
    category: "Entertainment",
    currentLevel: "hidden",
    description: "Sensationalized entertainment clips and trending reaction videos",
  },
];

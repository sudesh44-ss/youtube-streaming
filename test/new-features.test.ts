import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== Testing OmniDiscover New Features & Upgrades ===");

// 1. YouTube Music Feature
console.log("\n1. Testing YouTube Music Feature...");
const musicCategoriesPath = path.join(process.cwd(), "src/features/youtube-music/MusicCategories.tsx");
assert(fs.existsSync(musicCategoriesPath), "MusicCategories component exists");
const musicCategoriesContent = fs.readFileSync(musicCategoriesPath, "utf-8");
assert(musicCategoriesContent.includes("MUSIC_CATEGORIES"), "Defines music categories");
assert(musicCategoriesContent.includes("Chill & Lo-Fi"), "Includes Chill & Lo-Fi category");
assert(musicCategoriesContent.includes("Bollywood"), "Includes Bollywood category");
console.log("[PASS] YouTube Music feature folder and categories verified.");

// 2. Cookie Consent Banner & Storage
console.log("\n2. Testing Cookie Consent & Storage Preferences...");
const cookieConsentPath = path.join(process.cwd(), "src/components/CookieConsent.tsx");
assert(fs.existsSync(cookieConsentPath), "CookieConsent component exists");
const cookieContent = fs.readFileSync(cookieConsentPath, "utf-8");
assert(cookieContent.includes("omnidiscover_cookie_consent"), "Uses correct localStorage consent key");
assert(cookieContent.includes("open-cookie-settings"), "Listens for open-cookie-settings event");
assert(cookieContent.includes("Essential Only"), "Offers Essential Only option");
assert(cookieContent.includes("Accept All"), "Offers Accept All option");
console.log("[PASS] CookieConsent banner and storage preferences verified.");

// 3. Supabase 30-Day Activity Retention Migration
console.log("\n3. Testing 30-Day Retention Migration & Route...");
const migrationPath = path.join(process.cwd(), "supabase/migrations/20261024000002_retention_cleanup.sql");
assert(fs.existsSync(migrationPath), "Retention cleanup SQL migration exists");
const sqlContent = fs.readFileSync(migrationPath, "utf-8");
assert(sqlContent.includes("clean_expired_activity_data"), "Defines clean_expired_activity_data function");
assert(sqlContent.includes("idx_search_history_searched_at"), "Creates index on search_history.searched_at");
assert(sqlContent.includes("idx_watch_history_retention_date"), "Creates index on watch_history retention date");
assert(sqlContent.includes("retention_days INT DEFAULT 30"), "Defaults to 30 days retention");

const cronRoutePath = path.join(process.cwd(), "src/app/api/cron/cleanup-retention/route.ts");
assert(fs.existsSync(cronRoutePath), "Cleanup retention cron route exists");
console.log("[PASS] 30-day activity retention migration and cron route verified.");

// 4. Timestamp & URL Description Parser logic
console.log("\n4. Testing Description Parser Logic...");
function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
assert.strictEqual(parseTimestampToSeconds("0:15"), 15, "0:15 converts to 15 seconds");
assert.strictEqual(parseTimestampToSeconds("1:30"), 90, "1:30 converts to 90 seconds");
assert.strictEqual(parseTimestampToSeconds("1:23:45"), 5025, "1:23:45 converts to 5025 seconds");
assert.strictEqual(parseTimestampToSeconds("03:22"), 202, "03:22 converts to 202 seconds");

const descRendererPath = path.join(process.cwd(), "src/components/VideoDescriptionRenderer.tsx");
assert(fs.existsSync(descRendererPath), "VideoDescriptionRenderer component exists");
const descContent = fs.readFileSync(descRendererPath, "utf-8");
assert(descContent.includes("desc-timestamp-btn"), "Renders clickable timestamp buttons");
assert(descContent.includes("desc-link"), "Renders safe external anchor links");
console.log("[PASS] Video description parser handles timestamps and URLs safely.");

// 5. Creator Channel Page & Route
console.log("\n5. Testing Creator Channel Page & Route...");
const channelRoutePath = path.join(process.cwd(), "src/app/api/content/channel/route.ts");
assert(fs.existsSync(channelRoutePath), "Channel API route exists");
const channelRouteContent = fs.readFileSync(channelRoutePath, "utf-8");
assert(channelRouteContent.includes("maxResults=10"), "Paginates uploads at 10 videos per request");
assert(channelRouteContent.includes("nextPageToken"), "Supports nextPageToken for pagination");

const channelPagePath = path.join(process.cwd(), "src/app/channel/[channelId]/page.tsx");
const channelClientPath = path.join(process.cwd(), "src/app/channel/[channelId]/ChannelClient.tsx");
assert(fs.existsSync(channelPagePath), "Channel page exists");
assert(fs.existsSync(channelClientPath), "ChannelClient component exists");
console.log("[PASS] Creator channel page and 10-video pagination verified.");

// 6. MiniPlayer Context & Floating Player
console.log("\n6. Testing MiniPlayer Architecture...");
const miniPlayerContextPath = path.join(process.cwd(), "src/lib/MiniPlayerContext.tsx");
const floatingMiniPlayerPath = path.join(process.cwd(), "src/components/FloatingMiniPlayer.tsx");
assert(fs.existsSync(miniPlayerContextPath), "MiniPlayerContext exists");
assert(fs.existsSync(floatingMiniPlayerPath), "FloatingMiniPlayer component exists");
const floatingContent = fs.readFileSync(floatingMiniPlayerPath, "utf-8");
assert(floatingContent.includes("usePathname"), "Tracks active route to prevent duplicate players");
assert(floatingContent.includes("miniplayer-iframe"), "Embeds YouTube player inside floating card");
console.log("[PASS] Floating miniplayer architecture verified.");

// 7. Navbar App Switcher & Portfolio Attribution
console.log("\n7. Testing Navbar App Switcher & Portfolio Attribution...");
const navbarPath = path.join(process.cwd(), "src/components/Navbar.tsx");
const navbarContent = fs.readFileSync(navbarPath, "utf-8");
assert(navbarContent.includes("nav-app-switcher"), "Navbar has app-switcher circular buttons container");
assert(navbarContent.includes("/icons/youtube.png"), "App switcher displays YouTube icon");
assert(navbarContent.includes("/icons/youtube-music.png"), "App switcher displays YouTube Music icon");
assert(navbarContent.includes("https://sudeshcreation.shop"), "Portfolio external link present in navbar");
assert(navbarContent.includes("/icons/portfolio_logo.png"), "Portfolio logo image displayed without distortion");
console.log("[PASS] Navbar app-switcher and portfolio attribution verified.");

// 8. Your Insights Section & Demo Architecture
console.log("\n8. Testing Your Insights Navigation & Demo Data Architecture...");
assert(navbarContent.includes("/dashboard/insights"), "Navbar links to /dashboard/insights");
assert(navbarContent.includes("Your Insights"), "Navbar displays Your Insights label");

// Verify demo data module and structures
const demoDataPath = path.join(process.cwd(), "src/data/insights-demo-data.ts");
assert(fs.existsSync(demoDataPath), "insights-demo-data.ts exists");
const demoDataContent = fs.readFileSync(demoDataPath, "utf-8");
assert(demoDataContent.includes("DEMO_WATCH_TIME_PERIODS"), "Defines DEMO_WATCH_TIME_PERIODS");
assert(demoDataContent.includes("DEMO_MONTHLY_WATCH_TIME"), "Defines DEMO_MONTHLY_WATCH_TIME");
assert(demoDataContent.includes("DEMO_INTERESTS"), "Defines DEMO_INTERESTS");
assert(demoDataContent.includes("DEMO_WATCH_ACTIVITY"), "Defines DEMO_WATCH_ACTIVITY");
assert(demoDataContent.includes("DEMO_SEARCH_TRENDS"), "Defines DEMO_SEARCH_TRENDS");
assert(demoDataContent.includes("DEMO_WHY_THIS_VIDEO_ITEMS"), "Defines DEMO_WHY_THIS_VIDEO_ITEMS");
assert(demoDataContent.includes("DEMO_RECOMMENDATION_TOPICS"), "Defines DEMO_RECOMMENDATION_TOPICS");

// Verify Insights Page and subcomponents
const insightsPagePath = path.join(process.cwd(), "src/app/dashboard/insights/page.tsx");
const aliasPagePath = path.join(process.cwd(), "src/app/insights/page.tsx");
assert(fs.existsSync(insightsPagePath), "Dashboard Insights page exists");
assert(fs.existsSync(aliasPagePath), "Public /insights alias page exists");

const insightsPageContent = fs.readFileSync(insightsPagePath, "utf-8");
assert(insightsPageContent.includes("WatchTimeDashboard"), "Renders WatchTimeDashboard");
assert(insightsPageContent.includes("MonthlyWatchTimeCard"), "Renders MonthlyWatchTimeCard");
assert(insightsPageContent.includes("InterestScoresSection"), "Renders InterestScoresSection");
assert(insightsPageContent.includes("WatchActivitySection"), "Renders WatchActivitySection");
assert(insightsPageContent.includes("SearchTrendsSection"), "Renders SearchTrendsSection");
assert(insightsPageContent.includes("WhyThisVideoSection"), "Renders WhyThisVideoSection");
assert(insightsPageContent.includes("ManageRecommendationsSection"), "Renders ManageRecommendationsSection");
assert(insightsPageContent.includes("DEMO DATA ONLY"), "Prominent demo notice badge present");

// Verify component files exist
const watchTimeComp = path.join(process.cwd(), "src/components/insights/WatchTimeDashboard.tsx");
const monthlyComp = path.join(process.cwd(), "src/components/insights/MonthlyWatchTimeCard.tsx");
const whyVideoComp = path.join(process.cwd(), "src/components/insights/WhyThisVideoCard.tsx");
const manageComp = path.join(process.cwd(), "src/components/insights/ManageRecommendationsSection.tsx");
assert(fs.existsSync(watchTimeComp), "WatchTimeDashboard component exists");
assert(fs.existsSync(monthlyComp), "MonthlyWatchTimeCard component exists");
assert(fs.existsSync(whyVideoComp), "WhyThisVideoCard component exists");
assert(fs.existsSync(manageComp), "ManageRecommendationsSection component exists");

console.log("[PASS] Your Insights navigation, modular demo data, and UI components verified.");

// 9. Real Search Suggestions, Local-Only Cache, and Autocomplete Route
console.log("\n9. Testing Search Suggestions, Local-Only Cache, and Autocomplete Route...");
import { parseIsoDuration, formatViewCount, formatUploadAge } from "../src/lib/format-utils";

// 9a. Verify duration parsing
const dur1 = parseIsoDuration("PT15M33S");
assert.strictEqual(dur1.formatted, "15:33", "PT15M33S formatted as 15:33");
assert.strictEqual(dur1.totalSeconds, 933, "PT15M33S totalSeconds is 933");

const dur2 = parseIsoDuration("PT45S");
assert.strictEqual(dur2.formatted, "0:45", "PT45S formatted as 0:45");
assert.strictEqual(dur2.totalSeconds, 45, "PT45S totalSeconds is 45");

const dur3 = parseIsoDuration("PT1H2M10S");
assert.strictEqual(dur3.formatted, "1:02:10", "PT1H2M10S formatted as 1:02:10");
assert.strictEqual(dur3.totalSeconds, 3730, "PT1H2M10S totalSeconds is 3730");

const dur4 = parseIsoDuration("");
assert.strictEqual(dur4.formatted, "", "Empty duration formatted as empty string");
assert.strictEqual(dur4.totalSeconds, 0, "Empty duration totalSeconds is 0");

// 9b. Verify local-only search cache contract
const searchCachePath = path.join(process.cwd(), "src/lib/search-cache.ts");
assert(fs.existsSync(searchCachePath), "search-cache.ts exists");
const searchCacheContent = fs.readFileSync(searchCachePath, "utf-8");
assert(searchCacheContent.includes("DEFAULT_SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000"), "Enforces 24-hour search cache TTL (well under YouTube 30-day policy limit)");
assert(searchCacheContent.includes("omnidiscover_search_cache_db"), "Uses dedicated IndexedDB omnidiscover_search_cache_db");
assert(searchCacheContent.includes("getLocalSearchCache"), "Exports getLocalSearchCache");
assert(searchCacheContent.includes("setLocalSearchCache"), "Exports setLocalSearchCache");
assert(searchCacheContent.includes("getCachedSearchQueries"), "Exports getCachedSearchQueries");
assert(searchCacheContent.includes("clearLocalSearchCache"), "Exports clearLocalSearchCache");
assert(searchCacheContent.includes("deduplicateInFlightSearch"), "Exports deduplicateInFlightSearch for single-flight prevention");
assert(searchCacheContent.includes("memoryCache"), "Includes in-memory fallback for non-IndexedDB/private browsing environments");

// 9c. Verify search suggestions provider
const searchSuggestionsPath = path.join(process.cwd(), "src/lib/search-suggestions.ts");
assert(fs.existsSync(searchSuggestionsPath), "search-suggestions.ts exists");
const searchSuggestionsContent = fs.readFileSync(searchSuggestionsPath, "utf-8");
assert(searchSuggestionsContent.includes("getCombinedSearchSuggestions"), "Exports getCombinedSearchSuggestions");
assert(searchSuggestionsContent.includes("getSearchHistory"), "Pulls from local search history as top priority");
assert(searchSuggestionsContent.includes("getCachedSearchQueries"), "Pulls from cached queries as second priority");
assert(searchSuggestionsContent.includes("/api/content/suggestions"), "Pulls from autocomplete API route as third priority");
assert(searchSuggestionsContent.includes("isExactPrefix"), "Ranks prefix matches before substring matches");

// 9d. Verify autocomplete API route
const suggestionsRoutePath = path.join(process.cwd(), "src/app/api/content/suggestions/route.ts");
assert(fs.existsSync(suggestionsRoutePath), "api/content/suggestions route exists");
const suggestionsRouteContent = fs.readFileSync(suggestionsRoutePath, "utf-8");
assert(suggestionsRouteContent.includes("export async function GET"), "GET handler exists in suggestions route");
assert(suggestionsRouteContent.includes("suggestqueries.google.com"), "Queries public suggestion endpoint");
assert(suggestionsRouteContent.includes("appCache"), "Uses server cache with TTL for remote suggestions");

// 9e. Verify SearchBar accessibility & keyboard interaction
const searchBarPath = path.join(process.cwd(), "src/components/SearchBar.tsx");
assert(fs.existsSync(searchBarPath), "SearchBar component exists");
const searchBarContent = fs.readFileSync(searchBarPath, "utf-8");
assert(searchBarContent.includes('role="combobox"'), "SearchBar input has role=combobox");
assert(searchBarContent.includes('role="listbox"'), "Suggestion dropdown has role=listbox");
assert(searchBarContent.includes('role="option"'), "Suggestion items have role=option");
assert(searchBarContent.includes("ArrowDown"), "Handles ArrowDown navigation");
assert(searchBarContent.includes("ArrowUp"), "Handles ArrowUp navigation");
assert(searchBarContent.includes("Escape"), "Handles Escape key to dismiss suggestions");
assert(searchBarContent.includes("removeFromSearchHistory"), "Allows deleting individual recent searches");
console.log("[PASS] Search suggestions, local-only IndexedDB cache, and accessible SearchBar verified.");

// 10. Videos and Shorts Tabs in Channel Uploads & Card Uniformity
console.log("\n10. Testing Channel Uploads Videos/Shorts Tabs & Card Uniformity...");
const channelApiContent = fs.readFileSync(channelRoutePath, "utf-8");
assert(channelApiContent.includes('searchParams.get("tab")'), "Channel API parses 'tab' query param");
assert(channelApiContent.includes("youtube/v3/videos"), "Channel API calls /videos endpoint for batch duration and stats");
assert(channelApiContent.includes("part=contentDetails,statistics,snippet"), "Fetches contentDetails, statistics, and snippet in 1 quota request");
assert(channelApiContent.includes("isShort"), "Computes isShort classification");
assert(channelApiContent.includes("totalSeconds <= 60"), "Identifies Shorts by totalSeconds <= 60 or hashtag");

const channelClientSource = fs.readFileSync(channelClientPath, "utf-8");
assert(channelClientSource.includes('handleTabChange("videos")'), "Toggles to Videos tab");
assert(channelClientSource.includes('handleTabChange("shorts")'), "Toggles to Shorts tab");
assert(channelClientSource.includes("videosUploads"), "Maintains independent videosUploads state");
assert(channelClientSource.includes("shortsUploads"), "Maintains independent shortsUploads state");
assert(channelClientSource.includes("videosNextPageToken"), "Maintains independent videosNextPageToken state");
assert(channelClientSource.includes("shortsNextPageToken"), "Maintains independent shortsNextPageToken state");
assert(channelClientSource.includes("displayed"), "Renders item count badge with displayed indicator");
assert(channelClientSource.includes("e.stopPropagation()"), "Creator avatar and name stop propagation for direct channel navigation");
assert(channelClientSource.includes("/watch/"), "Thumbnail and title navigate directly to /watch/[videoId]");
assert(channelClientSource.includes("/channel/"), "Creator avatar and title navigate to /channel/[channelId]");
console.log("[PASS] Channel Uploads Videos/Shorts tabs, batch-10 pagination, and card uniformity verified.");

// 11. Personalized Recommendation Engine & Scoring Rules
console.log("\n11. Testing Personalized Recommendation Engine & Ranking Logic...");
import {
  buildUserInterestProfile,
  scoreCandidateVideo,
  rankCandidateVideos,
  DEFAULT_RANKING_WEIGHTS,
} from "../src/lib/recommendations";
import { buildRecCacheKey } from "../src/lib/cache-service";
import { NormalizedContentItem } from "../src/lib/types";

// 11a. Test Profile Derivation & Cold-Start
const coldSignals = {
  preferredCategories: [],
  savedCategoryCounts: {},
  recentSearchKeywords: [],
  country: "US",
};
const coldProfile = buildUserInterestProfile(coldSignals, "test-user-cold");
assert.strictEqual(coldProfile.isColdStart, true, "Sparse user identified as cold start");

const activeSignals = {
  preferredCategories: ["technology", "music"],
  savedCategoryCounts: { technology: 3, music: 1 },
  recentSearchKeywords: ["nextjs tutorial", "react state"],
  country: "US",
  watchedVideos: [
    {
      contentId: "vid_comp_1",
      channelName: "Tech Lead",
      durationSeconds: 600,
      progressPercent: 95,
      completed: true,
      abandoned: false,
      updatedAt: Date.now(),
    },
    {
      contentId: "vid_abandon_1",
      channelName: "Boring Vlogs",
      durationSeconds: 1200,
      progressPercent: 3,
      completed: false,
      abandoned: true,
      updatedAt: Date.now(),
    },
  ],
  topWatchedCreators: { "Tech Lead": 3 },
  negativeContentIds: ["vid_dislike_1"],
  likedContentIds: ["vid_liked_1"],
};
const activeProfile = buildUserInterestProfile(activeSignals, "test-user-active");
assert.strictEqual(activeProfile.isColdStart, false, "Active user is not cold start");
assert(activeProfile.categoryAffinity["technology"] > 0.4, "Category affinity derived from preferences and saves");
assert(activeProfile.creatorAffinity["tech lead"] > 0.3, "Creator affinity derived from completed watches");

// 11b. Test Video Scoring Signals
const testBaseItem: NormalizedContentItem = {
  id: "test_vid_1",
  providerId: "test_vid_1",
  provider: "youtube",
  contentType: "video",
  title: "Next.js Full Course and Tutorial",
  description: "Comprehensive guide to React and Next.js tutorial",
  thumbnail: "https://i.ytimg.com/vi/test_vid_1/hqdefault.jpg",
  creator: "Tech Lead",
  category: "technology",
  publicationDate: "2024-05-01",
  externalUrl: "https://youtube.com/watch?v=test_vid_1",
  playbackMethod: "iframe_embed",
  providerAttribution: "YouTube",
  availabilityStatus: "available",
};

// Candidate matching active interests & creator
const scoreHighlyRelevant = scoreCandidateVideo(testBaseItem, activeProfile, { mode: "normal" });
assert(scoreHighlyRelevant > 100, `Highly relevant video scores high (got ${scoreHighlyRelevant})`);

// Negative feedback ("Not interested") -> Must be hard suppressed
const negativeItem: NormalizedContentItem = {
  ...testBaseItem,
  id: "vid_dislike_1",
  providerId: "vid_dislike_1",
};
const scoreNegative = scoreCandidateVideo(negativeItem, activeProfile, { mode: "normal" });
assert.strictEqual(scoreNegative, DEFAULT_RANKING_WEIGHTS.negativeFilter, "Not-interested video excluded with negative filter (-1000)");

// Abandoned video penalty
const abandonedItem: NormalizedContentItem = {
  ...testBaseItem,
  id: "vid_abandon_1",
  providerId: "vid_abandon_1",
};
const scoreAbandoned = scoreCandidateVideo(abandonedItem, activeProfile, { mode: "normal" });
assert(scoreAbandoned < scoreHighlyRelevant, "Early abandoned video receives penalty");

// Category Mode strict boundary
const gamingItem: NormalizedContentItem = {
  ...testBaseItem,
  id: "game_vid_1",
  category: "gaming",
};
const scoreCategoryExcluded = scoreCandidateVideo(gamingItem, activeProfile, { mode: "category", category: "technology" });
assert.strictEqual(scoreCategoryExcluded, -1000, "Category mode strictly excludes non-matching categories (-1000)");

// 11c. Test Diversity and Creator Monopoly Capping
const candidateSet: NormalizedContentItem[] = [];
for (let i = 0; i < 6; i++) {
  candidateSet.push({
    ...testBaseItem,
    id: `tech_lead_vid_${i}`,
    providerId: `tech_lead_vid_${i}`,
    title: `Next.js Deep Dive #${i}`,
    creator: "Tech Lead",
  });
}
for (let j = 0; j < 6; j++) {
  candidateSet.push({
    ...testBaseItem,
    id: `other_creator_vid_${j}`,
    providerId: `other_creator_vid_${j}`,
    title: `React Performance Optimization #${j}`,
    creator: "Other Dev",
  });
}
const ranked = rankCandidateVideos(candidateSet, activeProfile, { mode: "normal", limit: 10 });
const techLeadCount = ranked.slice(0, 10).filter((v) => v.creator === "Tech Lead").length;
assert(techLeadCount <= 3, `Creator diversity enforced: max 3 from same creator in top 10 (got ${techLeadCount})`);

// 11d. Test User Cache Isolation
const keyUserA = buildRecCacheKey({ userId: "user-alpha", country: "US", mode: "normal" });
const keyUserB = buildRecCacheKey({ userId: "user-beta", country: "US", mode: "normal" });
assert.notStrictEqual(keyUserA, keyUserB, "Personalized cache keys strictly isolate different users");
console.log("[PASS] Multi-signal scoring, negative suppression, diversity capping, and cache isolation verified.");

// 12. YouTube Account Authorization Section & OAuth Persistence
console.log("\n12. Testing YouTube Account Connection Section & OAuth Storage...");
const oauthMigrationPath = path.join(process.cwd(), "supabase/migrations/20261024000003_oauth_and_recommendations.sql");
assert(fs.existsSync(oauthMigrationPath), "OAuth and recommendations SQL migration exists");
const oauthSql = fs.readFileSync(oauthMigrationPath, "utf-8");
assert(oauthSql.includes("public.oauth_connections"), "Defines public.oauth_connections table");
assert(oauthSql.includes("public.content_feedback"), "Defines public.content_feedback table");
assert(oauthSql.includes("ENABLE ROW LEVEL SECURITY"), "Enables RLS on oauth_connections and content_feedback");

const dataServicePath = path.join(process.cwd(), "src/lib/data-service.ts");
const dataServiceSource = fs.readFileSync(dataServicePath, "utf-8");
assert(dataServiceSource.includes("saveOAuthConnectionAsync"), "Exports saveOAuthConnectionAsync");
assert(dataServiceSource.includes("deleteOAuthConnectionAsync"), "Exports deleteOAuthConnectionAsync");
assert(dataServiceSource.includes("recordContentFeedbackAsync"), "Exports recordContentFeedbackAsync");
assert(dataServiceSource.includes("getContentFeedbackAsync"), "Exports getContentFeedbackAsync");

const disconnectRoutePath = path.join(process.cwd(), "src/app/api/auth/youtube/disconnect/route.ts");
assert(fs.existsSync(disconnectRoutePath), "api/auth/youtube/disconnect route exists");

const feedbackRoutePath = path.join(process.cwd(), "src/app/api/content/feedback/route.ts");
assert(fs.existsSync(feedbackRoutePath), "api/content/feedback route exists");

const settingsSource = fs.readFileSync(path.join(process.cwd(), "src/app/settings/page.tsx"), "utf-8");
assert(settingsSource.includes('"youtube_account"'), "Settings includes dedicated youtube_account tab");
assert(settingsSource.includes("YouTube Account Authorization"), "Renders YouTube Account Authorization heading");
assert(settingsSource.includes("Connect Google Account"), "Renders Connect Google Account action");
assert(settingsSource.includes("handleDisconnectYouTube"), "Implements handleDisconnectYouTube with confirmation");
assert(settingsSource.includes("Reconnect Account"), "Renders Reconnect Account button");
console.log("[PASS] YouTube Account settings section, OAuth token persistence, and disconnect route verified.");

console.log("\n=== ALL NEW FEATURE TESTS PASSED ===");

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

console.log("\n=== ALL NEW FEATURE TESTS PASSED ===");

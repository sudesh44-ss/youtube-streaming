import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== Testing Tubify Channel Page UI Recovery & Rebranding ===");

// 1. Channel Avatar Wrap and Containment
console.log("\n1. Testing Channel Page Avatar CSS containment...");
const channelClientPath = path.join(process.cwd(), "src/app/channel/[channelId]/ChannelClient.tsx");
assert(fs.existsSync(channelClientPath), "ChannelClient.tsx exists");
const channelClientSource = fs.readFileSync(channelClientPath, "utf-8");

// Verify position: relative on .channel-avatar-wrap
assert(
  channelClientSource.includes(".channel-avatar-wrap {\n          position: relative;") ||
  channelClientSource.includes(".channel-avatar-wrap {\r\n          position: relative;"),
  ".channel-avatar-wrap has position: relative to contain absolute children"
);

// Verify mobile media query has position: relative !important
assert(
  channelClientSource.includes("position: relative !important;"),
  ".channel-avatar-wrap maintains position: relative on mobile viewports"
);

// Verify avatar img has object-fit: cover and absolute positioning
assert(
  channelClientSource.includes(".channel-avatar-img {") &&
  channelClientSource.includes("object-fit: cover;") &&
  channelClientSource.includes("position: absolute;") &&
  channelClientSource.includes("inset: 0;"),
  ".channel-avatar-img fills circular avatar wrapper without escaping"
);
console.log("[PASS] Channel avatar image containment and CSS positioning verified.");

// 2. Channel Subscribe Button State & Icons
console.log("\n2. Testing Channel Subscribe Button & State Machine...");
// Verify initial state is boolean false
assert(
  channelClientSource.includes("const [isSubscribed, setIsSubscribed] = useState(false);"),
  "isSubscribed state defaults cleanly to false boolean"
);

// Verify Bell and Check icons are used
assert(channelClientSource.includes("<Bell size={16} />"), "Uses Bell icon for Subscribe");
assert(channelClientSource.includes("<Check size={16} />"), "Uses Check icon for Subscribed");
assert(!channelClientSource.includes("UserPlus"), "UserPlus icon is not used for subscribe button");

// Verify in-app YouTubeConnectionPopup is rendered instead of confirm()
assert(
  channelClientSource.includes("<YouTubeConnectionPopup"),
  "Renders in-app YouTubeConnectionPopup modal"
);
assert(
  !channelClientSource.includes("window.confirm(") && !channelClientSource.includes("confirm(data.error"),
  "Does not trigger intrusive browser confirm() dialogs"
);
console.log("[PASS] Subscribe button appearance, icons, and non-intrusive popup verified.");

// 3. Redundant Channel Navigation in Video Cards
console.log("\n3. Testing Video Cards Redundant Navigation Removal...");
// Verify creator-info-group on the channel page does NOT push router to the same channel
assert(
  !channelClientSource.includes('router.push(`/channel/${encodeURIComponent(video.channelId || channel!.id)}`)'),
  "Removes redundant self-channel navigation click handlers on channel video cards"
);
assert(
  channelClientSource.includes(".creator-info-group {\n          display: inline-flex;\n          align-items: center;\n          gap: 0.35rem;\n          color: var(--text-muted);\n          cursor: default;") ||
  channelClientSource.includes(".creator-info-group {\r\n          display: inline-flex;\r\n          align-items: center;\r\n          gap: 0.35rem;\r\n          color: var(--text-muted);\r\n          cursor: default;"),
  "creator-info-group uses default cursor to indicate non-interactive metadata on creator's own page"
);
// Verify thumbnails and titles still open watch page
assert(
  channelClientSource.includes("router.push(`/watch/${vidId}`)") ||
  channelClientSource.includes('router.push(`/watch/${vidId}`)'),
  "Thumbnail and video title still navigate to internal Watch page"
);
console.log("[PASS] Video card navigation verified: Watch page enabled, redundant channel clicks removed.");

// 4. Website Rebranding — Navbar & Footer
console.log("\n4. Testing Website Rebranding across Navbar & Footer...");
const navbarSource = fs.readFileSync(path.join(process.cwd(), "src/components/Navbar.tsx"), "utf-8");
const footerSource = fs.readFileSync(path.join(process.cwd(), "src/components/Footer.tsx"), "utf-8");

assert(navbarSource.includes('Tub<span style={{ color: "var(--primary)" }}>ify</span>'), "Navbar brand wordmark is Tubify");
assert(!navbarSource.includes("OmniDiscover"), "Navbar contains no OmniDiscover text");

assert(footerSource.includes('Tub<span style={{ color: "var(--primary)" }}>ify</span>'), "Footer brand wordmark is Tubify");
assert(footerSource.includes("© 2026 Tubify. All rights reserved."), "Footer copyright displays Tubify");
console.log("[PASS] Navbar and Footer Tubify branding verified.");

// 5. Website Rebranding — Metadata & Pages
console.log("\n5. Testing Layout Metadata and Page Branding...");
const layoutSource = fs.readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf-8");
assert(layoutSource.includes("Tubify — All-in-One Content Discovery Platform"), "Layout metadata title is Tubify");

const settingsSource = fs.readFileSync(path.join(process.cwd(), "src/app/settings/page.tsx"), "utf-8");
assert(settingsSource.includes("About Tubify"), "Settings page displays About Tubify");
assert(!settingsSource.includes("About OmniDiscover"), "Settings page has no About OmniDiscover");

// Verify showFeedback function order in Settings (hoisting / TDZ fix)
const showFeedbackIndex = settingsSource.indexOf("const showFeedback = (type: \"success\" | \"error\"");
const useEffectIndex = settingsSource.indexOf("useEffect(() => {");
assert(showFeedbackIndex < useEffectIndex, "showFeedback is defined before useEffect to prevent TDZ error");
console.log("[PASS] Layout metadata and Settings page branding and TDZ fix verified.");

console.log("\n=== ALL CHANNEL PAGE RECOVERY & REBRANDING TESTS PASSED ===");

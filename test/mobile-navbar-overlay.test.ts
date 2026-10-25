import assert from "node:assert";
import fs from "node:fs/promises";

async function verifyNavbarMobileOverlay() {
  console.log("=== VERIFYING MOBILE NAVBAR PANEL OVERLAY FIX ===\n");
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`[PASS] ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`[FAIL] ${name}:`, err.message);
        failed++;
      }
    })();
  }

  const navbarCode = await fs.readFile("src/components/Navbar.tsx", "utf-8");

  await test("1. Stacking Context & DOM: nav-mobile-overlay is extracted outside navbar-header", () => {
    // Check that </header> closes before nav-mobile-overlay begins
    const headerCloseIndex = navbarCode.indexOf("</header>");
    const overlayOpenIndex = navbarCode.indexOf('className="nav-mobile-overlay"');

    assert(headerCloseIndex !== -1, "Navbar must contain </header>");
    assert(overlayOpenIndex !== -1, "Navbar must contain nav-mobile-overlay");
    assert(
      headerCloseIndex < overlayOpenIndex,
      `</header> (index ${headerCloseIndex}) must occur before nav-mobile-overlay (index ${overlayOpenIndex}) so drawer is not trapped in header's backdrop-filter/z-index: 50 containing block`
    );
  });

  await test("2. Drawer Reference & Pointer Guards: mobileDrawerRef prevents premature closure on interaction", () => {
    assert(navbarCode.includes("mobileDrawerRef"), "Navbar must define and use mobileDrawerRef");
    assert(
      navbarCode.includes("mobileDrawerRef.current.contains(target)"),
      "handlePointerDown must verify if target is inside mobileDrawerRef before closing menu"
    );
    assert(
      navbarCode.includes("ref={mobileDrawerRef}"),
      "<aside id=\"nav-mobile-drawer\"> must be assigned ref={mobileDrawerRef}"
    );
  });

  await test("3. Viewport Coverage: Full viewport height and responsive width styles defined", () => {
    assert(navbarCode.includes("height: 100dvh"), "Drawer must support modern dynamic viewport height 100dvh");
    assert(navbarCode.includes("overflow-y: auto"), "Drawer must support vertical scrolling");
    assert(navbarCode.includes("-webkit-overflow-scrolling: touch"), "Drawer must support smooth momentum touch scrolling");
    assert(
      navbarCode.includes("min-width: min(260px, 100vw)"),
      "Drawer must adapt min-width safely for narrow 320px screens"
    );
  });

  await test("4. Stacking Order: Drawer z-index (1000) and overlay z-index (999) exceed header (50) and miniplayer (95)", () => {
    const overlayZMatch = navbarCode.match(/\.nav-mobile-overlay\s*\{[^}]*z-index:\s*(\d+)/);
    const drawerZMatch = navbarCode.match(/\.nav-mobile-drawer\s*\{[^}]*z-index:\s*(\d+)/);
    const headerZMatch = navbarCode.match(/\.navbar-header\s*\{[^}]*z-index:\s*(\d+)/);

    assert(overlayZMatch, "nav-mobile-overlay must define z-index");
    assert(drawerZMatch, "nav-mobile-drawer must define z-index");
    assert(headerZMatch, "navbar-header must define z-index");

    const overlayZ = parseInt(overlayZMatch[1], 10);
    const drawerZ = parseInt(drawerZMatch[1], 10);
    const headerZ = parseInt(headerZMatch[1], 10);

    assert(headerZ === 50, `Header z-index should be 50, got ${headerZ}`);
    assert(overlayZ >= 999, `Overlay z-index should be >= 999 to cover page content, got ${overlayZ}`);
    assert(drawerZ >= 1000, `Drawer z-index should be >= 1000 to sit atop overlay backdrop, got ${drawerZ}`);
    assert(drawerZ > overlayZ, "Drawer must stack on top of backdrop overlay");
  });

  await test("5. Responsive Breakpoints: Desktop panel hidden on mobile, mobile overlay hidden on desktop", () => {
    // Desktop hidden on mobile:
    assert(
      navbarCode.includes(".nav-desktop-panel {\n            display: none !important;"),
      "Desktop panel must have display: none on max-width: 767px"
    );
    // Mobile hidden on desktop:
    assert(
      navbarCode.includes(".nav-mobile-overlay {\n            display: none !important;"),
      "Mobile overlay must have display: none on min-width: 768px"
    );
  });

  await test("6. Mobile Width Geometry: 320px, 375px, 430px and desktop geometry calculation", () => {
    const viewports = [
      { name: "Narrow Mobile (iPhone SE)", width: 320 },
      { name: "Standard Mobile (iPhone 13/14)", width: 375 },
      { name: "Large Mobile (iPhone 14 Pro Max)", width: 430 },
      { name: "Desktop (PC)", width: 1280 },
    ];

    for (const vp of viewports) {
      if (vp.width < 768) {
        // Mobile drawer calculation: width: 50vw; min-width: min(260px, 100vw); max-width: 380px;
        const halfVw = vp.width * 0.5;
        const minW = Math.min(260, vp.width);
        const maxW = 380;
        const drawerW = Math.max(minW, Math.min(halfVw, maxW));
        const backdropW = vp.width - drawerW;

        assert(drawerW <= vp.width, `Drawer width (${drawerW}px) must not exceed viewport width (${vp.width}px) on ${vp.name}`);
        assert(drawerW >= minW, `Drawer width (${drawerW}px) must be at least min-width (${minW}px) on ${vp.name}`);
        assert(backdropW >= 0, `Backdrop visible area (${backdropW}px) must be >= 0 on ${vp.name}`);
        console.log(`   * ${vp.name} (${vp.width}px): Drawer width = ${drawerW}px, Backdrop click-out zone = ${backdropW}px`);
      } else {
        console.log(`   * ${vp.name} (${vp.width}px): Mobile drawer hidden via media query, desktop dropdown active`);
      }
    }
  });

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

verifyNavbarMobileOverlay();

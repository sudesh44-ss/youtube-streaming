export interface DynamicPalette {
  primary: string; // Vibrant accent color
  primaryHover: string;
  secondary: string;
  bgGlow: string; // Subtle accent glow
  bgGradient: string; // Top ambient gradient
  playButtonBg: string; // Play button gradient
  playButtonGlow: string; // Play button box-shadow
  badgeBg: string;
  textOnPrimary: string; // High-contrast text on primary
  borderHighlight: string;
}

// In-memory cache by image URL and theme mode
const paletteCache = new Map<string, DynamicPalette>();

export function getFallbackPalette(isDark: boolean): DynamicPalette {
  if (isDark) {
    return {
      primary: "#38bdf8",
      primaryHover: "#0ea5e9",
      secondary: "#818cf8",
      bgGlow: "rgba(56, 189, 248, 0.12)",
      bgGradient: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56, 189, 248, 0.15) 0%, rgba(17, 18, 18, 0) 80%)",
      playButtonBg: "linear-gradient(135deg, #38bdf8, #2563eb)",
      playButtonGlow: "0 0 35px rgba(56, 189, 248, 0.5)",
      badgeBg: "rgba(56, 189, 248, 0.15)",
      textOnPrimary: "#ffffff",
      borderHighlight: "rgba(56, 189, 248, 0.35)",
    };
  } else {
    return {
      primary: "#0284c7",
      primaryHover: "#0369a1",
      secondary: "#4f46e5",
      bgGlow: "rgba(2, 132, 199, 0.08)",
      bgGradient: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(2, 132, 199, 0.12) 0%, rgba(255, 255, 255, 0) 80%)",
      playButtonBg: "linear-gradient(135deg, #0284c7, #2563eb)",
      playButtonGlow: "0 0 25px rgba(2, 132, 199, 0.35)",
      badgeBg: "rgba(2, 132, 199, 0.12)",
      textOnPrimary: "#ffffff",
      borderHighlight: "rgba(2, 132, 199, 0.3)",
    };
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (h % 360 + 360) % 360;
  h /= 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateCoordinatedPalette(rgb: [number, number, number], isDark: boolean): DynamicPalette {
  const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

  // Ensure healthy saturation
  const adjustedS = Math.max(0.45, Math.min(s, 0.85));

  // Contrast-aware lightness adjustment
  // For dark mode: lightness between 0.55 and 0.65 ensures vibrant visibility against #111212
  // For light mode: lightness between 0.35 and 0.45 ensures legible contrast against #ffffff
  const primaryL = isDark ? 0.60 : 0.40;
  const hoverL = isDark ? 0.68 : 0.32;
  const secondaryL = isDark ? 0.65 : 0.45;

  const [pr, pg, pb] = hslToRgb(h, adjustedS, primaryL);
  const primary = rgbToHex(pr, pg, pb);

  const [hr, hg, hb] = hslToRgb(h, adjustedS, hoverL);
  const primaryHover = rgbToHex(hr, hg, hb);

  const [sr, sg, sb] = hslToRgb((h + 28) % 360, adjustedS * 0.9, secondaryL);
  const secondary = rgbToHex(sr, sg, sb);

  // Calculate relative luminance for text contrast
  const luminance = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255;
  const textOnPrimary = luminance > 0.65 ? "#0f172a" : "#ffffff";

  const glowAlpha = isDark ? 0.16 : 0.10;
  const bgGlow = `rgba(${pr}, ${pg}, ${pb}, ${glowAlpha})`;
  const bgGradient = isDark
    ? `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(${pr}, ${pg}, ${pb}, 0.20) 0%, rgba(17, 18, 18, 0) 80%)`
    : `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(${pr}, ${pg}, ${pb}, 0.12) 0%, rgba(255, 255, 255, 0) 80%)`;

  const playButtonBg = `linear-gradient(135deg, ${primary}, ${secondary})`;
  const playButtonGlow = isDark
    ? `0 0 35px rgba(${pr}, ${pg}, ${pb}, 0.5)`
    : `0 0 25px rgba(${pr}, ${pg}, ${pb}, 0.35)`;

  const badgeBg = `rgba(${pr}, ${pg}, ${pb}, ${isDark ? 0.15 : 0.12})`;
  const borderHighlight = `rgba(${pr}, ${pg}, ${pb}, ${isDark ? 0.35 : 0.28})`;

  return {
    primary,
    primaryHover,
    secondary,
    bgGlow,
    bgGradient,
    playButtonBg,
    playButtonGlow,
    badgeBg,
    textOnPrimary,
    borderHighlight,
  };
}

function extractDominantRgbFromImage(url: string): Promise<[number, number, number] | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);

        // Downsample to 32x32 for ultra-fast, smooth calculation
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);

        const data = ctx.getImageData(0, 0, 32, 32).data;
        let bestRgb: [number, number, number] | null = null;
        let maxVibrancy = -1;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent or semi-transparent pixels
          if (a < 180) continue;

          const [, s, l] = rgbToHsl(r, g, b);

          // Exclude extreme darks, extreme brights, and dull grays
          if (l < 0.15 || l > 0.88 || s < 0.20) continue;

          // Vibrancy score: prioritize saturation balanced around mid-tones
          const score = s * (1 - Math.abs(l - 0.5) * 1.5);
          if (score > maxVibrancy) {
            maxVibrancy = score;
            bestRgb = [r, g, b];
          }
        }

        resolve(bestRgb);
      } catch {
        // Tainted canvas or decode failure
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Extracts a dynamic palette from a video thumbnail image client-side.
 * Uses in-memory caching to ensure instantaneous subsequent lookups and no flicker.
 */
export async function extractPalette(imageUrl: string, isDark: boolean): Promise<DynamicPalette> {
  const cacheKey = `${imageUrl}_${isDark ? "dark" : "light"}`;
  const cached = paletteCache.get(cacheKey);
  if (cached) return cached;

  try {
    const dominantRgb = await extractDominantRgbFromImage(imageUrl);
    if (!dominantRgb) {
      const fallback = getFallbackPalette(isDark);
      paletteCache.set(cacheKey, fallback);
      return fallback;
    }

    const palette = generateCoordinatedPalette(dominantRgb, isDark);
    paletteCache.set(cacheKey, palette);
    return palette;
  } catch {
    const fallback = getFallbackPalette(isDark);
    paletteCache.set(cacheKey, fallback);
    return fallback;
  }
}

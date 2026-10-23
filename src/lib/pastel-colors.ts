export interface PastelColorStyle {
  bgLight: string;
  textLight: string;
  borderLight: string;
  bgDark: string;
  textDark: string;
  borderDark: string;
}

export const PASTEL_PALETTES: Record<string, PastelColorStyle> = {
  // 🌸 Pink
  pink: {
    bgLight: "#fce7f3",
    textLight: "#9d174d",
    borderLight: "rgba(244, 114, 182, 0.4)",
    bgDark: "rgba(244, 114, 182, 0.16)",
    textDark: "#f472b6",
    borderDark: "rgba(244, 114, 182, 0.3)",
  },
  // 💜 Lavender / Purple
  lavender: {
    bgLight: "#f3e8ff",
    textLight: "#6b21a8",
    borderLight: "rgba(168, 85, 247, 0.4)",
    bgDark: "rgba(168, 85, 247, 0.16)",
    textDark: "#c084fc",
    borderDark: "rgba(168, 85, 247, 0.3)",
  },
  // 🩵 Light Blue
  blue: {
    bgLight: "#e0f2fe",
    textLight: "#0369a1",
    borderLight: "rgba(56, 189, 248, 0.4)",
    bgDark: "rgba(56, 189, 248, 0.16)",
    textDark: "#38bdf8",
    borderDark: "rgba(56, 189, 248, 0.3)",
  },
  // 🍃 Mint Green
  mint: {
    bgLight: "#dcfce7",
    textLight: "#15803d",
    borderLight: "rgba(74, 222, 128, 0.4)",
    bgDark: "rgba(74, 222, 128, 0.16)",
    textDark: "#4ade80",
    borderDark: "rgba(74, 222, 128, 0.3)",
  },
  // 🍑 Soft Peach / Orange
  peach: {
    bgLight: "#ffedd5",
    textLight: "#c2410c",
    borderLight: "rgba(251, 146, 60, 0.4)",
    bgDark: "rgba(251, 146, 60, 0.16)",
    textDark: "#fb923c",
    borderDark: "rgba(251, 146, 60, 0.3)",
  },
  // 💛 Pale Yellow
  yellow: {
    bgLight: "#fef9c3",
    textLight: "#854d0e",
    borderLight: "rgba(250, 204, 21, 0.45)",
    bgDark: "rgba(250, 204, 21, 0.16)",
    textDark: "#facc15",
    borderDark: "rgba(250, 204, 21, 0.3)",
  },
  // 🩷 Soft Rose
  rose: {
    bgLight: "#ffe4e6",
    textLight: "#be123c",
    borderLight: "rgba(251, 113, 133, 0.4)",
    bgDark: "rgba(251, 113, 133, 0.16)",
    textDark: "#fb7185",
    borderDark: "rgba(251, 113, 133, 0.3)",
  },
};

// Explicit mappings specified in requirements
const EXPLICIT_MAPPINGS: Record<string, keyof typeof PASTEL_PALETTES> = {
  // Pink
  "lo-fi": "pink",
  "business law": "pink",
  "esports": "pink",
  "world news": "pink",

  // Lavender
  "classical": "lavender",
  "cybersecurity": "lavender",
  "game reviews": "lavender",
  "basketball": "lavender",

  // Light Blue
  "accounting": "blue",
  "web development": "blue",
  "anime trailers": "blue",
  "cricket": "blue",

  // Mint Green
  "economics": "mint",
  "android development": "mint",
  "walkthroughs": "mint",
  "football": "mint",
  "financial news": "mint",

  // Soft Peach
  "bollywood": "peach",
  "episode reviews": "peach",

  // Pale Yellow
  "comedy": "yellow",
  "tech news": "yellow",

  // Soft Rose
  "romance": "rose",
  "classic anime": "rose",
  "action": "rose",
};

const PALETTE_KEYS = ["pink", "lavender", "blue", "mint", "peach", "yellow", "rose"] as const;

/**
 * Deterministically maps any subcategory name to a soft pastel palette.
 */
export function getSubcategoryPalette(subcategory: string): PastelColorStyle {
  const normalized = subcategory.trim().toLowerCase();
  if (EXPLICIT_MAPPINGS[normalized]) {
    return PASTEL_PALETTES[EXPLICIT_MAPPINGS[normalized]];
  }

  // Deterministic fallback hash for other subcategories
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE_KEYS.length;
  return PASTEL_PALETTES[PALETTE_KEYS[index]];
}

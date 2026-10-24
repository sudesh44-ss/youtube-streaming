export type BrowsingMode = "normal" | "category";

export interface CategoryDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: string[];
  providerTypes: ("youtube" | "tmdb" | "spotify")[];
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: "study",
    name: "Study & Education",
    icon: "GraduationCap",
    description: "Curated lectures, academic courses, tutorials, and competitive exam prep",
    subcategories: [
      "Accounting",
      "Economics",
      "Business Law",
      "Commerce",
      "Competitive Exams",
      "Science",
      "Educational Tutorials",
    ],
    providerTypes: ["youtube"],
  },
  {
    id: "music",
    name: "Music & Audio",
    icon: "Music",
    description: "Official music videos, performances, lo-fi beats, instrumental, and curated playlists via YouTube",
    subcategories: [
      "Lo-fi",
      "Classical",
      "Bollywood",
      "Instrumental",
      "Bhajan",
      "Rock",
      "Workout Music",
    ],
    providerTypes: ["youtube"],
  },
  {
    id: "movies",
    name: "Movies & Cinema",
    icon: "Film",
    description: "Cinematic discovery, reviews, trailers, and film metadata powered by TMDB",
    subcategories: [
      "Action",
      "Comedy",
      "Romance",
      "Thriller",
      "Horror",
      "Science Fiction",
      "Animation",
    ],
    providerTypes: ["tmdb", "youtube"],
  },
  {
    id: "comedy",
    name: "Comedy",
    icon: "Laugh",
    description: "Stand-up specials, sketch comedy, funny clips, and satirical parodies",
    subcategories: [
      "Stand-up",
      "Sketches",
      "Sitcom Clips",
      "Parody",
      "Improv",
    ],
    providerTypes: ["youtube"],
  },
  {
    id: "technology",
    name: "Technology",
    icon: "Cpu",
    description: "Programming, AI, cybersecurity, systems engineering, and tech news",
    subcategories: [
      "Web Development",
      "Android Development",
      "Cybersecurity",
      "Artificial Intelligence",
      "Programming Tutorials",
      "Cloud & DevOps",
    ],
    providerTypes: ["youtube"],
  },
  {
    id: "gaming",
    name: "Gaming",
    icon: "Gamepad2",
    description: "Game walkthroughs, esports tournaments, reviews, and indie game showcases",
    subcategories: [
      "Game Reviews",
      "Walkthroughs",
      "Esports",
      "Indie Games",
      "Highlights",
    ],
    providerTypes: ["youtube"],
  },
  {
    id: "anime",
    name: "Anime & Animation",
    icon: "Sparkles",
    description: "Anime releases, animated shorts, trailers, and studio retrospectives",
    subcategories: [
      "Anime Trailers",
      "Episode Reviews",
      "Classic Anime",
      "Short Films",
    ],
    providerTypes: ["youtube", "tmdb"],
  },
  {
    id: "sports",
    name: "Sports",
    icon: "Trophy",
    description: "Match highlights, tactical analysis, athlete interviews, and fitness",
    subcategories: [
      "Football",
      "Cricket",
      "Basketball",
      "Highlights",
      "Tactical Analysis",
    ],
    providerTypes: ["youtube"],
  },
  {
    id: "news",
    name: "News & Insights",
    icon: "Newspaper",
    description: "Global headlines, science updates, technology developments, and financial reports",
    subcategories: [
      "World News",
      "Tech News",
      "Financial News",
      "Science Updates",
    ],
    providerTypes: ["youtube"],
  },
];

export interface NormalizedContentItem {
  id: string; // unique internal key: provider:providerId
  provider: "youtube" | "tmdb" | "spotify";
  providerId: string;
  contentType: "video" | "movie" | "tv" | "track" | "playlist";
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  subcategory?: string;
  language?: string;
  publicationDate?: string;
  creator?: string; // channel name, director, or artist
  channelId?: string; // YouTube channelId or provider creator ID
  externalUrl: string;
  playbackMethod: "iframe_embed" | "preview_audio" | "external_link";
  embedUrl?: string;
  providerAttribution: string;
  availabilityStatus: "available" | "preview_only" | "external_only";
  score?: number; // recommendation score
  saved?: boolean;
  duration?: string; // e.g. "14:08" or "18:24"
  views?: string; // e.g. "2.4M views"
  progressPercent?: number; // 0 - 100 for Continue Watching progress bar
  channelAvatar?: string; // avatar image url
  isShort?: boolean; // YouTube Short flag
}

export interface ProviderStatus {
  id: "youtube" | "tmdb" | "spotify";
  name: string;
  logo: string;
  description: string;
  requiredCredential: "API Key" | "Bearer Token" | "OAuth";
  status: "connected" | "not_connected" | "invalid_credentials" | "quota_exceeded" | "unavailable";
  lastValidatedAt?: number;
  maskedKey?: string;
  errorMessage?: string;
  setupGuideUrl: string;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: number;
  };
  preferences: {
    defaultMode: BrowsingMode;
    preferredCategories: string[];
    preferredLanguages: string[];
    country?: string;
    language?: "en" | "hi";
    theme: "light" | "dark" | "system";
    layoutDensity: "comfortable" | "compact";
    reducedMotion: boolean;
    highContrast: boolean;
    fontScale: "small" | "medium" | "large";
    emailAlerts: boolean;
    securityAlerts: boolean;
    inAppNotifications: boolean;
  };
}

export interface YouTubeChannelItem {
  id: string; // channelId, e.g. "UC_x5XG1OV2P6uZZ5FSM9Ttw"
  title: string;
  description: string;
  customUrl?: string; // handle, e.g. "@mkbhd"
  avatar: string;
  subscriberCount?: string; // e.g. "18.5M subscribers"
  subscriberCountRaw?: number;
  videoCount?: string;
  subscriptionStatus: "subscribed" | "not_subscribed" | "unknown";
  subscriptionId?: string;
  channelUrl: string;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  mode: BrowsingMode;
  language?: string;
  relevanceLanguage?: string;
  regionCode?: string;
  contentType?: string;
  videoType?: "all" | "shorts" | "videos";
  sortBy?: "relevance" | "date" | "title";
  limit?: number;
  pageToken?: string;
}

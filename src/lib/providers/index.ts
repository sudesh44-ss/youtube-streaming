import { IProviderAdapter } from "./types";
import { YouTubeAdapter } from "./youtube";
import { TMDBAdapter } from "./tmdb";
import { SpotifyAdapter } from "./spotify";
import { NormalizedContentItem, SearchFilters, ProviderStatus, CATEGORIES } from "../types";
import { getDb } from "../db";
import { decryptSecret } from "../crypto";

const adapters: Record<string, IProviderAdapter> = {
  youtube: new YouTubeAdapter(),
  tmdb: new TMDBAdapter(),
  spotify: new SpotifyAdapter(),
};

export function getAdapter(providerId: string): IProviderAdapter | null {
  return adapters[providerId] || null;
}

/**
 * Retrieves the decrypted API key for a specific user and provider.
 * Secrets are ONLY decrypted server-side for internal provider calls.
 */
export function getUserProviderKey(userId: string, providerId: string): string | null {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT encrypted_secret, iv, auth_tag, status
      FROM provider_credentials
      WHERE user_id = ? AND provider_id = ? AND status = 'connected'
    `).get(userId, providerId) as any;

    if (!row) return null;
    return decryptSecret(row.encrypted_secret, row.iv, row.auth_tag);
  } catch (err) {
    console.error(`Failed to retrieve decrypted credential for ${providerId}:`, err);
    return null;
  }
}

/**
 * Returns connection statuses of all providers for the API Connections Settings page.
 * Never exposes the plaintext credentials.
 */
export function getProviderStatusList(userId: string): ProviderStatus[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT provider_id, status, masked_key, last_validated_at, last_error
    FROM provider_credentials
    WHERE user_id = ?
  `).all(userId) as any[];

  const credsMap = new Map<string, any>();
  for (const r of rows) {
    credsMap.set(r.provider_id, r);
  }

  const providers: {
    id: "youtube" | "tmdb" | "spotify";
    name: string;
    logo: string;
    description: string;
    requiredCredential: "API Key" | "Bearer Token" | "OAuth";
    setupGuideUrl: string;
  }[] = [
    {
      id: "youtube",
      name: "YouTube Data API v3",
      logo: "Video",
      description: "Enables live video search, playlist discovery, educational lecture streaming, and verified playback metadata.",
      requiredCredential: "API Key",
      setupGuideUrl: "/help/connecting-youtube",
    },
    {
      id: "tmdb",
      name: "The Movie Database (TMDB)",
      logo: "Film",
      description: "Powers cinematic movie catalogs, ratings, posters, genres, actor overviews, and official trailer previews.",
      requiredCredential: "API Key",
      setupGuideUrl: "/help/connecting-tmdb",
    },
    {
      id: "spotify",
      name: "Spotify Music",
      logo: "Music",
      description: "Fetches official music release metadata, artist details, audio discovery tracks, and playlist links.",
      requiredCredential: "Bearer Token",
      setupGuideUrl: "/help/connecting-music-providers",
    },
  ];

  return providers.map((p) => {
    const record = credsMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      logo: p.logo,
      description: p.description,
      requiredCredential: p.requiredCredential,
      status: record?.status || "not_connected",
      lastValidatedAt: record?.last_validated_at || undefined,
      maskedKey: record?.masked_key || undefined,
      errorMessage: record?.last_error || undefined,
      setupGuideUrl: p.setupGuideUrl,
    };
  });
}

/**
 * Unified content query handler respecting Category Mode vs Normal Mode.
 */
export async function queryUnifiedContent(
  filters: SearchFilters,
  userId?: string
): Promise<NormalizedContentItem[]> {
  const mode = filters.mode;
  const category = filters.category;

  let activeAdapters: IProviderAdapter[] = [];

  if (mode === "category" && category) {
    const catDef = CATEGORIES.find((c) => c.id === category);
    const supportedProviders = catDef ? catDef.providerTypes : ["youtube"];
    activeAdapters = supportedProviders.map((pid) => adapters[pid]).filter(Boolean);
  } else {
    // Normal mode: query all adapters
    activeAdapters = Object.values(adapters);
  }

  // Execute searches across active adapters
  const resultsArrays = await Promise.all(
    activeAdapters.map(async (adapter) => {
      try {
        const key = userId ? getUserProviderKey(userId, adapter.id) : null;
        return await adapter.search(filters, key || undefined);
      } catch (e) {
        console.error(`Error querying provider ${adapter.id}:`, e);
        return [];
      }
    })
  );

  // Flatten and deduplicate
  const combined: NormalizedContentItem[] = [];
  const seenIds = new Set<string>();

  for (const arr of resultsArrays) {
    for (const item of arr) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);

        // Strict category filtering in Category Mode
        if (mode === "category" && category && item.category !== category) {
          continue;
        }

        combined.push(item);
      }
    }
  }

  // Check saved state if userId provided
  if (userId) {
    const db = getDb();
    const savedRows = db.prepare(`
      SELECT provider, content_id FROM saved_content WHERE user_id = ?
    `).all(userId) as any[];

    const savedSet = new Set(savedRows.map((r) => `${r.provider}:${r.content_id}`));
    for (const item of combined) {
      item.saved = savedSet.has(item.id);
    }
  }

  // Sort by date or title if requested
  if (filters.sortBy === "date") {
    combined.sort((a, b) => (b.publicationDate || "").localeCompare(a.publicationDate || ""));
  } else if (filters.sortBy === "title") {
    combined.sort((a, b) => a.title.localeCompare(b.title));
  }

  return combined;
}

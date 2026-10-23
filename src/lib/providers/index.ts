import { IProviderAdapter } from "./types";
import { YouTubeAdapter } from "./youtube";
import { TMDBAdapter } from "./tmdb";
import { NormalizedContentItem, SearchFilters, ProviderStatus, CATEGORIES } from "../types";
import { getDb } from "../db";
import { decryptSecret } from "../crypto";

const adapters: Record<string, IProviderAdapter> = {
  youtube: new YouTubeAdapter(),
  tmdb: new TMDBAdapter(),
};

export function getAdapter(providerId: string): IProviderAdapter | null {
  return adapters[providerId] || null;
}

/**
 * Retrieves the decrypted API key for a specific user and provider.
 * Secrets are ONLY decrypted server-side for internal provider calls.
 */
export function getUserProviderKey(userId: string | undefined, providerId: string): string | null {
  try {
    if (userId) {
      const db = getDb();
      const row = db.prepare(`
        SELECT encrypted_secret, iv, auth_tag, status
        FROM provider_credentials
        WHERE user_id = ? AND provider_id = ? AND status = 'connected'
      `).get(userId, providerId) as any;

      if (row) {
        return decryptSecret(row.encrypted_secret, row.iv, row.auth_tag);
      }
    }
  } catch (err) {
    console.error(`Failed to retrieve decrypted credential for ${providerId}:`, err);
  }

  // Preserve global environment fallback support
  if (providerId === "youtube" && process.env.YOUTUBE_API_KEY) {
    return process.env.YOUTUBE_API_KEY.trim();
  }
  if (providerId === "tmdb" && process.env.TMDB_API_KEY) {
    return process.env.TMDB_API_KEY.trim();
  }

  return null;
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
    id: "youtube" | "tmdb";
    name: string;
    logo: string;
    description: string;
    requiredCredential: "API Key";
    setupGuideUrl: string;
  }[] = [
    {
      id: "youtube",
      name: "YouTube Data API v3",
      logo: "Video",
      description: "Enables live video search, playlist discovery, educational lecture streaming, music tracks, and verified playback metadata.",
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
 * Unified content query handler respecting Category Mode vs Normal Mode, with pagination support.
 */
export async function queryUnifiedContentWithPagination(
  filters: SearchFilters,
  userId?: string
): Promise<{ items: NormalizedContentItem[]; nextPageToken?: string }> {
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

  let capturedNextPageToken: string | undefined = undefined;

  // Execute searches across active adapters
  const resultsArrays = await Promise.all(
    activeAdapters.map(async (adapter) => {
      try {
        const key = getUserProviderKey(userId, adapter.id);
        if (adapter.id === "youtube" && "searchWithPagination" in adapter) {
          const paginated = await (adapter as any).searchWithPagination(filters, key || undefined);
          if (paginated.nextPageToken) {
            capturedNextPageToken = paginated.nextPageToken;
          }
          return paginated.items || [];
        }
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

        // Strict videoType filtering
        if (filters.videoType === "shorts" && !item.isShort) {
          continue;
        }
        if (filters.videoType === "videos" && item.isShort) {
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

  // Strictly enforce maximum page size of 20 unique items
  const maxLimit = filters.limit ? Math.min(filters.limit, 20) : 20;
  return {
    items: combined.slice(0, maxLimit),
    nextPageToken: capturedNextPageToken,
  };
}

/**
 * Backward-compatible unified content query handler returning array of items.
 */
export async function queryUnifiedContent(
  filters: SearchFilters,
  userId?: string
): Promise<NormalizedContentItem[]> {
  const result = await queryUnifiedContentWithPagination(filters, userId);
  return result.items;
}

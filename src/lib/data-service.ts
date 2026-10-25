import crypto from "node:crypto";
import { isSupabaseServerConfigured, createServerSupabaseClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { getDb } from "./db";
import { encryptSecret, decryptSecret, maskApiKey } from "./crypto";
import { ProviderStatus } from "./types";
import { getGoogleOAuthCredentials } from "./oauth-config";

/**
 * Validates whether an identifier is a canonical UUID format.
 * Supabase auth.users IDs are UUIDs, while local SQLite IDs may be arbitrary strings.
 */
function isUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Standard default provider catalog for OmniDiscover.
 * Guaranteed to always be available even when offline or during transient errors.
 */
export const DEFAULT_PROVIDERS: ProviderStatus[] = [
  {
    id: "youtube",
    name: "YouTube Data API v3",
    logo: "Video",
    description:
      "Enables live video search, playlist discovery, educational lecture streaming, music tracks, and verified playback metadata.",
    requiredCredential: "API Key",
    setupGuideUrl: "/help/connecting-youtube",
    status: "not_connected",
  },
  {
    id: "tmdb",
    name: "The Movie Database (TMDB)",
    logo: "Film",
    description:
      "Powers cinematic movie catalogs, ratings, posters, genres, actor overviews, and official trailer previews.",
    requiredCredential: "API Key",
    setupGuideUrl: "/help/connecting-tmdb",
    status: "not_connected",
  },
];

/**
 * Resolves an active Supabase client.
 * Prefers admin client when SUPABASE_SERVICE_ROLE_KEY is available (e.g. background operations),
 * otherwise bridges using cookie-based createServerSupabaseClient.
 */
export async function getSupabase() {
  if (!isSupabaseServerConfigured()) return null;

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      // Fall through to server client
    }
  }

  try {
    return await createServerSupabaseClient();
  } catch {
    return null;
  }
}

// ==========================================
// 1. PROVIDER CREDENTIALS & STATUS
// ==========================================

export async function getProviderStatusListAsync(userId: string): Promise<ProviderStatus[]> {
  const credsMap = new Map<string, any>();

  // 1. Check Supabase first if configured and valid UUID
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from("provider_credentials")
        .select("provider_id, status, masked_key, last_validated_at, last_error")
        .eq("user_id", userId);

      if (!error && Array.isArray(data)) {
        for (const r of data) {
          credsMap.set(r.provider_id, r);
        }
      }
    } catch (err) {
      console.warn("Supabase provider_credentials fetch warning:", err);
    }
  }

  // 2. Check SQLite fallback if Supabase yielded nothing or wasn't configured
  if (credsMap.size === 0) {
    try {
      const db = getDb();
      const rows = db
        .prepare(
          `SELECT provider_id, status, masked_key, last_validated_at, last_error
           FROM provider_credentials
           WHERE user_id = ?`
        )
        .all(userId) as any[];

      for (const r of rows) {
        credsMap.set(r.provider_id, r);
      }
    } catch {
      // Safe fallback
    }
  }

  // Map into default catalog
  return DEFAULT_PROVIDERS.map((p) => {
    const record = credsMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      logo: p.logo,
      description: p.description,
      requiredCredential: p.requiredCredential,
      setupGuideUrl: p.setupGuideUrl,
      status: (record?.status as any) || "not_connected",
      maskedKey: record?.masked_key || undefined,
      lastValidatedAt: record?.last_validated_at
        ? typeof record.last_validated_at === "string"
          ? new Date(record.last_validated_at).getTime()
          : record.last_validated_at
        : undefined,
      errorMessage: record?.last_error || undefined,
    };
  });
}

export async function getUserProviderKeyAsync(
  userId: string | undefined,
  providerId: string
): Promise<string | null> {
  if (userId) {
    // 1. Try Supabase
    const supabase = await getSupabase();
    if (supabase && isUuid(userId)) {
      try {
        const { data, error } = await supabase
          .from("provider_credentials")
          .select("encrypted_secret, iv, auth_tag, status")
          .eq("user_id", userId)
          .eq("provider_id", providerId)
          .eq("status", "connected")
          .maybeSingle();

        if (!error && data?.encrypted_secret) {
          return decryptSecret(data.encrypted_secret, data.iv, data.auth_tag);
        }
      } catch (err) {
        console.warn(`Supabase key retrieval error for ${providerId}:`, err);
      }
    }

    // 2. Try SQLite
    try {
      const db = getDb();
      const row = db
        .prepare(
          `SELECT encrypted_secret, iv, auth_tag, status
           FROM provider_credentials
           WHERE user_id = ? AND provider_id = ? AND status = 'connected'`
        )
        .get(userId, providerId) as any;

      if (row) {
        return decryptSecret(row.encrypted_secret, row.iv, row.auth_tag);
      }
    } catch {
      // Safe fallback
    }
  }

  // 3. Fallback to global environment variables
  if (providerId === "youtube" && process.env.YOUTUBE_API_KEY) {
    return process.env.YOUTUBE_API_KEY.trim();
  }
  if (providerId === "tmdb" && process.env.TMDB_API_KEY) {
    return process.env.TMDB_API_KEY.trim();
  }

  return null;
}

export async function saveProviderCredential(
  userId: string,
  providerId: string,
  apiKey: string
): Promise<{ success: boolean; providerId: string; status: string; maskedKey: string; lastValidatedAt: number }> {
  const encrypted = encryptSecret(apiKey.trim());
  const masked = maskApiKey(apiKey.trim());
  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  // 1. Save to Supabase if configured and valid UUID
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { error } = await supabase.from("provider_credentials").upsert(
        {
          user_id: userId,
          provider_id: providerId,
          encrypted_secret: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
          status: "connected",
          masked_key: masked,
          last_validated_at: isoNow,
          last_error: null,
          updated_at: isoNow,
        },
        { onConflict: "user_id,provider_id" }
      );

      if (error) {
        console.warn("Supabase provider_credentials upsert error:", error.message);
      }
    } catch (e: any) {
      console.warn("Supabase provider_credentials upsert exception:", e.message);
    }
  }

  // 2. Sync to SQLite for local tests & dev
  try {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO provider_credentials (
        id, user_id, provider_id, encrypted_secret, iv, auth_tag, key_version, status, masked_key, last_validated_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'connected', ?, ?, ?, ?)
      ON CONFLICT(user_id, provider_id) DO UPDATE SET
        encrypted_secret = excluded.encrypted_secret,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        key_version = excluded.key_version,
        status = 'connected',
        masked_key = excluded.masked_key,
        last_validated_at = excluded.last_validated_at,
        last_error = NULL,
        updated_at = excluded.updated_at
    `).run(
      id,
      userId,
      providerId,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      encrypted.keyVersion,
      masked,
      now,
      now,
      now
    );
  } catch {
    // SQLite sync
  }

  return {
    success: true,
    providerId,
    status: "connected",
    maskedKey: masked,
    lastValidatedAt: now,
  };
}

export async function disconnectProviderCredential(
  userId: string,
  providerId: string
): Promise<{ success: boolean; providerId: string; status: string }> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase
        .from("provider_credentials")
        .delete()
        .eq("user_id", userId)
        .eq("provider_id", providerId);
    } catch {
      // Safe fallback
    }
  }

  try {
    const db = getDb();
    db.prepare("DELETE FROM provider_credentials WHERE user_id = ? AND provider_id = ?").run(
      userId,
      providerId
    );
  } catch {
    // Safe fallback
  }

  return {
    success: true,
    providerId,
    status: "not_connected",
  };
}

// ==========================================
// 2. WATCH HISTORY & PROGRESS
// ==========================================

export async function getWatchProgressForUser(userId: string): Promise<any[]> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from("watch_history")
        .select(
          "content_id, provider, title, channel_name, thumbnail_url, duration_seconds, progress_seconds, progress_percent, completed, updated_at"
        )
        .eq("user_id", userId)
        .gt("progress_percent", 0)
        .eq("completed", false)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          ...d,
          updated_at: typeof d.updated_at === "string" ? new Date(d.updated_at).getTime() : d.updated_at,
        }));
      }
    } catch (err) {
      console.warn("Supabase watch_history fetch error:", err);
    }
  }

  try {
    const db = getDb();
    return db
      .prepare(
        `SELECT content_id, provider, title, channel_name, thumbnail_url,
                duration_seconds, progress_seconds, progress_percent, completed, updated_at
         FROM watch_history
         WHERE user_id = ? AND progress_percent > 0 AND completed = 0
         ORDER BY updated_at DESC
         LIMIT 10`
      )
      .all(userId) as any[];
  } catch {
    return [];
  }
}

export async function saveWatchProgressForUser(
  userId: string,
  item: {
    contentId: string;
    provider?: string;
    title: string;
    channelName?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    progressSeconds?: number;
  }
): Promise<{ success: boolean; percent: number }> {
  const provider = item.provider || "youtube";
  const duration = Math.max(0, Number(item.durationSeconds) || 0);
  const progress = Math.max(0, Number(item.progressSeconds) || 0);
  const percent = duration > 0 ? Math.min(100, Math.round((progress / duration) * 100)) : 0;
  const completed = percent >= 92;
  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("watch_history").upsert(
        {
          user_id: userId,
          content_id: item.contentId,
          provider,
          title: item.title,
          channel_name: item.channelName || "",
          thumbnail_url: item.thumbnailUrl || "",
          duration_seconds: duration,
          progress_seconds: progress,
          progress_percent: percent,
          completed,
          updated_at: isoNow,
        },
        { onConflict: "user_id,provider,content_id" }
      );
    } catch {
      // Safe fallback
    }
  }

  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO watch_history (
        id, user_id, content_id, provider, title, channel_name, thumbnail_url,
        duration_seconds, progress_seconds, progress_percent, completed, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider, content_id) DO UPDATE SET
        progress_seconds = excluded.progress_seconds,
        progress_percent = excluded.progress_percent,
        completed = excluded.completed,
        updated_at = excluded.updated_at
    `).run(
      crypto.randomUUID(),
      userId,
      item.contentId,
      provider,
      item.title,
      item.channelName || "",
      item.thumbnailUrl || "",
      duration,
      progress,
      percent,
      completed ? 1 : 0,
      now
    );
  } catch {
    // Graceful
  }

  // Incrementally update persistent recommendation profile
  updateRecommendationProfileFromActivityAsync(userId, {
    type: "watch",
    channelName: item.channelName,
    contentId: item.contentId,
    watchSeconds: progress,
    completed,
  }).catch(() => {});

  return { success: true, percent };
}

// ==========================================
// 3. SEARCH HISTORY
// ==========================================

export async function getSearchHistoryForUser(userId: string): Promise<any[]> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("query, category, mode, searched_at")
        .eq("user_id", userId)
        .order("searched_at", { ascending: false })
        .limit(30);

      if (!error && Array.isArray(data)) {
        const seen = new Set<string>();
        const unique: any[] = [];
        for (const r of data) {
          if (!seen.has(r.query)) {
            seen.add(r.query);
            unique.push({
              query: r.query,
              category: r.category,
              mode: r.mode,
              searched_at: typeof r.searched_at === "string" ? new Date(r.searched_at).getTime() : r.searched_at,
            });
          }
        }
        return unique.slice(0, 15);
      }
    } catch (err) {
      console.warn("Supabase search_history fetch error:", err);
    }
  }

  try {
    const db = getDb();
    return db
      .prepare(
        `SELECT DISTINCT query, category, mode, MAX(searched_at) as searched_at
         FROM search_history
         WHERE user_id = ?
         GROUP BY query
         ORDER BY searched_at DESC
         LIMIT 15`
      )
      .all(userId) as any[];
  } catch {
    return [];
  }
}

export async function clearSearchHistoryForUser(userId: string): Promise<void> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("search_history").delete().eq("user_id", userId);
    } catch {
      // Safe fallback
    }
  }

  try {
    const db = getDb();
    db.prepare("DELETE FROM search_history WHERE user_id = ?").run(userId);
  } catch {
    // Graceful
  }
}

export async function recordSearchHistory(
  userId: string,
  query: string,
  category?: string | null,
  mode: string = "normal"
): Promise<void> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("search_history").insert({
        user_id: userId,
        query: query.trim(),
        category: category || null,
        mode,
        searched_at: new Date().toISOString(),
      });
    } catch {
      // Safe fallback
    }
  }

  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO search_history (id, user_id, query, category, mode, searched_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), userId, query.trim(), category || null, mode, Date.now());
  } catch {
    // Safe fallback
  }

  // Incrementally update persistent recommendation profile with search interest
  updateRecommendationProfileFromActivityAsync(userId, {
    type: "search",
    query,
    category: category || undefined,
  }).catch(() => {});
}

// ==========================================
// 4. SAVED CONTENT (WATCHLIST)
// ==========================================

export async function getSavedContentForUser(userId: string): Promise<any[]> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from("saved_content")
        .select("*")
        .eq("user_id", userId)
        .order("saved_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((r: any) => {
          let meta = {};
          if (r.metadata) {
            meta = typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata;
          }
          return {
            id: `${r.provider}:${r.content_id}`,
            provider: r.provider,
            providerId: r.content_id,
            contentType: r.content_type,
            title: r.title,
            description: r.description,
            thumbnail: r.thumbnail_url,
            category: r.category,
            externalUrl: r.external_url,
            savedAt: typeof r.saved_at === "string" ? new Date(r.saved_at).getTime() : r.saved_at,
            saved: true,
            ...meta,
          };
        });
      }
    } catch (err) {
      console.warn("Supabase saved_content fetch error:", err);
    }
  }

  try {
    const db = getDb();
    const rows = db
      .prepare(`SELECT * FROM saved_content WHERE user_id = ? ORDER BY saved_at DESC`)
      .all(userId) as any[];

    return rows.map((r) => {
      let meta = {};
      try {
        if (r.metadata) meta = JSON.parse(r.metadata);
      } catch {}

      return {
        id: `${r.provider}:${r.content_id}`,
        provider: r.provider,
        providerId: r.content_id,
        contentType: r.content_type,
        title: r.title,
        description: r.description,
        thumbnail: r.thumbnail_url,
        category: r.category,
        externalUrl: r.external_url,
        savedAt: r.saved_at,
        saved: true,
        ...meta,
      };
    });
  } catch {
    return [];
  }
}

export async function saveContentForUser(userId: string, body: any): Promise<void> {
  const { provider, contentId, contentType, title, description, thumbnail, category, externalUrl, metadata } = body;
  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("saved_content").upsert(
        {
          user_id: userId,
          provider,
          content_id: contentId,
          content_type: contentType || "video",
          title,
          description: description || "",
          thumbnail_url: thumbnail || "",
          category: category || "general",
          external_url: externalUrl || "",
          metadata: metadata || null,
          saved_at: isoNow,
        },
        { onConflict: "user_id,provider,content_id" }
      );
    } catch (error) {
      console.warn("Supabase saved_content upsert warning:", error);
    }
  }

  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO saved_content (
        id, user_id, provider, content_id, content_type, title, description, thumbnail_url, category, external_url, metadata, saved_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId,
      provider,
      contentId,
      contentType || "video",
      title,
      description || "",
      thumbnail || "",
      category || "general",
      externalUrl || "",
      metadata ? JSON.stringify(metadata) : null,
      now
    );
  } catch {
    // Graceful
  }
}

export async function deleteSavedContentForUser(
  userId: string,
  provider: string,
  contentId: string
): Promise<void> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase
        .from("saved_content")
        .delete()
        .eq("user_id", userId)
        .eq("provider", provider)
        .eq("content_id", contentId);
    } catch {
      // Safe fallback
    }
  }

  try {
    const db = getDb();
    db.prepare("DELETE FROM saved_content WHERE user_id = ? AND provider = ? AND content_id = ?").run(
      userId,
      provider,
      contentId
    );
  } catch {
    // Graceful
  }
}

// ==========================================
// 5. USER PREFERENCES & PROFILE
// ==========================================

export async function updateUserPreferences(userId: string, prefs: any): Promise<void> {
  let mergedLanguages: string[] | undefined = undefined;
  if (prefs.preferredLanguages || prefs.language || prefs.country) {
    const rawLangs: string[] = prefs.preferredLanguages || (prefs.language ? [prefs.language] : ["en"]);
    const clean = rawLangs.filter((l) => typeof l === "string" && !l.startsWith("country:"));
    if (prefs.country) {
      clean.push(`country:${prefs.country.toUpperCase()}`);
    }
    mergedLanguages = clean;
  }

  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const payload: any = {
        user_id: userId,
        default_mode: prefs.defaultMode,
        preferred_categories: prefs.preferredCategories,
        preferred_languages: mergedLanguages !== undefined ? mergedLanguages : prefs.preferredLanguages,
        theme: prefs.theme,
        layout_density: prefs.layoutDensity,
        reduced_motion: prefs.reducedMotion !== undefined ? Boolean(prefs.reducedMotion) : undefined,
        high_contrast: prefs.highContrast !== undefined ? Boolean(prefs.highContrast) : undefined,
        font_scale: prefs.fontScale,
        email_alerts: prefs.emailAlerts !== undefined ? Boolean(prefs.emailAlerts) : undefined,
        security_alerts: prefs.securityAlerts !== undefined ? Boolean(prefs.securityAlerts) : undefined,
        in_app_notifications:
          prefs.inAppNotifications !== undefined ? Boolean(prefs.inAppNotifications) : undefined,
        updated_at: new Date().toISOString(),
      };
      if (prefs.country) {
        payload.country = prefs.country.toUpperCase();
      }

      const { error } = await supabase.from("user_preferences").upsert(payload, { onConflict: "user_id" });
      if (error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("country"))) {
        // If 'country' column is not yet present on remote Supabase table, retry without 'country' property
        // The country preference is safely preserved inside preferred_languages!
        delete payload.country;
        await supabase.from("user_preferences").upsert(payload, { onConflict: "user_id" });
      }
    } catch (e) {
      console.warn("Supabase preferences update error:", e);
    }
  }

  try {
    const db = getDb();
    db.prepare(`
      UPDATE user_preferences SET
        default_mode = COALESCE(?, default_mode),
        preferred_categories = COALESCE(?, preferred_categories),
        preferred_languages = COALESCE(?, preferred_languages),
        country = COALESCE(?, country),
        theme = COALESCE(?, theme),
        layout_density = COALESCE(?, layout_density),
        reduced_motion = COALESCE(?, reduced_motion),
        high_contrast = COALESCE(?, high_contrast),
        font_scale = COALESCE(?, font_scale),
        email_alerts = COALESCE(?, email_alerts),
        security_alerts = COALESCE(?, security_alerts),
        in_app_notifications = COALESCE(?, in_app_notifications),
        updated_at = ?
      WHERE user_id = ?
    `).run(
      prefs.defaultMode !== undefined ? prefs.defaultMode : null,
      prefs.preferredCategories !== undefined ? JSON.stringify(prefs.preferredCategories) : null,
      mergedLanguages !== undefined ? JSON.stringify(mergedLanguages) : (prefs.preferredLanguages !== undefined ? JSON.stringify(prefs.preferredLanguages) : null),
      prefs.country !== undefined ? prefs.country.toUpperCase() : null,
      prefs.theme !== undefined ? prefs.theme : null,
      prefs.layoutDensity !== undefined ? prefs.layoutDensity : null,
      prefs.reducedMotion !== undefined ? (prefs.reducedMotion ? 1 : 0) : null,
      prefs.highContrast !== undefined ? (prefs.highContrast ? 1 : 0) : null,
      prefs.fontScale !== undefined ? prefs.fontScale : null,
      prefs.emailAlerts !== undefined ? (prefs.emailAlerts ? 1 : 0) : null,
      prefs.securityAlerts !== undefined ? (prefs.securityAlerts ? 1 : 0) : null,
      prefs.inAppNotifications !== undefined ? (prefs.inAppNotifications ? 1 : 0) : null,
      Date.now(),
      userId
    );
  } catch {
    // Graceful
  }
}

export async function updateUserProfile(userId: string, name: string): Promise<void> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("profiles").update({ name, updated_at: new Date().toISOString() }).eq("id", userId);
      await supabase
        .from("user_preferences")
        .upsert({ user_id: userId, display_name: name, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    } catch (e) {
      console.warn("Supabase profile update error:", e);
    }
  }

  try {
    const db = getDb();
    db.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(name, Date.now(), userId);
    db.prepare("UPDATE user_preferences SET display_name = ?, updated_at = ? WHERE user_id = ?").run(
      name,
      Date.now(),
      userId
    );
  } catch {
    // Graceful
  }
}

// ==========================================
// 6. RECOMMENDATION SIGNALS
// ==========================================

export interface WatchedVideoSummary {
  contentId: string;
  channelName: string;
  durationSeconds: number;
  progressPercent: number;
  completed: boolean;
  abandoned: boolean;
  updatedAt: number;
}

export interface UserRecommendationSignals {
  preferredCategories: string[];
  savedCategoryCounts: Record<string, number>;
  recentSearchKeywords: string[];
  country?: string;
  watchedVideos?: WatchedVideoSummary[];
  topWatchedCreators?: Record<string, number>;
  negativeContentIds?: string[];
  likedContentIds?: string[];
}

export async function getUserRecommendationSignalsAsync(
  userId: string
): Promise<UserRecommendationSignals> {
  let preferredCategories: string[] = [];
  const savedCategoryCounts: Record<string, number> = {};
  let recentSearchKeywords: string[] = [];
  let country: string | undefined = undefined;
  const watchedVideos: WatchedVideoSummary[] = [];
  const topWatchedCreators: Record<string, number> = {};
  let negativeContentIds: string[] = [];
  let likedContentIds: string[] = [];

  // 30-Day Activity Retention window cutoff
  const retentionCutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const retentionCutoffIso = new Date(retentionCutoffMs).toISOString();

  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const [prefRes, savedRes, searchRes, watchRes, feedbackRes] = await Promise.all([
        supabase.from("user_preferences").select("preferred_categories, preferred_languages, country").eq("user_id", userId).maybeSingle(),
        supabase.from("saved_content").select("category, content_id").eq("user_id", userId),
        supabase.from("search_history").select("query").eq("user_id", userId).gte("searched_at", retentionCutoffIso).order("searched_at", { ascending: false }).limit(10),
        supabase.from("watch_history").select("content_id, channel_name, duration_seconds, progress_seconds, progress_percent, completed, updated_at").eq("user_id", userId).gte("updated_at", retentionCutoffIso).order("updated_at", { ascending: false }).limit(40),
        supabase.from("content_feedback").select("content_id, feedback_type").eq("user_id", userId),
      ]);

      if (!prefRes.error && prefRes.data?.preferred_categories) {
        preferredCategories = Array.isArray(prefRes.data.preferred_categories)
          ? prefRes.data.preferred_categories
          : typeof prefRes.data.preferred_categories === "string"
          ? JSON.parse(prefRes.data.preferred_categories)
          : [];
      }

      if (!prefRes.error && prefRes.data?.country) {
        country = prefRes.data.country.toUpperCase();
      } else if (!prefRes.error && prefRes.data?.preferred_languages) {
        const raw = Array.isArray(prefRes.data.preferred_languages)
          ? prefRes.data.preferred_languages
          : typeof prefRes.data.preferred_languages === "string"
          ? JSON.parse(prefRes.data.preferred_languages)
          : [];
        for (const item of raw) {
          if (typeof item === "string" && item.startsWith("country:")) {
            country = item.replace("country:", "").toUpperCase();
          }
        }
      }

      if (!savedRes.error && Array.isArray(savedRes.data)) {
        for (const row of savedRes.data) {
          if (row.category) {
            savedCategoryCounts[row.category] = (savedCategoryCounts[row.category] || 0) + 1;
          }
        }
      }

      if (!searchRes.error && Array.isArray(searchRes.data)) {
        recentSearchKeywords = searchRes.data
          .map((r: any) => (r.query || "").toLowerCase())
          .filter(Boolean);
      }

      if (!watchRes.error && Array.isArray(watchRes.data)) {
        for (const r of watchRes.data) {
          const duration = Number(r.duration_seconds) || 0;
          const progress = Number(r.progress_seconds) || 0;
          const percent = Number(r.progress_percent) || 0;
          const completed = Boolean(r.completed) || percent >= 85;
          const abandoned = !completed && duration > 60 && percent < 10 && progress < 15;
          const channel = (r.channel_name || "").trim();

          watchedVideos.push({
            contentId: r.content_id,
            channelName: channel,
            durationSeconds: duration,
            progressPercent: percent,
            completed,
            abandoned,
            updatedAt: typeof r.updated_at === "string" ? new Date(r.updated_at).getTime() : Date.now(),
          });

          if (channel) {
            topWatchedCreators[channel] = (topWatchedCreators[channel] || 0) + (completed ? 3 : abandoned ? 0 : 1);
          }
        }
      }

      if (!feedbackRes.error && Array.isArray(feedbackRes.data)) {
        negativeContentIds = feedbackRes.data
          .filter((f: any) => f.feedback_type === "not_interested" || f.feedback_type === "dislike")
          .map((f: any) => f.content_id);
        likedContentIds = feedbackRes.data
          .filter((f: any) => f.feedback_type === "like")
          .map((f: any) => f.content_id);
      }

      // Merge persistent learned recommendation profile to preserve affinities across 30-day purge
      const persistentProfile = await getUserRecommendationProfileAsync(userId);
      mergePersistentProfileIntoSignals(persistentProfile, {
        savedCategoryCounts,
        topWatchedCreators,
        recentSearchKeywords,
        negativeContentIds,
        likedContentIds,
      });

      return {
        preferredCategories,
        savedCategoryCounts,
        recentSearchKeywords,
        country,
        watchedVideos,
        topWatchedCreators,
        negativeContentIds,
        likedContentIds,
      };
    } catch (e) {
      console.warn("Supabase recommendation signals warning:", e);
    }
  }

  // SQLite fallback for local test runner and development
  try {
    const db = getDb();
    const prefRow = db.prepare("SELECT preferred_categories, preferred_languages, country FROM user_preferences WHERE user_id = ?").get(userId) as any;
    if (prefRow?.preferred_categories) {
      preferredCategories = JSON.parse(prefRow.preferred_categories);
    }
    if (prefRow?.country) {
      country = prefRow.country.toUpperCase();
    } else if (prefRow?.preferred_languages) {
      try {
        const parsed = JSON.parse(prefRow.preferred_languages);
        for (const item of parsed) {
          if (typeof item === "string" && item.startsWith("country:")) {
            country = item.replace("country:", "").toUpperCase();
          }
        }
      } catch {}
    }

    const savedRows = db.prepare("SELECT category FROM saved_content WHERE user_id = ?").all(userId) as any[];
    for (const row of savedRows) {
      savedCategoryCounts[row.category] = (savedCategoryCounts[row.category] || 0) + 1;
    }

    const searchRows = db.prepare("SELECT query FROM search_history WHERE user_id = ? AND searched_at >= ? ORDER BY searched_at DESC LIMIT 10").all(userId, retentionCutoffMs) as any[];
    recentSearchKeywords = searchRows.map((r) => r.query.toLowerCase());

    const watchRows = db.prepare("SELECT content_id, channel_name, duration_seconds, progress_seconds, progress_percent, completed, updated_at FROM watch_history WHERE user_id = ? AND updated_at >= ? ORDER BY updated_at DESC LIMIT 40").all(userId, retentionCutoffMs) as any[];
    for (const r of watchRows) {
      const duration = Number(r.duration_seconds) || 0;
      const progress = Number(r.progress_seconds) || 0;
      const percent = Number(r.progress_percent) || 0;
      const completed = Boolean(r.completed) || percent >= 85;
      const abandoned = !completed && duration > 60 && percent < 10 && progress < 15;
      const channel = (r.channel_name || "").trim();

      watchedVideos.push({
        contentId: r.content_id,
        channelName: channel,
        durationSeconds: duration,
        progressPercent: percent,
        completed,
        abandoned,
        updatedAt: Number(r.updated_at) || Date.now(),
      });

      if (channel) {
        topWatchedCreators[channel] = (topWatchedCreators[channel] || 0) + (completed ? 3 : abandoned ? 0 : 1);
      }
    }

    const feedbackRows = db.prepare("SELECT content_id, feedback_type FROM content_feedback WHERE user_id = ?").all(userId) as any[];
    negativeContentIds = feedbackRows
      .filter((f) => f.feedback_type === "not_interested" || f.feedback_type === "dislike")
      .map((f) => f.content_id);
    likedContentIds = feedbackRows
      .filter((f) => f.feedback_type === "like")
      .map((f) => f.content_id);
  } catch {
    // Non-fatal
  }

  // Merge persistent learned recommendation profile to preserve affinities across 30-day purge
  const persistentProfile = await getUserRecommendationProfileAsync(userId);
  mergePersistentProfileIntoSignals(persistentProfile, {
    savedCategoryCounts,
    topWatchedCreators,
    recentSearchKeywords,
    negativeContentIds,
    likedContentIds,
  });

  return {
    preferredCategories,
    savedCategoryCounts,
    recentSearchKeywords,
    country,
    watchedVideos,
    topWatchedCreators,
    negativeContentIds,
    likedContentIds,
  };
}

// ==========================================
// 7. SAVED ITEM IDS (FOR DISCOVERY OVERLAY)
// ==========================================

export async function getUserSavedItemIdsAsync(userId: string): Promise<Set<string>> {
  const savedSet = new Set<string>();

  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from("saved_content")
        .select("provider, content_id")
        .eq("user_id", userId);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          savedSet.add(`${row.provider}:${row.content_id}`);
        }
        return savedSet;
      }
    } catch {
      // Non-fatal
    }
  }

  try {
    const db = getDb();
    const rows = db.prepare("SELECT provider, content_id FROM saved_content WHERE user_id = ?").all(userId) as any[];
    for (const row of rows) {
      savedSet.add(`${row.provider}:${row.content_id}`);
    }
  } catch {
    // Non-fatal
  }

  return savedSet;
}

// ==========================================
// 8. OAUTH CONNECTIONS
// ==========================================

export interface OAuthConnectionRecord {
  channelTitle?: string;
  connectedAt?: number;
  accessToken?: string;
  expiresAt?: number;
  scope?: string;
}

async function refreshGoogleAccessToken(
  userId: string,
  provider: string,
  encryptedRefreshToken: string,
  refreshIv: string,
  refreshAuthTag: string,
  channelId?: string | null,
  channelTitle?: string | null,
  scope?: string | null
): Promise<string | null> {
  try {
    const refreshToken = decryptSecret(encryptedRefreshToken, refreshIv, refreshAuthTag);
    const { clientId, clientSecret } = getGoogleOAuthCredentials();

    if (!clientId || !clientSecret || !refreshToken) {
      return null;
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.warn("Failed to refresh Google OAuth token:", await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      const expiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
      const { ciphertext: encAcc, iv: accIv, authTag: accTag } = encryptSecret(data.access_token);

      await saveOAuthConnectionAsync({
        userId,
        provider,
        encryptedAccessToken: encAcc,
        iv: accIv,
        authTag: accTag,
        encryptedRefreshToken,
        refreshIv,
        refreshAuthTag,
        expiresAt,
        scope: data.scope || scope,
        channelId,
        channelTitle,
      });

      return data.access_token;
    }
  } catch (err) {
    console.warn("refreshGoogleAccessToken error:", err);
  }
  return null;
}

export async function getOAuthConnectionAsync(
  userId: string,
  provider: string = "youtube"
): Promise<OAuthConnectionRecord | null> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from("oauth_connections")
        .select("channel_title, updated_at, encrypted_access_token, iv, auth_tag, expires_at, encrypted_refresh_token, refresh_iv, refresh_auth_tag, scope, channel_id")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();

      if (!error && data) {
        let accessToken: string | undefined = undefined;

        // Auto-refresh token if expired or expiring within 60s
        if (
          data.expires_at &&
          data.expires_at <= Date.now() + 60000 &&
          data.encrypted_refresh_token &&
          data.refresh_iv &&
          data.refresh_auth_tag
        ) {
          const refreshed = await refreshGoogleAccessToken(
            userId,
            provider,
            data.encrypted_refresh_token,
            data.refresh_iv,
            data.refresh_auth_tag,
            data.channel_id,
            data.channel_title,
            data.scope
          );
          if (refreshed) {
            accessToken = refreshed;
          }
        }

        if (!accessToken && data.encrypted_access_token && data.iv && data.auth_tag) {
          try {
            accessToken = decryptSecret(data.encrypted_access_token, data.iv, data.auth_tag);
          } catch {
            // Decrypt error
          }
        }
        return {
          channelTitle: data.channel_title,
          connectedAt: typeof data.updated_at === "string" ? new Date(data.updated_at).getTime() : data.updated_at,
          accessToken,
          expiresAt: data.expires_at,
          scope: data.scope || undefined,
        };
      }
    } catch {
      // Non-fatal schema cache or network fallback
    }
  }

  try {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT channel_title, updated_at, encrypted_access_token, iv, auth_tag, expires_at, encrypted_refresh_token, refresh_iv, refresh_auth_tag, scope, channel_id FROM oauth_connections WHERE user_id = ? AND provider = ?"
      )
      .get(userId, provider) as any;

    if (row) {
      let accessToken: string | undefined = undefined;

      // Auto-refresh token if expired or expiring within 60s
      if (
        row.expires_at &&
        row.expires_at <= Date.now() + 60000 &&
        row.encrypted_refresh_token &&
        row.refresh_iv &&
        row.refresh_auth_tag
      ) {
        const refreshed = await refreshGoogleAccessToken(
          userId,
          provider,
          row.encrypted_refresh_token,
          row.refresh_iv,
          row.refresh_auth_tag,
          row.channel_id,
          row.channel_title,
          row.scope
        );
        if (refreshed) {
          accessToken = refreshed;
        }
      }

      if (!accessToken && row.encrypted_access_token && row.iv && row.auth_tag) {
        try {
          accessToken = decryptSecret(row.encrypted_access_token, row.iv, row.auth_tag);
        } catch {
          // Decrypt error
        }
      }
      return {
        channelTitle: row.channel_title,
        connectedAt: row.updated_at,
        accessToken,
        expiresAt: row.expires_at,
        scope: row.scope || undefined,
      };
    }
  } catch {
    // Non-fatal
  }

  return null;
}

export interface SaveOAuthConnectionParams {
  userId: string;
  provider: string;
  encryptedAccessToken: string;
  iv: string;
  authTag: string;
  encryptedRefreshToken?: string | null;
  refreshIv?: string | null;
  refreshAuthTag?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  channelId?: string | null;
  channelTitle?: string | null;
}

export async function saveOAuthConnectionAsync(params: SaveOAuthConnectionParams): Promise<void> {
  const {
    userId,
    provider,
    encryptedAccessToken,
    iv,
    authTag,
    encryptedRefreshToken,
    refreshIv,
    refreshAuthTag,
    expiresAt,
    scope,
    channelId,
    channelTitle,
  } = params;

  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  // 1. Supabase persistence
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { error: sbError } = await supabase.from("oauth_connections").upsert(
        {
          user_id: userId,
          provider,
          encrypted_access_token: encryptedAccessToken,
          iv,
          auth_tag: authTag,
          encrypted_refresh_token: encryptedRefreshToken || null,
          refresh_iv: refreshIv || null,
          refresh_auth_tag: refreshAuthTag || null,
          expires_at: expiresAt || null,
          scope: scope || null,
          channel_id: channelId || null,
          channel_title: channelTitle || "Connected YouTube Account",
          updated_at: isoNow,
        },
        { onConflict: "user_id,provider" }
      );
      if (sbError) {
        console.warn("Supabase saveOAuthConnectionAsync warning:", sbError.message, sbError.code);
      }
    } catch (err) {
      console.warn("Supabase saveOAuthConnectionAsync warning:", err);
    }
  }

  // 2. SQLite persistence
  try {
    const db = getDb();
    const connId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO oauth_connections (
        id, user_id, provider, encrypted_access_token, iv, auth_tag,
        encrypted_refresh_token, refresh_iv, refresh_auth_tag,
        expires_at, scope, channel_id, channel_title, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        encrypted_access_token = excluded.encrypted_access_token,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        encrypted_refresh_token = COALESCE(excluded.encrypted_refresh_token, oauth_connections.encrypted_refresh_token),
        refresh_iv = COALESCE(excluded.refresh_iv, oauth_connections.refresh_iv),
        refresh_auth_tag = COALESCE(excluded.refresh_auth_tag, oauth_connections.refresh_auth_tag),
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        channel_id = COALESCE(excluded.channel_id, oauth_connections.channel_id),
        channel_title = excluded.channel_title,
        updated_at = excluded.updated_at
    `).run(
      connId,
      userId,
      provider,
      encryptedAccessToken,
      iv,
      authTag,
      encryptedRefreshToken || null,
      refreshIv || null,
      refreshAuthTag || null,
      expiresAt || null,
      scope || null,
      channelId || null,
      channelTitle || "Connected YouTube Account",
      now,
      now
    );
  } catch (err) {
    console.warn("SQLite saveOAuthConnection warning:", err);
  }
}

export async function deleteOAuthConnectionAsync(userId: string, provider: string = "youtube"): Promise<void> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase
        .from("oauth_connections")
        .delete()
        .eq("user_id", userId)
        .eq("provider", provider);
    } catch (err) {
      console.warn("Supabase deleteOAuthConnectionAsync warning:", err);
    }
  }

  try {
    const db = getDb();
    db.prepare("DELETE FROM oauth_connections WHERE user_id = ? AND provider = ?").run(userId, provider);
  } catch {
    // Non-fatal
  }
}

// ==========================================
// 10. CONTENT FEEDBACK (NOT INTERESTED / LIKE)
// ==========================================

export async function recordContentFeedbackAsync(
  userId: string,
  contentId: string,
  feedbackType: "not_interested" | "like" | "dislike"
): Promise<void> {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("content_feedback").upsert(
        {
          user_id: userId,
          content_id: contentId,
          feedback_type: feedbackType,
          created_at: isoNow,
        },
        { onConflict: "user_id,content_id,feedback_type" }
      );
    } catch (err) {
      console.warn("Supabase recordContentFeedback warning:", err);
    }
  }

  try {
    const db = getDb();
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO content_feedback (id, user_id, content_id, feedback_type, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, content_id, feedback_type) DO UPDATE SET created_at = excluded.created_at
    `).run(id, userId, contentId, feedbackType, now);
  } catch {
    // Non-fatal
  }

  // Incrementally update persistent recommendation profile with explicit feedback
  updateRecommendationProfileFromActivityAsync(userId, {
    type: feedbackType === "like" ? "like" : "not_interested",
    contentId,
  }).catch(() => {});
}

export async function getContentFeedbackAsync(
  userId: string,
  feedbackType?: "not_interested" | "like" | "dislike"
): Promise<string[]> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      let query = supabase.from("content_feedback").select("content_id").eq("user_id", userId);
      if (feedbackType) {
        query = query.eq("feedback_type", feedbackType);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => d.content_id).filter(Boolean);
      }
    } catch {
      // Fallback
    }
  }

  try {
    const db = getDb();
    let rows: any[];
    if (feedbackType) {
      rows = db.prepare("SELECT content_id FROM content_feedback WHERE user_id = ? AND feedback_type = ?").all(userId, feedbackType);
    } else {
      rows = db.prepare("SELECT content_id FROM content_feedback WHERE user_id = ?").all(userId);
    }
    return rows.map((r: any) => r.content_id).filter(Boolean);
  } catch {
    return [];
  }
}

// ==========================================
// 11. PERSISTENT RECOMMENDATION PROFILES
// ==========================================

export interface UserRecommendationProfile {
  userId: string;
  categoryAffinities: Record<string, number>;
  creatorAffinities: Record<string, number>;
  searchTopics: string[];
  negativeContentIds: string[];
  likedContentIds: string[];
  totalCompletedWatches: number;
  totalWatchSeconds: number;
  profileVersion: number;
  updatedAt: number;
}

export async function getUserRecommendationProfileAsync(
  userId: string
): Promise<UserRecommendationProfile | null> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from("user_recommendation_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        return {
          userId: data.user_id,
          categoryAffinities:
            typeof data.category_affinities === "string"
              ? JSON.parse(data.category_affinities)
              : data.category_affinities || {},
          creatorAffinities:
            typeof data.creator_affinities === "string"
              ? JSON.parse(data.creator_affinities)
              : data.creator_affinities || {},
          searchTopics:
            typeof data.search_topics === "string"
              ? JSON.parse(data.search_topics)
              : data.search_topics || [],
          negativeContentIds:
            typeof data.negative_content_ids === "string"
              ? JSON.parse(data.negative_content_ids)
              : data.negative_content_ids || [],
          likedContentIds:
            typeof data.liked_content_ids === "string"
              ? JSON.parse(data.liked_content_ids)
              : data.liked_content_ids || [],
          totalCompletedWatches: Number(data.total_completed_watches) || 0,
          totalWatchSeconds: Number(data.total_watch_seconds) || 0,
          profileVersion: Number(data.profile_version) || 1,
          updatedAt:
            typeof data.updated_at === "string"
              ? new Date(data.updated_at).getTime()
              : Number(data.updated_at) || Date.now(),
        };
      }
    } catch (err) {
      console.warn("Supabase getUserRecommendationProfile warning:", err);
    }
  }

  try {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM user_recommendation_profiles WHERE user_id = ?")
      .get(userId) as any;
    if (row) {
      return {
        userId: row.user_id,
        categoryAffinities: row.category_affinities ? JSON.parse(row.category_affinities) : {},
        creatorAffinities: row.creator_affinities ? JSON.parse(row.creator_affinities) : {},
        searchTopics: row.search_topics ? JSON.parse(row.search_topics) : [],
        negativeContentIds: row.negative_content_ids ? JSON.parse(row.negative_content_ids) : [],
        likedContentIds: row.liked_content_ids ? JSON.parse(row.liked_content_ids) : [],
        totalCompletedWatches: Number(row.total_completed_watches) || 0,
        totalWatchSeconds: Number(row.total_watch_seconds) || 0,
        profileVersion: Number(row.profile_version) || 1,
        updatedAt: Number(row.updated_at) || Date.now(),
      };
    }
  } catch {
    // Non-fatal fallback
  }

  return null;
}

export async function saveUserRecommendationProfileAsync(
  userId: string,
  profile: Partial<UserRecommendationProfile>
): Promise<void> {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();

  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("user_recommendation_profiles").upsert(
        {
          user_id: userId,
          category_affinities: profile.categoryAffinities ?? {},
          creator_affinities: profile.creatorAffinities ?? {},
          search_topics: profile.searchTopics ?? [],
          negative_content_ids: profile.negativeContentIds ?? [],
          liked_content_ids: profile.likedContentIds ?? [],
          total_completed_watches: profile.totalCompletedWatches ?? 0,
          total_watch_seconds: profile.totalWatchSeconds ?? 0,
          profile_version: profile.profileVersion ?? 1,
          updated_at: isoNow,
        },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.warn("Supabase saveUserRecommendationProfile warning:", err);
    }
  }

  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO user_recommendation_profiles (
        user_id, category_affinities, creator_affinities, search_topics,
        negative_content_ids, liked_content_ids, total_completed_watches,
        total_watch_seconds, profile_version, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        category_affinities = excluded.category_affinities,
        creator_affinities = excluded.creator_affinities,
        search_topics = excluded.search_topics,
        negative_content_ids = excluded.negative_content_ids,
        liked_content_ids = excluded.liked_content_ids,
        total_completed_watches = excluded.total_completed_watches,
        total_watch_seconds = excluded.total_watch_seconds,
        profile_version = excluded.profile_version,
        updated_at = excluded.updated_at
    `).run(
      userId,
      JSON.stringify(profile.categoryAffinities ?? {}),
      JSON.stringify(profile.creatorAffinities ?? {}),
      JSON.stringify(profile.searchTopics ?? []),
      JSON.stringify(profile.negativeContentIds ?? []),
      JSON.stringify(profile.likedContentIds ?? []),
      profile.totalCompletedWatches ?? 0,
      profile.totalWatchSeconds ?? 0,
      profile.profileVersion ?? 1,
      now
    );
  } catch (err) {
    console.warn("SQLite saveUserRecommendationProfile warning:", err);
  }
}

export async function clearContentFeedbackAsync(userId: string): Promise<void> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("content_feedback").delete().eq("user_id", userId);
    } catch (err) {
      console.warn("Supabase clearContentFeedbackAsync warning:", err);
    }
  }

  try {
    const db = getDb();
    db.prepare("DELETE FROM content_feedback WHERE user_id = ?").run(userId);
  } catch {
    // Non-fatal
  }
}

export async function resetUserRecommendationProfileAsync(userId: string): Promise<void> {
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("user_recommendation_profiles").delete().eq("user_id", userId);
    } catch (err) {
      console.warn("Supabase resetUserRecommendationProfile warning:", err);
    }
  }

  try {
    const db = getDb();
    db.prepare("DELETE FROM user_recommendation_profiles WHERE user_id = ?").run(userId);
  } catch {
    // Non-fatal
  }
}

export async function updateRecommendationProfileFromActivityAsync(
  userId: string,
  event: {
    type: "watch" | "search" | "like" | "not_interested";
    category?: string;
    channelName?: string;
    contentId?: string;
    query?: string;
    watchSeconds?: number;
    completed?: boolean;
  }
): Promise<void> {
  try {
    const current = (await getUserRecommendationProfileAsync(userId)) || {
      userId,
      categoryAffinities: {},
      creatorAffinities: {},
      searchTopics: [],
      negativeContentIds: [],
      likedContentIds: [],
      totalCompletedWatches: 0,
      totalWatchSeconds: 0,
      profileVersion: 1,
      updatedAt: Date.now(),
    };

    if (event.type === "watch") {
      if (event.watchSeconds) {
        current.totalWatchSeconds += Math.max(0, Math.round(event.watchSeconds));
      }
      if (event.completed) {
        current.totalCompletedWatches += 1;
      }
      if (event.category) {
        const cat = event.category.toLowerCase();
        const delta = event.completed ? 0.2 : 0.05;
        current.categoryAffinities[cat] = Math.min(1.0, (current.categoryAffinities[cat] || 0) + delta);
      }
      if (event.channelName) {
        const ch = event.channelName.trim();
        if (ch) {
          const delta = event.completed ? 0.25 : 0.1;
          current.creatorAffinities[ch] = Math.min(1.0, (current.creatorAffinities[ch] || 0) + delta);
        }
      }
    } else if (event.type === "search" && event.query) {
      const q = event.query.trim().toLowerCase();
      if (q.length >= 2 && !current.searchTopics.includes(q)) {
        current.searchTopics.unshift(q);
        if (current.searchTopics.length > 25) {
          current.searchTopics = current.searchTopics.slice(0, 25);
        }
      }
      if (event.category) {
        const cat = event.category.toLowerCase();
        current.categoryAffinities[cat] = Math.min(1.0, (current.categoryAffinities[cat] || 0) + 0.1);
      }
    } else if (event.type === "like" && event.contentId) {
      if (!current.likedContentIds.includes(event.contentId)) {
        current.likedContentIds.push(event.contentId);
      }
      current.negativeContentIds = current.negativeContentIds.filter((id) => id !== event.contentId);
      if (event.category) {
        const cat = event.category.toLowerCase();
        current.categoryAffinities[cat] = Math.min(1.0, (current.categoryAffinities[cat] || 0) + 0.15);
      }
    } else if (event.type === "not_interested" && event.contentId) {
      if (!current.negativeContentIds.includes(event.contentId)) {
        current.negativeContentIds.push(event.contentId);
      }
      current.likedContentIds = current.likedContentIds.filter((id) => id !== event.contentId);
    }

    current.updatedAt = Date.now();
    await saveUserRecommendationProfileAsync(userId, current);
  } catch (err) {
    console.warn("updateRecommendationProfileFromActivityAsync error:", err);
  }
}

export function mergePersistentProfileIntoSignals(
  persistent: UserRecommendationProfile | null,
  signals: {
    savedCategoryCounts: Record<string, number>;
    topWatchedCreators: Record<string, number>;
    recentSearchKeywords: string[];
    negativeContentIds: string[];
    likedContentIds: string[];
  }
) {
  if (!persistent) return;

  for (const [cat, affinity] of Object.entries(persistent.categoryAffinities || {})) {
    const cNorm = cat.toLowerCase();
    signals.savedCategoryCounts[cNorm] = (signals.savedCategoryCounts[cNorm] || 0) + Math.round(affinity * 10);
  }

  for (const [creator, affinity] of Object.entries(persistent.creatorAffinities || {})) {
    signals.topWatchedCreators[creator] = (signals.topWatchedCreators[creator] || 0) + Math.round(affinity * 5);
  }

  for (const topic of persistent.searchTopics || []) {
    if (!signals.recentSearchKeywords.includes(topic.toLowerCase())) {
      signals.recentSearchKeywords.push(topic.toLowerCase());
    }
  }

  for (const negId of persistent.negativeContentIds || []) {
    if (!signals.negativeContentIds.includes(negId)) {
      signals.negativeContentIds.push(negId);
    }
  }

  for (const likeId of persistent.likedContentIds || []) {
    if (!signals.likedContentIds.includes(likeId)) {
      signals.likedContentIds.push(likeId);
    }
  }
}



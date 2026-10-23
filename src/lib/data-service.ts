import crypto from "node:crypto";
import { isSupabaseServerConfigured, createServerSupabaseClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { getDb } from "./db";
import { encryptSecret, decryptSecret, maskApiKey } from "./crypto";
import { ProviderStatus } from "./types";

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
async function getSupabase() {
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
  const supabase = await getSupabase();
  if (supabase && isUuid(userId)) {
    try {
      await supabase.from("user_preferences").upsert(
        {
          user_id: userId,
          default_mode: prefs.defaultMode,
          preferred_categories: prefs.preferredCategories,
          preferred_languages: prefs.preferredLanguages,
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
        },
        { onConflict: "user_id" }
      );
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
      prefs.preferredLanguages !== undefined ? JSON.stringify(prefs.preferredLanguages) : null,
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

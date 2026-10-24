/**
 * Formatting utilities for video metadata: upload age and view counts.
 */

export function formatUploadAge(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return "just now";
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

export function formatViewCount(views?: string | number): string {
  if (!views) return "";
  const str = String(views).trim();
  if (/views?$/i.test(str)) {
    return str;
  }
  const clean = str.replace(/[^0-9.]/g, "");
  const num = Number(clean);
  if (isNaN(num) || num === 0) {
    return str.toLowerCase().includes("view") ? str : (str ? `${str} views` : "");
  }
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B views`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${num} ${num === 1 ? "view" : "views"}`;
}

export function parseIsoDuration(iso?: string): { formatted: string; totalSeconds: number } {
  if (!iso || typeof iso !== "string" || !iso.startsWith("P")) {
    return { formatted: "", totalSeconds: 0 };
  }
  const matches = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return { formatted: "", totalSeconds: 0 };
  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted = "";
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return { formatted, totalSeconds };
}

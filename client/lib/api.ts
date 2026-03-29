/**
 * API base URL for fetch calls and image paths.
 * - Dev: empty (same origin, Vite proxies /api to Express)
 * - Netlify (same deploy): empty (redirects /api/* to functions)
 * - External API only: set VITE_API_URL to a public https host (never localhost on Netlify)
 */
function rawViteApiUrl(): string {
  const v = import.meta.env?.VITE_API_URL;
  return typeof v === "string" ? v.trim().replace(/\/$/, "") : "";
}

function isLocalHostname(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]"
  );
}

/**
 * On production domains, ignore VITE_API_URL if it points to localhost — common Netlify
 * copy-paste from .env breaks /api/properties (browser calls visitor's machine, not your API).
 */
export function getApiBase(): string {
  const raw = rawViteApiUrl();
  if (!raw) return "";
  if (typeof window === "undefined") return raw;
  try {
    const u = new URL(raw);
    if (!isLocalHostname(window.location.hostname) && isLocalHostname(u.hostname)) {
      console.warn(
        "[api] Ignoring VITE_API_URL (localhost) on production host — using same-origin /api",
      );
      return "";
    }
    return raw;
  } catch {
    return "";
  }
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${p}`;
}

/** Placeholder when no image is available - gray SVG (no external picsum) */
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='14'%3ENo image%3C/text%3E%3C/svg%3E";

/** Resolve image path - handle both legacy /uploads/ and Supabase URLs */
export function imageUrl(path: string | null | undefined | Record<string, unknown>): string {
  let resolved: string;
  if (path == null) {
    resolved = "";
  } else if (typeof path === "string") {
    resolved = path;
  } else if (typeof path === "object" && path !== null) {
    const obj = path as Record<string, unknown>;
    resolved = (typeof obj.url === "string" ? obj.url : typeof obj.src === "string" ? obj.src : "") as string;
  } else {
    resolved = "";
  }

  if (!resolved) return PLACEHOLDER_IMAGE;

  if (resolved.startsWith("http://") || resolved.startsWith("https://")) return resolved;

  if (resolved.startsWith("/uploads/")) {
    const filename = resolved.replace("/uploads/", "");
    const supabaseUrl =
      import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.NEXT_PUBLIC_SUPABASE_URL;
    if (typeof supabaseUrl === "string" && supabaseUrl.startsWith("https://") && supabaseUrl.includes("supabase.co")) {
      return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/uploads/${filename}`;
    }
    return apiUrl(resolved);
  }

  return apiUrl(resolved.startsWith("/") ? resolved : `/${resolved}`);
}

/** Return placeholder when image fails or is empty */
export function placeholderImage(): string {
  return PLACEHOLDER_IMAGE;
}

/** Google Maps query for property/postal area (37°13'36.9"N 22°53'08.7"E) */
export const CONTACT_ADDRESS_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=37.2269167%2C22.88575";

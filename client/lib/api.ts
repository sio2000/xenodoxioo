/**
 * API base URL for fetch calls and image paths.
 * - Dev: empty (same origin, Vite proxies /api to Express)
 * - Netlify (same deploy): empty (redirects /api/* to function)
 * - Netlify + external backend: set VITE_API_URL in Netlify env (e.g. https://your-api.onrender.com)
 */
export const API_BASE =
  typeof import.meta.env?.VITE_API_URL === "string" && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
    : "";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
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
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== "https://jkolkjvhlguaqcfgaaig.supabase.co") {
      return `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
    }
    return apiUrl(resolved);
  }

  return apiUrl(resolved.startsWith("/") ? resolved : `/${resolved}`);
}

/** Return placeholder when image fails or is empty */
export function placeholderImage(): string {
  return PLACEHOLDER_IMAGE;
}

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

/** Resolve image path - handle both legacy /uploads/ and Supabase URLs */
export function imageUrl(path: string | null | undefined): string {
  console.log(`🖼️ [IMAGE] Resolving image path:`, { path });
  
  if (!path || typeof path !== "string") {
    console.log(`⚠️ [IMAGE] Invalid path, returning empty string`);
    return "";
  }
  
  // If it's already a full URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    console.log(`✅ [IMAGE] Already a full URL: ${path}`);
    return path;
  }
  
  // Handle legacy /uploads/ paths - redirect to Supabase Storage
  if (path.startsWith("/uploads/")) {
    const filename = path.replace('/uploads/', '');
    // Use the actual Supabase URL from environment
    const supabaseUrl = "https://jkolkjvhlguaqcfgaaig.supabase.co";
    const supabaseStorageUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
    console.log(`🔄 [IMAGE] Legacy path converted to Supabase: ${supabaseStorageUrl}`);
    return supabaseStorageUrl;
  }
  
  // For other paths, prepend API_BASE
  const finalUrl = apiUrl(path.startsWith("/") ? path : `/${path}`);
  console.log(`🔗 [IMAGE] Final resolved URL: ${finalUrl}`);
  return finalUrl;
}

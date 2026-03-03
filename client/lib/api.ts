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
  console.log("🖼️ [IMAGE-URL] Processing image path:", { 
    input: path, 
    inputType: typeof path,
    timestamp: new Date().toISOString()
  });
  
  let resolved: string;
  if (path == null) {
    resolved = "";
    console.log("🖼️ [IMAGE-URL] Path is null/undefined, using empty string");
  } else if (typeof path === "string") {
    resolved = path;
    console.log("🖼️ [IMAGE-URL] Path is string:", resolved);
  } else if (typeof path === "object" && path !== null) {
    const obj = path as Record<string, unknown>;
    resolved = (typeof obj.url === "string" ? obj.url : typeof obj.src === "string" ? obj.src : "") as string;
    console.log("🖼️ [IMAGE-URL] Path is object, extracted:", { 
      url: obj.url, 
      src: obj.src, 
      resolved 
    });
  } else {
    resolved = "";
    console.log("🖼️ [IMAGE-URL] Path is unexpected type, using empty string");
  }

  if (!resolved) {
    console.log("🖼️ [IMAGE-URL] No resolved path, returning placeholder");
    return PLACEHOLDER_IMAGE;
  }

  // If it's already a full URL, return as-is (including Supabase, picsum legacy in DB, etc.)
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    console.log("🖼️ [IMAGE-URL] Path is already full URL, returning as-is:", resolved);
    return resolved;
  }

  // Handle /uploads/ paths - check if we should use local server or Supabase
  if (resolved.startsWith("/uploads/")) {
    const filename = resolved.replace("/uploads/", "");
    console.log("🖼️ [IMAGE-URL] Processing /uploads/ path:", { 
      filename, 
      resolved,
      hasSupabaseUrl: !!import.meta.env?.VITE_SUPABASE_URL,
      supabaseUrl: import.meta.env?.VITE_SUPABASE_URL
    });
    
    // Check if we have a Supabase URL configured
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== "https://jkolkjvhlguaqcfgaaig.supabase.co") {
      // Use configured Supabase
      const supabasePath = `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
      console.log("🖼️ [IMAGE-URL] Using configured Supabase:", supabasePath);
      return supabasePath;
    } else {
      // Use local server (development or when Supabase is not properly configured)
      const localPath = apiUrl(resolved);
      console.log("🖼️ [IMAGE-URL] Using local server:", localPath);
      return localPath;
    }
  }

  // For other paths, prepend API_BASE
  const finalPath = apiUrl(resolved.startsWith("/") ? resolved : `/${resolved}`);
  console.log("🖼️ [IMAGE-URL] Using API_BASE for other paths:", finalPath);
  return finalPath;
}

/** Return placeholder when image fails or is empty */
export function placeholderImage(): string {
  return PLACEHOLDER_IMAGE;
}

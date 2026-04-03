/** Authorization header for programmer panel API calls (JWT from /api/programmer/login). */
export function programmerAuthHeaders(): Record<string, string> {
  const raw = localStorage.getItem("programmer");
  if (!raw) return {};
  try {
    const token = JSON.parse(raw).accessToken as string | undefined;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    /* ignore */
  }
  return {};
}

export function programmerJsonHeaders(): Record<string, string> {
  return { ...programmerAuthHeaders(), "Content-Type": "application/json" };
}

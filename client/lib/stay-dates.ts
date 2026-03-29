import type { Language } from "@/lib/translations";

export function stayLocale(language: Language): string {
  switch (language) {
    case "el":
      return "el-GR";
    case "fr":
      return "fr-FR";
    case "de":
      return "de-DE";
    default:
      return "en-GB";
  }
}

/** Canonical YYYY-MM-DD from API (date-only or timestamptz). */
export function stayDateKeyFromApi(value: string | undefined | null): string {
  if (value == null || String(value).trim() === "") return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Ημερομηνία διαμονής όπως την είδε ο πελάτης στο checkout και ο admin:
 * ίδιο ημερολογιακό «βράδυ» με την DB (date-only → μεσημέρι UTC), χωρίς μετατόπιση ημέρας από timezone browser.
 */
export function formatStayDate(
  value: string | undefined | null,
  locale: string,
  month: "short" | "long" = "short",
): string {
  const key = stayDateKeyFromApi(value);
  if (!key) return "—";
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  const date = new Date(
    Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0),
  );
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month,
    year: "numeric",
    timeZone: "UTC",
  });
}

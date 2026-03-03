import { Language } from "./translations";

const localeMap: Record<Language, string> = {
  en: "en-IE",
  fr: "fr-FR",
  de: "de-DE",
  el: "el-GR",
};

export function formatCurrency(amount: number | string | undefined | null | Record<string, unknown>, lang: Language = "en") {
  if (amount === undefined || amount === null) return "0.00 €";

  let numericAmount: number;
  if (typeof amount === "number") numericAmount = amount;
  else if (typeof amount === "string") numericAmount = parseFloat(amount);
  else if (typeof amount === "object" && amount !== null) {
    const obj = amount as Record<string, unknown>;
    const v = obj.basePrice ?? obj.value ?? obj.amount ?? 0;
    numericAmount = typeof v === "number" ? v : parseFloat(String(v));
  } else {
    return "0.00 €";
  }

  if (isNaN(numericAmount)) return "0.00 €";
  
  const locale = localeMap[lang] || "en-IE";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `€${numericAmount.toFixed(2)}`;
  }
}

export default formatCurrency;

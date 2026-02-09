import { Language } from "./translations";

const localeMap: Record<Language, string> = {
  en: "en-IE",
  fr: "fr-FR",
  de: "de-DE",
  el: "el-GR",
};

export function formatCurrency(amount: number, lang: Language = "en") {
  const locale = localeMap[lang] || "en-IE";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    return `€${amount.toFixed(2)}`;
  }
}

export default formatCurrency;

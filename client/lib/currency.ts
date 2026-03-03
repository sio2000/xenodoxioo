import { Language } from "./translations";

const localeMap: Record<Language, string> = {
  en: "en-IE",
  fr: "fr-FR",
  de: "de-DE",
  el: "el-GR",
};

export function formatCurrency(amount: number | undefined | null, lang: Language = "en") {
  console.log(`💰 [CURRENCY] Formatting amount:`, { amount, lang });
  
  // Handle undefined/null values
  if (amount === undefined || amount === null) {
    console.error("❌ [CURRENCY] Amount is undefined/null:", amount);
    return "0.00 €";
  }
  
  // Convert to number if string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (typeof numericAmount !== 'number' || isNaN(numericAmount)) {
    console.error("❌ [CURRENCY] Invalid amount after conversion:", { original: amount, converted: numericAmount });
    return "0.00 €";
  }
  
  const locale = localeMap[lang] || "en-IE";
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(numericAmount);
    
    console.log(`✅ [CURRENCY] Successfully formatted:`, { input: numericAmount, output: formatted });
    return formatted;
  } catch (e) {
    console.error("❌ [CURRENCY] Format error:", e);
    return `€${numericAmount.toFixed(2)}`;
  }
}

export default formatCurrency;

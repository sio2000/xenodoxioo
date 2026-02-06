import { createContext, useContext, useState, ReactNode } from "react";
import { Language, t } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get language from localStorage, default to English
    const saved = localStorage.getItem("leonidion-language") as Language;
    return saved || "en";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("leonidion-language", lang);
  };

  const translate = (key: string) => t(key, language);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t: translate }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

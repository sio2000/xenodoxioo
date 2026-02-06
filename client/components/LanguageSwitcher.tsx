import { useLanguage } from '@/hooks/useLanguage';
import { Language } from '@/lib/translations';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  ];

  return (
    <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-1">
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          title={lang.label}
          className={`
            px-3 py-1.5 rounded transition-all text-sm font-medium
            ${language === lang.code
              ? 'bg-primary text-white'
              : 'text-foreground hover:bg-muted'
            }
          `}
        >
          <span className="hidden sm:inline">{lang.flag} {lang.label}</span>
          <span className="sm:hidden">{lang.flag}</span>
        </button>
      ))}
    </div>
  );
}

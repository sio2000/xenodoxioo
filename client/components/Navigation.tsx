import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container-max">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-bold text-primary hidden sm:inline">
              LEONIDION<span className="text-accent">HOUSES</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/properties"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              {t("nav.properties")}
            </Link>
            <a
              href="#about"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              {t("nav.about")}
            </a>
            <a
              href="#contact"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              {t("nav.contact")}
            </a>
          </div>

          {/* Auth & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              to="/login"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              {t("nav.signIn")}
            </Link>
            <Link to="/properties" className="btn-primary">
              {t("nav.bookNow")}
            </Link>
          </div>

          {/* Mobile: Language Switcher and Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
              className="p-2"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-border">
            <Link
              to="/properties"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              {t("nav.properties")}
            </Link>
            <a
              href="#about"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              {t("nav.about")}
            </a>
            <a
              href="#contact"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              {t("nav.contact")}
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-border mt-4">
              <Link
                to="/login"
                className="text-foreground hover:text-primary transition-colors font-medium text-left"
              >
                {t("nav.signIn")}
              </Link>
              <Link to="/properties" className="btn-primary w-full text-center">
                {t("nav.bookNow")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

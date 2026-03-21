import { Link } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      try {
        const auth = localStorage.getItem("auth");
        if (auth) {
          const parsed = JSON.parse(auth);
          setIsLoggedIn(true);
          setUserEmail(parsed.email || "");
        } else {
          setIsLoggedIn(false);
          setUserEmail("");
        }
      } catch {
        setIsLoggedIn(false);
        setUserEmail("");
      }
    };

    checkAuth();
    // Listen for storage changes
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    setIsLoggedIn(false);
    setUserEmail("");
    window.location.href = "/";
  };

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container-max">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand title */}
          <Link to="/" className="flex items-center flex-shrink-0 font-cavolini">
            <span className="text-lg sm:text-xl font-bold text-primary lowercase">
              leonidion<span className="text-accent">houses</span>
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
            <Link
              to="/about"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              {t("nav.about")}
            </Link>
            <Link
              to="/contact"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              {t("nav.contact")}
            </Link>
            {isLoggedIn && (
              <Link
                to="/dashboard"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                {t("nav.myProfile")}
              </Link>
            )}
          </div>

          {/* Auth & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <User size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{userEmail}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-foreground hover:text-primary transition-colors font-medium"
                >
                  {t("nav.signIn")}
                </Link>
                <Link to="/properties" className="btn-primary">
                  {t("nav.bookNow")}
                </Link>
              </>
            )}
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
            <Link
              to="/about"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              {t("nav.about")}
            </Link>
            <Link
              to="/contact"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              {t("nav.contact")}
            </Link>
            {isLoggedIn && (
              <Link
                to="/dashboard"
                className="block py-2 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t("nav.myProfile")}
              </Link>
            )}
            <div className="flex flex-col gap-2 pt-4 border-t border-border mt-4">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full w-fit">
                    <User size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{userEmail}</div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium text-left"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-foreground hover:text-primary transition-colors font-medium text-left"
                  >
                    {t("nav.signIn")}
                  </Link>
                  <Link to="/properties" className="btn-primary w-full text-center">
                    {t("nav.bookNow")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="bg-primary/5 border-t border-border mt-20">
      <div className="container-max section-padding">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-4 font-cavolini">
              <span className="text-lg font-bold text-primary lowercase">
                leonidion<span className="text-accent">houses</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{t("footer.brandSubtitle")}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.properties")}</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/properties"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.browseAll")}
                </Link>
              </li>
              <li>
                <Link
                  to="/properties"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.featured")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link
                  to="/legal"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.legalDetails")}
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.faqs")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail size={16} />
                <a
                  href={`mailto:${t("footer.email")}`}
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.email")}
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone size={16} />
                <a
                  href={`tel:${t("footer.phone")}`}
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.phone")}
                </a>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                <span>{t("footer.address")}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-8 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>
              &copy; {currentYear} leonidionhouses. {t("footer.brandSubtitle")}
            </p>
            <div className="flex gap-6">
              <Link to="/legal" className="hover:text-primary transition-colors">
                {t("footer.privacy")}
              </Link>
              <Link to="/legal" className="hover:text-primary transition-colors">
                {t("footer.terms")}
              </Link>
              <Link to="/legal" className="hover:text-primary transition-colors">
                {t("footer.cookies")}
              </Link>
            </div>
          </div>
          {/* License microformat */}
          <Link
            to="/legal"
            className="block text-[10px] md:text-xs text-muted-foreground/80 hover:text-muted-foreground transition-colors text-center md:text-left leading-relaxed"
          >
            ALTIN COTA · ΑΦΜ 116379920 · ΓΕΜΗ 148929614000 · ΕΟΤ 1365294 · ΑΑ 1246K91000329401 · ΑΑ 1283732
          </Link>
        </div>
      </div>
    </footer>
  );
}

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
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="text-lg font-bold text-primary">
                LEONIDION<span className="text-accent">HOUSES</span>
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
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.featured")}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.newListings")}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#about"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.about")}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.blog")}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {t("footer.faqs")}
                </a>
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
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>
            &copy; {currentYear} LEONIDIONHOUSES. {t("footer.brandSubtitle")}
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">
              {t("footer.privacy")}
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              {t("footer.terms")}
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              {t("footer.cookies")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

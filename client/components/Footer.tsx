import { Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

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
            <p className="text-muted-foreground text-sm">
              Luxury villa rentals in the heart of Greece
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Properties</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/properties" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Browse All
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Featured
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  New Listings
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  FAQs
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
                <a href="mailto:info@leonidionhouses.com" className="hover:text-primary transition-colors">
                  info@leonidionhouses.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone size={16} />
                <a href="tel:+302754051234" className="hover:text-primary transition-colors">
                  +30 27540 51234
                </a>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                <span>Leonidion, Arcadia, Greece</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {currentYear} LEONIDIONHOUSES. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

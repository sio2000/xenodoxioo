import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container-max">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
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
              Properties
            </Link>
            <a
              href="#about"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              About
            </a>
            <a
              href="#contact"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Contact
            </a>
          </div>

          {/* Auth & Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link to="/properties" className="btn-primary">
              Book Now
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-border">
            <Link
              to="/properties"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              Properties
            </Link>
            <a
              href="#about"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              About
            </a>
            <a
              href="#contact"
              className="block py-2 text-foreground hover:text-primary transition-colors"
            >
              Contact
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-border mt-4">
              <Link
                to="/login"
                className="text-foreground hover:text-primary transition-colors font-medium text-left"
              >
                Sign In
              </Link>
              <Link to="/properties" className="btn-primary w-full text-center">
                Book Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

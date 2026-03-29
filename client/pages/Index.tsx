import Layout from "@/components/Layout";
import { apiUrl, imageUrl } from "@/lib/api";
import {
  sortByRoomOrder,
  getUnitDisplayTitleKey,
  getClosedBungalowNightlyDisplayPrice,
} from "@/lib/room-display-order";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  MapPin,
  Search,
  Utensils,
  Waves,
  Compass,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

type PropertySummary = {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  mainImage: string;
  unitsCount: number;
  startingFrom: number | null;
};

type FeaturedPropertyCard = PropertySummary & {
  _unitId?: string;
  closedForCurrentPeriod?: boolean;
  /** Property (parent) name — with unit `name`, identifies Big/Small Bungalow closed pricing. */
  parentPropertyName?: string;
};

function getFeaturedCardDisplayPrice(card: FeaturedPropertyCard): number | null {
  if (card.startingFrom == null) return null;
  return getClosedBungalowNightlyDisplayPrice(
    card.name,
    card.parentPropertyName ?? "",
    !!card.closedForCurrentPeriod,
    card.startingFrom,
  );
}

function BeachLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X size={24} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="absolute left-2 sm:left-6 z-10 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <ChevronLeft size={28} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-2 sm:right-6 z-10 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <ChevronRight size={28} />
      </button>
      <img
        src={images[currentIndex]}
        alt=""
        className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentIndex ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

function PrivateBeachesSection() {
  const { t } = useLanguage();
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const bigBeachImages = ["/bigbeach1.jpg", "/bigbeach3.jpg", "/bigbeach4.jpg"];
  const smallBeachImages = ["/smallbeach1.jpg", "/smallbeach2.jpg", "/smallbeach3.jpg", "/smallbeach4.jpg"];

  const openLightbox = (images: string[], index: number) => {
    setLightbox({ images, index });
  };

  return (
    <>
      <section className="section-padding bg-background">
        <div className="container-max">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              {t("home.beaches.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("home.beaches.title")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.beaches.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Big Beach */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Waves size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{t("home.beaches.bigBeach.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("home.beaches.bigBeach.subtitle")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {bigBeachImages.map((img, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-xl cursor-pointer group/img ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}
                    onClick={() => openLightbox(bigBeachImages, i)}
                  >
                    <img
                      src={img}
                      alt={`${t("home.beaches.bigBeach.title")} ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <Search size={24} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Small Beach */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Compass size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{t("home.beaches.smallBeach.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("home.beaches.smallBeach.subtitle")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {smallBeachImages.map((img, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-xl cursor-pointer group/img ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}
                    onClick={() => openLightbox(smallBeachImages, i)}
                  >
                    <img
                      src={img}
                      alt={`${t("home.beaches.smallBeach.title")} ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <Search size={24} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {lightbox && (
        <BeachLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

export default function Index() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [featuredProperties, setFeaturedProperties] = useState<FeaturedPropertyCard[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  const amenities = [
    {
      icon: Utensils,
      label: t("amenities.fullKitchen"),
      description: t("amenities.fullKitchenDesc"),
    },
    {
      icon: Waves,
      label: t("amenities.beachAccess"),
      description: t("amenities.beachAccessDesc"),
    },
    {
      icon: MapPin,
      label: t("amenities.primeLocation"),
      description: t("amenities.primeLocationDesc"),
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to properties with filters
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);
    window.location.href = `/properties?${params.toString()}`;
  };

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const response = await fetch(apiUrl("/api/properties"));

        if (!response.ok) {
          throw new Error(`Failed to load properties: ${response.status}`);
        }

        const json = await response.json();
        const properties = (json.data ?? []) as Array<
          PropertySummary & {
            units?: Array<{
              id: string;
              name: string;
              images?: string[];
              basePrice?: number;
              closedForCurrentPeriod?: boolean;
            }>;
          }
        >;

        // Flatten to one card per unit (same as /properties), then sort
        const flattened: FeaturedPropertyCard[] = [];
        properties.forEach((prop) => {
          const units = prop.units ?? [];
          if (units.length > 0) {
            units.forEach((unit) => {
              flattened.push({
                id: prop.id,
                _unitId: unit.id,
                name: unit.name,
                description: prop.description,
                location: prop.location,
                city: prop.city,
                country: prop.country,
                mainImage: (unit.images?.[0] ?? prop.mainImage ?? (prop as { main_image?: string }).main_image) as string,
                unitsCount: 1,
                startingFrom: unit.basePrice ?? prop.startingFrom ?? null,
                closedForCurrentPeriod: !!unit.closedForCurrentPeriod,
                parentPropertyName: prop.name,
              });
            });
          } else {
            flattened.push({ ...prop } as FeaturedPropertyCard);
          }
        });

        setFeaturedProperties(sortByRoomOrder(flattened).slice(0, 6));
      } catch (error) {
        console.error("❌ [CLIENT] Error loading properties", error);
        setPropertiesError(t("home.featured.loadError"));
      } finally {
        setPropertiesLoading(false);
      }
    };

    loadProperties();
  }, [t]);

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative text-white overflow-hidden min-h-[85vh] flex flex-col">
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster=""
        >
          <source src="/viewvideos/herosectionbackground.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Top-left title + tagline */}
        <div className="absolute top-8 left-8 md:top-12 md:left-12 z-20">
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight font-cavolini lowercase">
            {t("home.hero.brandTitle")}
          </h1>
          <p className="text-lg md:text-xl text-white/95 font-medium tracking-wide font-cavolini mt-1">
            {t("home.hero.tagline")}
          </p>
        </div>

        {/* Search Bar - bottom of hero, centered */}
        <div className="absolute bottom-8 left-0 right-0 z-20">
          <form
            onSubmit={handleSearch}
            className="container-max px-4 md:px-6"
          >
            <div className="grid md:grid-cols-5 gap-4 md:gap-3">
              {/* Check-in */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/95">
                  {t("home.search.checkIn")}
                </label>
                <div className="flex items-center gap-2 border border-white/30 rounded-lg px-3 py-2 bg-white/5 backdrop-blur-sm">
                  <Calendar size={18} className="text-white/90" />
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="flex-1 outline-none bg-transparent text-white placeholder:text-white/60 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/95">
                  {t("home.search.checkOut")}
                </label>
                <div className="flex items-center gap-2 border border-white/30 rounded-lg px-3 py-2 bg-white/5 backdrop-blur-sm">
                  <Calendar size={18} className="text-white/90" />
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="flex-1 outline-none bg-transparent text-white placeholder:text-white/60 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/95">
                  {t("home.search.guests")}
                </label>
                <div className="flex items-center gap-2 border border-white/30 rounded-lg px-3 py-2 bg-white/5 backdrop-blur-sm">
                  <Users size={18} className="text-white/90" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="flex-1 outline-none bg-transparent text-white"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} className="bg-slate-800 text-white">
                        {n} {n === 1 ? t("common.guest") : t("common.guests")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex items-end md:col-span-2">
                <button
                  type="submit"
                  className="w-full btn-primary justify-center gap-2"
                >
                  <Search size={20} />
                  <span className="hidden md:inline">{t("home.search.button")}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Featured Properties */}
      <section className="container-max section-padding">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("home.featured.title")}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t("home.featured.subtitle")}
          </p>
        </div>

        {propertiesLoading ? (
          <div className="grid md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border">
                <div className="h-64 bg-muted" />
                <div className="p-6 space-y-2">
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : propertiesError ? (
          <p className="text-destructive text-sm">{propertiesError}</p>
        ) : featuredProperties.length === 0 ? (
          <p className="text-muted-foreground">No properties available yet.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredProperties.map((property, idx) => {
                const displayPrice = getFeaturedCardDisplayPrice(property);
                return (
                  <Link
                    key={property._unitId ?? property.id}
                    to={`/properties/${property.id}`}
                    className="card-hover overflow-hidden group"
                    onMouseEnter={() => fetch(apiUrl(`/api/properties/id/${property.id}`))}
                  >
                    {/* Image */}
                    <div className="relative h-64 overflow-hidden bg-muted">
                      <img
                        src={imageUrl(property.mainImage ?? (property as { main_image?: string }).main_image)}
                        alt={(() => {
                          const tk = getUnitDisplayTitleKey(property.name);
                          return tk ? t(tk) : property.name;
                        })()}
                        loading={idx < 3 ? "eager" : "lazy"}
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {displayPrice != null && (
                        <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-1 shadow-lg">
                          <span className="text-primary font-bold">
                            {t("property.priceFrom")} {formatCurrency(displayPrice, language)}
                          </span>
                          <span className="text-muted-foreground text-sm">
                              {" "}{t("common.perNight")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        {(() => {
                          const tk = getUnitDisplayTitleKey(property.name);
                          return tk ? t(tk) : property.name;
                        })()}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {property.location || `${property.city}, ${property.country}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Link to="/properties" className="btn-primary">
                {t("home.featured.viewAll")}
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Why Book With Us */}
      <section className="bg-primary/5 section-padding">
        <div className="container-max">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
            {t("home.why.title")}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {amenities.map((amenity, index) => {
              const Icon = amenity.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <Icon size={32} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {amenity.label}
                  </h3>
                  <p className="text-muted-foreground">{amenity.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 section-padding">
        <div className="container-max text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          {t("home.trust.title")}
        </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            {t("home.trust.description")}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">200+</div>
              <p className="text-muted-foreground">{t("common.happyGuests")}</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">6</div>
              <p className="text-muted-foreground">{t("common.luxuryUnits")}</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">4.9★</div>
              <p className="text-muted-foreground">{t("common.averageRating")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Better Price Inquiry CTA Section */}
      <section className="py-16 bg-gradient-to-r from-accent/5 via-primary/10 to-accent/5">
        <div className="container-max">
          <div className="rounded-3xl border border-primary/15 bg-card shadow-xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare size={28} className="text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  {t("home.inquiry.title")}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {t("home.inquiry.description")}
                </p>
                <ul className="space-y-3 mb-8">
                  {["home.inquiry.benefit1", "home.inquiry.benefit2"].map((key) => (
                    <li key={key} className="flex items-center gap-3 text-foreground">
                      <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/properties" className="btn-primary w-fit gap-2">
                  {t("home.inquiry.cta")}
                  <ArrowRight size={18} />
                </Link>
              </div>
              <div className="hidden md:flex items-center justify-center p-12 bg-gradient-to-br from-primary/5 to-accent/10">
                <div className="text-center space-y-6">
                  <div className="text-6xl font-bold text-primary">-%</div>
                  <p className="text-lg text-muted-foreground max-w-xs">{t("home.inquiry.discountNote")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Private Beaches Section */}
      <PrivateBeachesSection />

      {/* CTA Section */}
      <section className="bg-primary text-white section-padding">
        <div className="container-max text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("home.cta.title")}
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            {t("home.cta.subtitle")}
          </p>
          <Link
            to="/properties"
            className="inline-flex items-center justify-center rounded-lg bg-accent text-primary px-8 py-4 font-bold hover:bg-accent/90 transition-colors text-lg"
          >
            {t("home.featured.viewAll")}
          </Link>
        </div>
      </section>
    </Layout>
  );
}

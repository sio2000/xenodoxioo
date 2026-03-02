import Layout from "@/components/Layout";
import { apiUrl, imageUrl } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  MapPin,
  Search,
  Wifi,
  Utensils,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
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

export default function Index() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [featuredProperties, setFeaturedProperties] = useState<PropertySummary[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  const amenities = [
    {
      icon: Wifi,
      label: t("amenities.fastWifi"),
      description: t("amenities.fastWifiDesc"),
    },
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
        console.log("🔍 [CLIENT] Fetching featured properties...");
        const response = await fetch(apiUrl("/api/properties"));

        if (!response.ok) {
          throw new Error(`Failed to load properties: ${response.status}`);
        }

        const json = await response.json();
        const items = (json.data ?? []) as PropertySummary[];

        setFeaturedProperties(items.slice(0, 6));
      } catch (error) {
        console.error("❌ [CLIENT] Error loading properties", error);
        setPropertiesError(
          "Δεν φόρτωσαν τα δωμάτια. Ελέγξτε VITE_API_URL (Render URL) στο Netlify και κάντε redeploy."
        );
      } finally {
        setPropertiesLoading(false);
      }
    };

    loadProperties();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23ffffff%27 fill-opacity=%270.1%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        </div>

        <div className="relative container-max py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {t("home.hero.title")}
              {" "}
              <span className="text-accent">Greek Escape</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              {t("home.hero.subtitle")}
            </p>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 -mb-12 relative z-10"
          >
            <div className="grid md:grid-cols-5 gap-4 md:gap-3">
              {/* Check-in */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  {t("home.search.checkIn")}
                </label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                  <Calendar size={18} className="text-primary" />
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="flex-1 outline-none text-foreground"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  {t("home.search.checkOut")}
                </label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                  <Calendar size={18} className="text-primary" />
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="flex-1 outline-none text-foreground"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  {t("home.search.guests")}
                </label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                  <Users size={18} className="text-primary" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="flex-1 outline-none text-foreground"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
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

        <div className="h-12 md:h-20" />
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
          <p className="text-muted-foreground">Loading properties...</p>
        ) : propertiesError ? (
          <p className="text-destructive text-sm">{propertiesError}</p>
        ) : featuredProperties.length === 0 ? (
          <p className="text-muted-foreground">No properties available yet.</p>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <Link
                  key={property.id}
                  to={`/properties/${property.id}`}
                  className="card-hover overflow-hidden group"
                >
                  {/* Image */}
                  <div className="relative h-64 overflow-hidden bg-muted">
                    <img
                      src={imageUrl(property.mainImage) || `https://images.unsplash.com/photo-1566073775-4b56bc6404798012d8f0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`}
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {property.startingFrom !== null && (
                      <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-1 shadow-lg">
                        <span className="text-primary font-bold">
                          {formatCurrency(property.startingFrom, language)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /night
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {property.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {property.location || `${property.city}, ${property.country}`}
                    </p>
                  </div>
                </Link>
              ))}
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

          <div className="grid md:grid-cols-4 gap-8">
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
              <div className="text-4xl font-bold text-primary mb-2">5,000+</div>
              <p className="text-muted-foreground">{t("common.happyGuests")}</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">6</div>
              <p className="text-muted-foreground">{t("common.luxuryUnits")}</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">4.8★</div>
              <p className="text-muted-foreground">{t("common.averageRating")}</p>
            </div>
          </div>
        </div>
      </section>

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

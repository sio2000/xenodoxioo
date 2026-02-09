import Layout from "@/components/Layout";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  Bed,
  Bath,
  Users,
  MapPin,
  Wifi,
  Utensils,
  Wind,
  Tv,
  Waves,
  Heart,
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const { language, t } = useLanguage();

  // Property data (in production, fetch from API)
  const property = {
    id: 1,
    name: "The Lykoskufi Villas - Villa A",
    property: "The Lykoskufi Villas",
    descriptionKey: "property.description.sample1",
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    basePrice: 280,
    cleaningFee: 50,
    price: 280,
    rating: 4.9,
    reviews: 56,
    location: "Leonidion, Peloponnese, Greece",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=600&fit=crop",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=600&fit=crop",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=600&fit=crop",
    ],
    amenities: [
      { icon: Wifi, labelKey: "amenities.fastWifi", descKey: "amenities.fastWifiDesc" },
      { icon: Wind, labelKey: "amenities.ac", descKey: "amenities.acDesc" },
      { icon: Utensils, labelKey: "amenities.fullKitchen", descKey: "amenities.fullKitchenDesc" },
      { icon: Tv, labelKey: "amenities.smartTV", descKey: "amenities.smartTVDesc" },
      { icon: Waves, labelKey: "amenities.privatePool", descKey: "amenities.privatePoolDesc" },
      { icon: MapPin, labelKey: "amenities.beachAccess", descKey: "amenities.beachAccessDesc" },
    ],
    highlights: [
      "property.highlights.seaViews",
      "property.highlights.modernKitchen",
      "property.highlights.spaciousLiving",
      "property.highlights.privateTerrace",
      "property.highlights.parking",
      "property.highlights.cleaning",
    ],
  };

  const handleBooking = () => {
    // Navigate to checkout with dates
    window.location.href = `/checkout?property=${id}`;
  };

  return (
    <Layout>
      {/* Image Gallery */}
      <div className="bg-black relative">
        <div className="container-max">
          <div className="grid md:grid-cols-4 gap-2 py-6">
            {/* Main Image */}
            <div className="md:col-span-2 relative rounded-lg overflow-hidden h-96 md:h-[500px]">
              <img
                src={property.images[selectedImage]}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-white/90 transition-colors"
              >
                <Heart
                  size={20}
                  className={
                    isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
                  }
                />
              </button>
            </div>

            {/* Thumbnail Gallery */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-2 gap-2">
              {property.images.map((image, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`rounded-lg overflow-hidden h-32 md:h-24 transition-all ${
                    selectedImage === idx ? "ring-4 ring-accent" : ""
                  }`}
                >
                  <img
                    src={image}
                    alt={`View ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-max py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-2">
                {property.property}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {property.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className="fill-accent text-accent"
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{property.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin size={16} />
                  <span>{property.location}</span>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("common.bedrooms")}</p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bed size={24} className="text-primary" />
                  {property.bedrooms}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("common.bathrooms")}</p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bath size={24} className="text-primary" />
                  {property.bathrooms}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("common.maxGuests")}</p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users size={24} className="text-primary" />
                  {property.maxGuests}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                  {t("property.aboutTitle")}
                </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t(property.descriptionKey)}
              </p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {t("property.amenities")}
                </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {property.amenities.map((amenity, idx) => {
                  const Icon = amenity.icon;
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Icon size={32} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {t(amenity.labelKey)}
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {t(amenity.descKey)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Highlights */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                  {t("property.whyLove")}
                </h2>
              <ul className="space-y-3">
                {property.highlights.map((highlightKey, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-foreground">{t(highlightKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            {/* Price & Booking */}
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6 shadow-lg">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(property.price, language)}
                  </span>
                  <span className="text-muted-foreground">/night</span>
                </div>
                <p className="text-sm text-muted-foreground">{t("checkout.taxes")}</p>
              </div>

              {/* Calendar */}
              <AvailabilityCalendar />

              {/* Price Breakdown */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm mb-6">
                <div className="flex justify-between text-foreground">
                  <span>1 {t("common.night")} × {formatCurrency(property.basePrice, language)}</span>
                  <span>{formatCurrency(property.basePrice, language)}</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>{t("checkout.cleaningFee")}</span>
                  <span>{formatCurrency(property.cleaningFee, language)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>{t("property.totalPrice")}</span>
                  <span>{formatCurrency(property.basePrice + property.cleaningFee, language)}</span>
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={handleBooking}
                className="btn-primary w-full justify-center mb-3"
              >
                {t("nav.bookNow")}
              </button>

              {/* Trust Badges */}
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>✓ {t("property.freeCancel")}</p>
                <p>✓ {t("property.securePayment")}</p>
                <p>✓ {t("property.cleaningIncluded")}</p>
              </div>
            </div>

            {/* More Properties */}
            <div className="mt-8">
              <h3 className="font-bold text-foreground mb-4">
                Other properties
              </h3>
              <Link
                to="/properties"
                className="block p-4 border border-border rounded-lg hover:border-primary transition-colors"
              >
                <p className="font-semibold text-foreground mb-2">{t("common.viewMore")}</p>
                <p className="text-muted-foreground text-sm">{t("common.browseCollection")}</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

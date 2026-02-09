import Layout from "@/components/Layout";
import { Link, useSearchParams } from "react-router-dom";
import { Star, MapPin, Users, Bed, Bath, Wifi } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

export default function Properties() {
  const [searchParams] = useSearchParams();
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedroomFilter, setBedroomFilter] = useState("all");
  const { language, t } = useLanguage();

  // All properties with units data
  const allProperties = [
    {
      id: 1,
      name: "The Lykoskufi Villas - Villa A",
      property: "The Lykoskufi Villas",
      descriptionKey: "properties.sample1",
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      price: 280,
      image:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop",
      rating: 4.9,
      reviews: 56,
      amenities: ["amenities.fastWifi", "amenities.ac", "amenities.fullKitchen", "amenities.privatePool"],
    },
    {
      id: 2,
      name: "The Lykoskufi Villas - Villa B",
      property: "The Lykoskufi Villas",
      descriptionKey: "properties.sample2",
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 8,
      price: 320,
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
      rating: 4.8,
      reviews: 42,
      amenities: ["amenities.fastWifi", "amenities.ac", "amenities.fullKitchen", "amenities.privatePool"],
    },
    {
      id: 3,
      name: "The Lykoskufi Villas - Villa C",
      property: "The Lykoskufi Villas",
      descriptionKey: "properties.sample3",
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      price: 250,
      image:
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=400&fit=crop",
      rating: 4.7,
      reviews: 38,
      amenities: ["amenities.fastWifi", "amenities.ac", "amenities.fullKitchen", "amenities.balcony"],
    },
    {
      id: 4,
      name: "The Ogra House",
      property: "The Ogra House",
      descriptionKey: "properties.sample4",
      bedrooms: 4,
      bathrooms: 2,
      maxGuests: 8,
      price: 220,
      image:
        "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop",
      rating: 4.9,
      reviews: 67,
      amenities: ["amenities.fastWifi", "amenities.ac", "amenities.fullKitchen", "amenities.beachAccess"],
    },
    {
      id: 5,
      name: "The Bungalows - Unit 1",
      property: "The Bungalows",
      descriptionKey: "properties.sample5",
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      price: 140,
      image:
        "https://images.unsplash.com/photo-1512207736139-e54660a749a0?w=600&h=400&fit=crop",
      rating: 4.6,
      reviews: 44,
      amenities: ["amenities.fastWifi", "amenities.ac", "amenities.fullKitchen", "amenities.patio"],
    },
    {
      id: 6,
      name: "The Bungalows - Unit 2",
      property: "The Bungalows",
      descriptionKey: "properties.sample6",
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      price: 160,
      image:
        "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=600&h=400&fit=crop",
      rating: 4.7,
      reviews: 51,
      amenities: ["amenities.fastWifi", "amenities.ac", "amenities.fullKitchen", "amenities.garden"],
    },
  ];

  // Apply filters
  let filtered = allProperties;

  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = searchParams.get("guests");

  if (priceFilter !== "all") {
    const [min, max] = priceFilter.split("-").map(Number);
    filtered = filtered.filter(
      (p) => p.price >= min && (!max || p.price <= max),
    );
  }

  if (bedroomFilter !== "all") {
    filtered = filtered.filter((p) => p.bedrooms >= parseInt(bedroomFilter));
  }

  if (guests) {
    const guestCount = parseInt(guests);
    filtered = filtered.filter((p) => p.maxGuests >= guestCount);
  }

  return (
    <Layout>
      {/* Header */}
      <div className="bg-primary/5 border-b border-border">
        <div className="container-max py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {t("properties.title")}
          </h1>
          <p className="text-muted-foreground">
            {filtered.length} {t("properties.available")}
            {checkIn && checkOut && ` • ${checkIn} to ${checkOut}`}
            {guests && ` • ${guests} guests`}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-max py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-20">
              <h3 className="text-lg font-bold text-foreground mb-6">
                {t("common.select")}
              </h3>

              {/* Price Filter */}
              <div className="mb-8">
                <h4 className="font-semibold text-foreground mb-4">
                  {t("properties.filter.price")}
                </h4>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "All Prices" },
                    { value: "0-150", label: `Under ${formatCurrency(150, language)}` },
                    { value: "150-250", label: `${formatCurrency(150, language)} - ${formatCurrency(250, language)}` },
                    { value: "250-500", label: `${formatCurrency(250, language)} - ${formatCurrency(500, language)}` },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="price"
                        value={option.value}
                        checked={priceFilter === option.value}
                        onChange={(e) => setPriceFilter(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-foreground text-sm">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Bedroom Filter */}
              <div className="mb-8">
                <h4 className="font-semibold text-foreground mb-4">{t("properties.filter.bedrooms")}</h4>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "All Bedrooms" },
                    { value: "2", label: "2+ Bedrooms" },
                    { value: "3", label: "3+ Bedrooms" },
                    { value: "4", label: "4+ Bedrooms" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="bedroom"
                        value={option.value}
                        checked={bedroomFilter === option.value}
                        onChange={(e) => setBedroomFilter(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-foreground text-sm">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset Filters */}
              {(priceFilter !== "all" || bedroomFilter !== "all") && (
                <button
                  onClick={() => {
                    setPriceFilter("all");
                    setBedroomFilter("all");
                  }}
                  className="w-full py-2 text-primary font-semibold hover:text-primary/80 transition-colors border-t border-border pt-4"
                >
                  {t("properties.filter.clearFilters")}
                </button>
              )}
            </div>
          </div>

          {/* Properties Grid */}
          <div className="lg:col-span-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-4">
                  {t("properties.noResults")}
                </p>
                <button
                  onClick={() => {
                    setPriceFilter("all");
                    setBedroomFilter("all");
                  }}
                  className="btn-secondary"
                >
                  {t("properties.filter.clearFilters")}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filtered.map((property) => (
                  <Link
                    key={property.id}
                    to={`/properties/${property.id}`}
                    className="grid md:grid-cols-3 gap-6 card-hover p-4 md:p-6"
                  >
                    {/* Image */}
                    <div className="md:col-span-1">
                      <div className="relative h-64 md:h-full rounded-lg overflow-hidden bg-muted group">
                        <img
                          src={property.image}
                          alt={property.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="md:col-span-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {property.property}
                            </p>
                            <h3 className="text-xl font-bold text-foreground">
                              {property.name}
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(property.price, language)}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              per night
                            </p>
                          </div>
                        </div>

                            <p className="text-muted-foreground mb-4">
                              {t(property.descriptionKey)}
                        </p>

                        {/* Details */}
                        <div className="flex flex-wrap gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-foreground">
                            <Bed size={16} className="text-primary" />
                            {property.bedrooms} {property.bedrooms === 1 ? t("common.bedroom") : t("common.bedrooms")}
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Bath size={16} className="text-primary" />
                            {property.bathrooms} {property.bathrooms === 1 ? t("common.bathroom") : t("common.bathrooms")}
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Users size={16} className="text-primary" />
                            {property.maxGuests} {t("common.guests")}
                          </div>
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {property.amenities.slice(0, 3).map((amenity, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full"
                            >
                              {t(amenity)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Rating & CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className="fill-accent text-accent"
                              />
                            ))}
                          </div>
                          <span className="font-semibold text-foreground">
                            {property.rating}
                          </span>
                        </div>
                        <button className="btn-primary">View Details</button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

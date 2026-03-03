import Layout from "@/components/Layout";
import { apiUrl, imageUrl, placeholderImage } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Users, Bed, Bath } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

type UnitWithProperty = {
  id: string;
  propertyId: string;
  name: string;
  description?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePrice: number;
  images: string[];
  property: {
    id: string;
    name: string;
    city: string;
    country: string;
    location: string;
    main_image?: string;
  } | null;
};

export default function Properties() {
  const [searchParams] = useSearchParams();
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedroomFilter, setBedroomFilter] = useState("all");
  const [units, setUnits] = useState<UnitWithProperty[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const { language, t } = useLanguage();

  // Apply filters
  let filtered = units;

  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = searchParams.get("guests");

  if (priceFilter !== "all") {
    const [min, max] = priceFilter.split("-").map(Number);
    filtered = filtered.filter(
      (p) => p.basePrice >= min && (!max || p.basePrice <= max),
    );
  }

  if (bedroomFilter !== "all") {
    filtered = filtered.filter((p) => p.bedrooms >= parseInt(bedroomFilter));
  }

  if (guests) {
    const guestCount = parseInt(guests);
    filtered = filtered.filter((p) => p.maxGuests >= guestCount);
  }

  useEffect(() => {
    const loadUnits = async () => {
      try {
        console.log("🔍 [CLIENT] Fetching properties for properties page...");
        const response = await fetch(apiUrl("/api/properties"));

        if (!response.ok) {
          throw new Error(`Failed to load properties: ${response.status}`);
        }

        const json = await response.json();
        const data = (json.data ?? []) as any[];

        // Flatten units from properties
        const mapped: UnitWithProperty[] = [];
        console.log("🔍 [PROPERTIES] Raw data from API:", data);
        
        (data || []).forEach((property, index) => {
          console.log(`🔍 [PROPERTIES] Processing property ${index}:`, {
            id: property.id,
            name: property.name,
            hasUnits: !!property.units,
            unitsType: typeof property.units,
            unitsLength: property.units?.length || 0,
            unitsData: property.units
          });
          
          // Check if property has units and if units array has data
          if (property.units && Array.isArray(property.units) && property.units.length > 0) {
            // Convert units object to array if needed
            const unitsArray = Array.isArray(property.units) ? property.units : [property.units];
            
            unitsArray.forEach((unit: any) => {
              console.log(`🔍 [PROPERTIES] Processing unit:`, {
                id: unit.id,
                name: unit.name,
                images: unit.images,
                imagesType: typeof unit.images,
                imagesLength: unit.images?.length || 0,
                propertyMainImage: unit.property?.main_image
              });
              
              mapped.push({
                id: unit.id,
                propertyId: unit.propertyId || property.id,
                name: unit.name,
                description: unit.description,
                bedrooms: unit.bedrooms,
                bathrooms: unit.bathrooms,
                maxGuests: unit.maxGuests,
                basePrice: unit.basePrice,
                images: Array.isArray(unit.images) ? unit.images : (unit.images ? Object.keys(unit.images).map(key => unit.images[key]) : []),
                property: {
                  id: property.id,
                  name: property.name,
                  city: property.city,
                  country: property.country,
                  location: property.location,
                  main_image: property.main_image ?? property.mainImage,
                }
              });
            });
          }
        });

        console.log("🔍 [PROPERTIES] Mapped units:", mapped.length, "from properties:", data.length);
        setUnits(mapped);
      } catch (error) {
        console.error("❌ [CLIENT] Error loading properties", error);
        setUnitsError("Unable to load properties right now.");
      } finally {
        setLoadingUnits(false);
      }
    };

    loadUnits();
  }, []);

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
            {loadingUnits ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground">
                  Loading properties...
                </p>
              </div>
            ) : unitsError ? (
              <div className="text-center py-16">
                <p className="text-destructive text-sm mb-4">{unitsError}</p>
              </div>
            ) : filtered.length === 0 ? (
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
                {filtered.map((unit) => (
                  <Link
                    key={unit.id}
                    to={`/properties/${unit.property?.id ?? unit.propertyId}`}
                    className="grid md:grid-cols-3 gap-6 card-hover p-4 md:p-6"
                  >
                    {/* Image */}
                    <div className="md:col-span-1">
                      <div className="relative h-64 md:h-full rounded-lg overflow-hidden bg-muted group">
                        <img
                          src={
                            (unit.images?.length && unit.images[0])
                              ? imageUrl(unit.images[0])
                              : (unit.property?.main_image)
                                ? imageUrl(unit.property.main_image)
                                : placeholderImage()
                          }
                          alt={unit.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onLoad={(e) => {
                            console.log("🖼️ [PROPERTIES] Image loaded successfully:", {
                              unitName: unit.name,
                              unitId: unit.id,
                              imageSrc: e.currentTarget.src,
                              hasUnitImages: !!unit.images?.length,
                              firstUnitImage: unit.images?.[0],
                              hasPropertyImage: !!unit.property?.main_image,
                              propertyImage: unit.property?.main_image,
                              timestamp: new Date().toISOString()
                            });
                          }}
                          onError={(e) => {
                            console.error("❌ [PROPERTIES] Image failed to load:", {
                              unitName: unit.name,
                              unitId: unit.id,
                              attemptedSrc: e.currentTarget.src,
                              originalSrc: e.currentTarget.src,
                              hasUnitImages: !!unit.images?.length,
                              firstUnitImage: unit.images?.[0],
                              hasPropertyImage: !!unit.property?.main_image,
                              propertyImage: unit.property?.main_image,
                              eventType: e.type,
                              timestamp: new Date().toISOString()
                            });
                            
                            // Try fallback to property image if unit image failed
                            if (unit.images?.length && unit.images[0] && unit.property?.main_image) {
                              console.log("🔄 [PROPERTIES] Trying fallback to property image:", unit.property.main_image);
                              e.currentTarget.src = imageUrl(unit.property.main_image);
                            } else {
                              console.log("🔄 [PROPERTIES] Using placeholder image");
                              e.currentTarget.src = placeholderImage();
                            }
                          }}
                        />
                        {/* Debug overlay - remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                            <div>Debug: {unit.images?.length ? `Unit: ${unit.images[0]}` : 'No unit images'}</div>
                            <div>Property: {unit.property?.main_image || 'No property image'}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="md:col-span-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              {unit.property?.name}
                              {unit.property && (
                                <>
                                  {" · "}
                                  <MapPin size={14} className="text-primary" />
                                  <span>
                                    {unit.property.city}, {unit.property.country}
                                  </span>
                                </>
                              )}
                            </p>
                            <h3 className="text-xl font-bold text-foreground">
                              {unit.name}
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(unit.basePrice, language)}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              per night
                            </p>
                          </div>
                        </div>

                        {unit.description && (
                          <p className="text-muted-foreground mb-4">
                            {unit.description}
                          </p>
                        )}

                        {/* Details */}
                        <div className="flex flex-wrap gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-foreground">
                            <Bed size={16} className="text-primary" />
                            {unit.bedrooms}{" "}
                            {unit.bedrooms === 1
                              ? t("common.bedroom")
                              : t("common.bedrooms")}
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Bath size={16} className="text-primary" />
                            {unit.bathrooms}{" "}
                            {unit.bathrooms === 1
                              ? t("common.bathroom")
                              : t("common.bathrooms")}
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Users size={16} className="text-primary" />
                            {unit.maxGuests} {t("common.guests")}
                          </div>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="text-sm text-muted-foreground">
                          {t("properties.available")}
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

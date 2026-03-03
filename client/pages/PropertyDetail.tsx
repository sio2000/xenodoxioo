import Layout from "@/components/Layout";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useParams, Link } from "react-router-dom";
import {
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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Mountain,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/hooks/useLanguage";
import { apiUrl, imageUrl } from "@/lib/api";
import formatCurrency from "@/lib/currency";

type ApiUnit = {
  id: string;
  name: string;
  description?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePrice: number;
  cleaningFee: number;
  images: string[];
};

type ApiPropertyDetail = {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  main_image: string;
  gallery_images: string[];
  units: ApiUnit[];
};

// Map property/unit names to view video filenames (in public/viewvideos)
// Returns encoded URL for spaces and special chars (Greek etc.)
function getViewVideoPath(propertyName: string, unitName: string): string | null {
  const normalized = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  const p = normalized(propertyName);
  const u = normalized(unitName);

  let raw: string | null = null;
  if (p.includes("ogra") || u.includes("ogra")) raw = "/api/viewvideos/Ogra House.mp4";
  else if (p.includes("small") || u.includes("small bungalow"))
    raw = "/api/viewvideos/Small bungalow.mp4";
  else if (
    p.includes("μεγάλο") ||
    p.includes("megalo") ||
    p.includes("big bungalow") ||
    u.includes("big") ||
    u.includes("μεγάλο")
  )
    raw = "/api/viewvideos/Μεγάλο bungalow.mp4";
  else if (p.includes("lykoskufi 5") || u.includes("lykoskufi 5"))
    raw = "/api/viewvideos/Lykoskufi 5.mp4";
  else if (
    p.includes("lykoskufi 2") ||
    p.includes("lykoskufi2") ||
    u.includes("lykoskufi 2") ||
    u.includes("lykoskufi2")
  )
    raw = "/api/viewvideos/Lykoskufi2.mp4";
  else if (p.includes("lykoskufi")) raw = "/api/viewvideos/Lykoskufi2.mp4";

  return raw ? raw.replace(/[^/]+$/, (filename) => encodeURIComponent(filename)) : null;
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const [selectedDates, setSelectedDates] = useState<{
    checkIn: Date;
    checkOut: Date;
  } | null>(null);
  const [data, setData] = useState<ApiPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbScrollRef = useRef<HTMLDivElement>(null);
  const [videoHovered, setVideoHovered] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        console.log("🔍 [CLIENT] Fetching property detail...", id);
        const response = await fetch(apiUrl(`/api/properties/id/${id}`));
        if (!response.ok) {
          throw new Error(`Failed to load property: ${response.status}`);
        }
        const json = await response.json();
        const payload = json.data as ApiPropertyDetail;
        // Normalise images arrays
        if (payload.gallery_images && Array.isArray(payload.gallery_images)) {
          // Already an array, keep as is
        } else if (payload.gallery_images && typeof payload.gallery_images === 'string') {
          try {
            payload.gallery_images = JSON.parse(payload.gallery_images);
          } catch {
            payload.gallery_images = [];
          }
        } else {
          payload.gallery_images = [];
        }
        payload.units = (payload.units ?? []).map((u: any) => {
          let images: string[] = [];
          if (Array.isArray(u.images)) {
            images = u.images;
          } else if (typeof u.images === "string" && u.images) {
            try {
              images = JSON.parse(u.images) as string[];
            } catch {
              images = [];
            }
          }
          return {
            id: u.id,
            name: u.name,
            description: u.description,
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
            maxGuests: u.maxGuests,
            basePrice: u.basePrice,
            cleaningFee: u.cleaningFee ?? 0,
            images,
          };
        });
        setData(payload);
      } catch (err) {
        console.error("❌ [CLIENT] Error loading property detail", err);
        setError("Unable to load property details right now.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const currentUnit = data?.units[selectedUnitIndex] ?? null;
  const rawImages =
    currentUnit?.images?.length
      ? currentUnit.images
      : data?.gallery_images ?? [];
  const images =
    rawImages.length > 0
      ? rawImages
      : data?.main_image
        ? [data.main_image]
        : [];

  // Scroll selected thumbnail into view when changing image
  useEffect(() => {
    const el = thumbScrollRef.current;
    if (!el || images.length <= 1) return;
    const thumb = el.querySelector(`[data-thumb-index="${selectedImage}"]`);
    thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedImage, images.length]);

  const canBook = !!(data && currentUnit && selectedDates);
  const handleBooking = () => {
    if (!canBook) return;
    const params = new URLSearchParams({
      unit: currentUnit!.id,
      property: data!.id,
      checkIn: selectedDates!.checkIn.toISOString(),
      checkOut: selectedDates!.checkOut.toISOString(),
    });
    window.location.href = `/checkout?${params.toString()}`;
  };
  return (
    <Layout>
      {/* Image Gallery */}
      <div className="bg-black relative">
        <div className="container-max">
          {loading ? (
            <div className="py-16 text-center text-white/80">
              {t("common.loading")}
            </div>
          ) : error || !data ? (
            <div className="py-16 text-center text-red-300">
              {error || "Property not found."}
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-2 py-6">
              {/* Main Image */}
              <div className="md:col-span-2 relative rounded-lg overflow-hidden h-96 md:h-[500px]">
                {images.length > 0 && (
                  <img
                    src={imageUrl(images[selectedImage])}
                    alt={currentUnit?.name ?? data.name}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setSelectedImage((i) =>
                          i === 0 ? images.length - 1 : i - 1
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedImage((i) =>
                          i === images.length - 1 ? 0 : i + 1
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors shadow-lg"
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      {images.length <= 15 ? (
                        images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImage(idx)}
                            className={`w-2 h-2 rounded-full transition-colors flex-shrink-0 ${
                              selectedImage === idx
                                ? "bg-white"
                                : "bg-white/50 hover:bg-white/70"
                            }`}
                            aria-label={`View image ${idx + 1}`}
                          />
                        ))
                      ) : (
                        <span className="text-white/90 text-sm font-medium">
                          {selectedImage + 1} / {images.length}
                        </span>
                      )}
                    </div>
                  </>
                )}
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-white/90 transition-colors"
                  aria-label="Save"
                >
                  <Heart
                    size={20}
                    className={
                      isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
                    }
                  />
                </button>
              </div>

              {/* Thumbnail Gallery - adaptive: few images fill space, many use scroll */}
              {(() => {
                const isMany = images.length > 9;
                const cols = isMany ? undefined : Math.min(3, Math.max(1, Math.ceil(Math.sqrt(images.length))));
                const rows = isMany ? 3 : Math.ceil(images.length / cols) || 1;
                return (
                  <div
                    ref={thumbScrollRef}
                    className={`md:col-span-2 h-96 md:h-[500px] rounded-lg ${
                      isMany ? "overflow-x-auto overflow-y-hidden scroll-smooth" : "overflow-hidden"
                    }`}
                    style={isMany ? { scrollbarWidth: "thin" } : undefined}
                  >
                    <div
                      className={`grid gap-2 h-full p-1 ${
                        isMany ? "grid-flow-col grid-rows-3 auto-cols-[110px] md:auto-cols-[140px]" : ""
                      }`}
                      style={
                        isMany
                          ? { minHeight: "100%" }
                          : {
                              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                            }
                      }
                    >
                      {images.map((image, idx) => (
                        <button
                          key={idx}
                          data-thumb-index={idx}
                          onClick={() => setSelectedImage(idx)}
                          className={`rounded-lg overflow-hidden min-w-0 min-h-0 w-full h-full transition-all ${
                            selectedImage === idx
                              ? "ring-2 ring-accent ring-offset-1 ring-offset-black"
                              : ""
                          }`}
                        >
                      <img
                        src={imageUrl(image)}
                        alt={`View ${idx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Quick Info Bar */}
      {!loading && data && currentUnit && (
        <div className="border-b border-border bg-muted/30">
          <div className="container-max">
            <div className="flex flex-wrap items-center gap-6 py-4 md:py-5 text-sm md:text-base">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Users size={20} className="text-primary shrink-0" />
                <span>{t("property.quickInfo.guests").replace("{n}", String(currentUnit.maxGuests))}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Bed size={20} className="text-primary shrink-0" />
                <span>{t("property.quickInfo.bedrooms").replace("{n}", String(currentUnit.bedrooms))}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Bath size={20} className="text-primary shrink-0" />
                <span>{t("property.quickInfo.bathrooms").replace("{n}", String(currentUnit.bathrooms))}</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-muted-foreground">
                <Wifi size={20} className="shrink-0" aria-hidden />
                <Wind size={20} className="shrink-0" aria-hidden />
                <Utensils size={20} className="shrink-0" aria-hidden />
                <Waves size={20} className="shrink-0" aria-hidden />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground ml-auto">
                <MapPin size={18} className="shrink-0" />
                <span>{data.location || `${data.city}, ${data.country}`}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container-max py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {loading || !data || !currentUnit ? (
              <div className="mb-8">
                {error ? (
                  <p className="text-destructive">{error}</p>
                ) : (
                  <p className="text-muted-foreground">Loading details...</p>
                )}
              </div>
            ) : (
              <>
                {/* Header & Experience Description */}
                <div className="mb-10">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                    {data.name}
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                    {currentUnit.name}
                  </h1>

                  {/* Description — lead paragraph + body */}
                  <div className="space-y-5">
                    <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium">
                      {data.description}
                    </p>
                    {currentUnit.description && (
                      <p className="text-muted-foreground leading-relaxed">
                        {currentUnit.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* View from room — unforgettable section */}
                {getViewVideoPath(data.name, currentUnit.name) && (
                  <section className="mb-8" aria-labelledby="view-from-room-heading">
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/8 via-accent/5 to-primary/10 border border-primary/10 shadow-xl shadow-primary/5">
                      {/* Soft glow & divider */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--accent)/0.12),transparent)] pointer-events-none" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                      <header className="relative px-6 pt-8 pb-2">
                        <div className="flex items-center gap-4">
                          <div className="view-section-icon flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 via-accent/20 to-primary/20 text-primary shadow-lg shadow-primary/10 ring-2 ring-white/50 ring-offset-2 ring-offset-background transition-transform hover:scale-105">
                            <Mountain size={28} strokeWidth={1.5} className="drop-shadow-sm" />
                          </div>
                          <div>
                            <h2 id="view-from-room-heading" className="text-2xl font-bold text-foreground tracking-tight">
                              {t("property.viewFromRoom")}
                            </h2>
                            <p className="text-muted-foreground mt-0.5 text-base leading-relaxed">
                              {t("property.viewFromRoomDesc")}
                            </p>
                          </div>
                        </div>
                      </header>

                      <div className="relative px-4 pb-6 sm:px-6 sm:pb-8">
                        <div className="relative rounded-2xl overflow-hidden bg-black/5 ring-1 ring-black/5 ring-inset shadow-inner">
                          <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50 z-[1]" />
                          <div
                            className="aspect-video relative group cursor-pointer"
                            onMouseEnter={() => setVideoHovered(true)}
                            onMouseLeave={() => setVideoHovered(false)}
                          >
                            <video
                              ref={videoRef}
                              src={apiUrl(getViewVideoPath(data.name, currentUnit.name) || "")}
                              controls
                              playsInline
                              preload="auto"
                              autoPlay
                              muted
                              loop
                              onPlay={() => setVideoStarted(true)}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                            {/* "Press play" hint — fades on hover or when video starts */}
                            <div
                              className={`absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 via-black/20 to-transparent pointer-events-none transition-opacity duration-500 z-[2] ${
                                videoHovered || videoStarted ? "opacity-0" : "opacity-100"
                              }`}
                            >
                              <p className="text-white/95 text-sm sm:text-base font-medium tracking-wide drop-shadow-lg px-4 text-center">
                                {t("property.viewFromRoomTagline")}
                              </p>
                            </div>
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <button
                              type="button"
                              onClick={() => {
                                const el = videoRef.current;
                                if (el) {
                                  if (!document.fullscreenElement) {
                                    el.requestFullscreen?.();
                                  } else {
                                    document.exitFullscreen?.();
                                  }
                                }
                              }}
                              className="absolute bottom-5 right-5 p-3 rounded-xl bg-black/50 hover:bg-primary backdrop-blur-sm text-white transition-all duration-300 opacity-90 group-hover:opacity-100 group-hover:scale-110 shadow-lg hover:shadow-primary/30 z-10"
                              aria-label="Fullscreen"
                            >
                              <Maximize2 size={22} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        {/* Poetic footer — closes the section memorably */}
                        <p className="mt-5 text-center text-sm text-foreground font-bold tracking-wide">
                          {t("property.viewFromRoomFooter")}
                        </p>
                        <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-primary/20 rounded-bl-lg hidden sm:block" />
                        <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-primary/20 rounded-br-lg hidden sm:block" />
                      </div>
                    </div>
                  </section>
                )}

                {/* Amenities — grouped */}
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    {t("property.amenities")}
                  </h2>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                        {t("property.amenities.essentials")}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { icon: Wifi, labelKey: "amenities.fastWifi", descKey: "amenities.fastWifiDesc" },
                          { icon: Wind, labelKey: "amenities.ac", descKey: "amenities.acDesc" },
                          { icon: Utensils, labelKey: "amenities.fullKitchen", descKey: "amenities.fullKitchenDesc" },
                          { icon: Tv, labelKey: "amenities.smartTV", descKey: "amenities.smartTVDesc" },
                        ].map((amenity, idx) => {
                          const Icon = amenity.icon;
                          return (
                            <div key={idx} className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                              <div className="flex-shrink-0">
                                <Icon size={28} className="text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  {t(amenity.labelKey)}
                                </h4>
                                <p className="text-muted-foreground text-sm mt-0.5">
                                  {t(amenity.descKey)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                        {t("property.amenities.outdoor")}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { icon: Waves, labelKey: "amenities.privatePool", descKey: "amenities.privatePoolDesc" },
                          { icon: MapPin, labelKey: "amenities.beachAccess", descKey: "amenities.beachAccessDesc" },
                        ].map((amenity, idx) => {
                          const Icon = amenity.icon;
                          return (
                            <div key={idx} className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                              <div className="flex-shrink-0">
                                <Icon size={28} className="text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  {t(amenity.labelKey)}
                                </h4>
                                <p className="text-muted-foreground text-sm mt-0.5">
                                  {t(amenity.descKey)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights */}
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("property.whyLove")}
                  </h2>
                  <ul className="space-y-3">
                    {[
                      "property.highlights.seaViews",
                      "property.highlights.modernKitchen",
                      "property.highlights.spaciousLiving",
                      "property.highlights.privateTerrace",
                      "property.highlights.parking",
                      "property.highlights.cleaning",
                    ].map((highlightKey, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-foreground">
                          {t(highlightKey)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trust & Social Proof */}
                <section className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/10" aria-labelledby="trust-heading">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Shield size={24} className="text-primary" />
                    </div>
                    <div>
                      <h2 id="trust-heading" className="text-xl font-bold text-foreground mb-2">
                        {t("property.trustTitle")}
                      </h2>
                      <p className="text-muted-foreground mb-4">
                        {t("property.trustDesc")}
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-foreground">
                          <CheckCircle2 size={18} className="text-primary shrink-0" />
                          <span>{t("property.freeCancel")}</span>
                        </li>
                        <li className="flex items-center gap-2 text-foreground">
                          <CheckCircle2 size={18} className="text-primary shrink-0" />
                          <span>{t("property.securePayment")}</span>
                        </li>
                        <li className="flex items-center gap-2 text-foreground">
                          <CheckCircle2 size={18} className="text-primary shrink-0" />
                          <span>{t("property.cleaningIncluded")}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Location */}
                <section className="mb-10" aria-labelledby="location-heading">
                  <h2 id="location-heading" className="text-2xl font-bold text-foreground mb-4">
                    {t("property.locationTitle")}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {t("property.locationDesc")}
                  </p>
                  <div className="rounded-2xl overflow-hidden border border-border shadow-lg mb-6 h-64 sm:h-80 md:h-96">
                    <iframe
                      src="https://www.openstreetmap.org/export/embed.html?bbox=22.82%2C37.14%2C22.90%2C37.20&layer=mapnik&marker=37.169%2C22.857"
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={t("property.locationTitle")}
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location || `${data.city}, ${data.country}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                  >
                    <MapPin size={18} />
                    {t("property.getDirections")}
                  </a>
                  <p className="text-sm font-medium text-foreground mt-6 mb-2">{t("property.nearby")}</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border/50">
                      <Waves size={18} className="text-primary shrink-0" />
                      <span className="text-sm font-medium">{t("property.nearby.beach")}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border/50">
                      <MapPin size={18} className="text-primary shrink-0" />
                      <span className="text-sm font-medium">{t("property.nearby.town")}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border/50">
                      <MapPin size={18} className="text-primary shrink-0" />
                      <span className="text-sm font-medium">{t("property.nearby.airport")}</span>
                    </div>
                  </div>
                </section>

                {/* FAQ */}
                <section className="mb-8" aria-labelledby="faq-heading">
                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-6 py-5 bg-muted/30 border-b border-border">
                      <h2 id="faq-heading" className="text-xl font-bold text-foreground">
                        {t("property.faqTitle")}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("property.faqSubtitle")}
                      </p>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="checkin" className="border-b border-border px-6">
                        <AccordionTrigger className="py-5 hover:no-underline hover:text-primary transition-colors text-left font-semibold">
                          {t("property.faq.checkInQ")}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5 pr-8 leading-relaxed">
                          {t("property.faq.checkInA")}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="cancellation" className="border-b border-border px-6">
                        <AccordionTrigger className="py-5 hover:no-underline hover:text-primary transition-colors text-left font-semibold">
                          {t("property.faq.cancellationQ")}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5 pr-8 leading-relaxed">
                          {t("property.faq.cancellationA")}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="payment" className="border-b border-border px-6">
                        <AccordionTrigger className="py-5 hover:no-underline hover:text-primary transition-colors text-left font-semibold">
                          {t("property.faq.paymentQ")}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5 pr-8 leading-relaxed">
                          {t("property.faq.paymentA")}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="rules" className="border-b border-border px-6">
                        <AccordionTrigger className="py-5 hover:no-underline hover:text-primary transition-colors text-left font-semibold">
                          {t("property.faq.rulesQ")}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5 pr-8 leading-relaxed">
                          {t("property.faq.rulesA")}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="contact" className="px-6">
                        <AccordionTrigger className="py-5 hover:no-underline hover:text-primary transition-colors text-left font-semibold">
                          {t("property.faq.contactQ")}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5 pr-8 leading-relaxed">
                          {t("property.faq.contactA")}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6 shadow-lg">
              {loading || !data || !currentUnit ? (
                <p className="text-muted-foreground">{t("checkout.loadingPricing")}</p>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(currentUnit.basePrice, language)}
                      </span>
                      <span className="text-muted-foreground">{t("common.perNight")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("checkout.taxes")}
                    </p>
                  </div>

                  <AvailabilityCalendar
                    unitId={currentUnit.id}
                    onSelectDates={(checkIn, checkOut) =>
                      setSelectedDates({ checkIn, checkOut })
                    }
                  />

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm mb-6">
                    <div className="flex justify-between text-foreground">
                      <span>
                        1 {t("common.night")} ×{" "}
                        {formatCurrency(currentUnit.basePrice, language)}
                      </span>
                      <span>{formatCurrency(currentUnit.basePrice, language)}</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>{t("checkout.cleaningFee")}</span>
                      <span>{formatCurrency(currentUnit.cleaningFee, language)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                      <span>{t("property.totalPrice")}</span>
                      <span>
                        {formatCurrency(
                          currentUnit.basePrice + currentUnit.cleaningFee,
                          language,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Book Button */}
                  <button
                    onClick={handleBooking}
                    disabled={!canBook}
                    className="btn-primary w-full justify-center mb-3"
                  >
                    {t("nav.bookNow")}
                  </button>
                </>
              )}

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

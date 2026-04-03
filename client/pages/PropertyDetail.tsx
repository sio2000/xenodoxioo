import Layout from "@/components/Layout";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  Bed,
  BedDouble,
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
  Car,
  PawPrint,
  Ban,
  Flame,
  ThermometerSun,
  LayoutGrid,
  ListPlus,
  Sofa,
  Home,
  Globe,
  Music,
  Microwave,
  Refrigerator,
  WashingMachine,
  Fan,
  Zap,
  Coffee,
  UtensilsCrossed,
  Sun,
  Table,
  Sparkles,
  Heater,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { apiUrl, imageUrl, placeholderImage } from "@/lib/api";
import {
  getUnitBedTagKey,
  getUnitBedDisplay,
  getMaxGuestsForUnit,
  getUnitDisplayTitleKey,
  getClosedBungalowNightlyDisplayPrice,
  getClosedBungalowSeasonMessageKey,
  isSmallBungalowUnit,
  isBigBungalowUnit,
  isSeasonalBungalowUnit,
} from "@/lib/room-display-order";
import formatCurrency from "@/lib/currency";
import { getTieredPricePerNight } from "@/lib/price-tiers";
import { Send, MessageSquare } from "lucide-react";

// ── Inquiry Form Component ─────────────────────────────────────────

function InquiryForm({ propertyId }: { propertyId: string }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ guestName: "", guestEmail: "", checkinDate: "", checkoutDate: "", guests: 2, message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/inquiries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, propertyId }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("inquiry.errorGeneric"));
      }
    } catch {
      setError(t("inquiry.errorNetwork"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="mb-10">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-800 mb-2">{t("inquiry.successTitle")}</h3>
          <p className="text-green-700">{t("inquiry.successDesc")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10" aria-labelledby="inquiry-heading">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <div>
              <h2 id="inquiry-heading" className="text-xl font-bold text-foreground">
                {t("inquiry.title")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("inquiry.subtitle")}
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">{t("inquiry.name")} *</label>
              <input type="text" required value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">{t("inquiry.email")} *</label>
              <input type="email" required value={form.guestEmail} onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">{t("inquiry.checkIn")} *</label>
              <input type="date" required value={form.checkinDate} onChange={(e) => setForm((f) => ({ ...f, checkinDate: e.target.value }))}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">{t("inquiry.checkOut")} *</label>
              <input type="date" required value={form.checkoutDate} onChange={(e) => setForm((f) => ({ ...f, checkoutDate: e.target.value }))}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">{t("inquiry.guests")} *</label>
              <input type="number" min={1} max={20} required value={form.guests} onChange={(e) => setForm((f) => ({ ...f, guests: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">{t("inquiry.message")} *</label>
            <textarea required rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
              placeholder={t("inquiry.messagePlaceholder")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting}
            className="btn-primary w-full justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={16} />
            {submitting ? t("inquiry.sending") : t("inquiry.send")}
          </button>
        </form>
      </div>
    </section>
  );
}

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
  closedForCurrentPeriod?: boolean;
  reopenDate?: string | null;
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
// Returns direct URL for public folder videos
function getViewVideoPath(propertyName: string, unitName: string): string | null {
  const normalized = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  const p = normalized(propertyName);
  const u = normalized(unitName);

  let raw: string | null = null;
  if (p.includes("ogra") || u.includes("ogra")) raw = "/viewvideos/Ogra House.mp4";
  else if (p.includes("small") || u.includes("small bungalow"))
    raw = "/viewvideos/Small bungalow.mp4";
  else if (
    p.includes("μεγάλο") ||
    p.includes("megalo") ||
    p.includes("big") ||
    u.includes("big") ||
    u.includes("μεγάλο")
  )
    raw = "/viewvideos/Μεγάλο bungalow.mp4";
  else if (p.includes("lykoskufi 5") || u.includes("lykoskufi 5"))
    raw = "/viewvideos/Lykoskufi 5.mp4";
  else if (
    p.includes("lykoskufi 2") ||
    p.includes("lykoskufi2") ||
    u.includes("lykoskufi 2") ||
    u.includes("lykoskufi2")
  )
    raw = "/viewvideos/Lykoskufi2.mp4";
  else if (p.includes("lykoskufi")) raw = "/viewvideos/Lykoskufi2.mp4";

  return raw ? raw.replace(/[^/]+$/, (filename) => encodeURIComponent(filename)) : null;
}

// License info per property group (EOT/AA + KAEK). Returns null if no match.
type LicenseInfo = { labelKey: string; licenseNumber: string; kaek: string };
function getPropertyLicenseInfo(propertyName: string, unitName: string): LicenseInfo | null {
  const n = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const p = n(propertyName);
  const u = n(unitName);
  const check = (key: string) => p.includes(key) || u.includes(key);

  if (check("lykoskufi")) return { labelKey: "property.license.eot", licenseNumber: "1365294", kaek: "031751707103" };
  if (check("ogra")) return { labelKey: "property.license.aa", licenseNumber: "1246K91000329401", kaek: "031751707112" };
  if (check("bungalow")) return { labelKey: "property.license.aa", licenseNumber: "1283732", kaek: "031751707110" };
  return null;
}

// Unit description translation key (descriptions come from system, not admin panel)
function getUnitDescriptionKey(propertyName: string, unitName: string): string | null {
  const n = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const p = n(propertyName);
  const u = n(unitName);
  const check = (key: string) => p.includes(key) || u.includes(key);

  if (check("ogra")) return "property.unitDesc.ograHouse";
  if (check("small") && check("bungalow")) return "property.unitDesc.smallBungalow";
  if ((check("big") || check("large") || check("μεγάλο") || check("megalo")) && check("bungalow")) return "property.unitDesc.bigBungalow";
  if (check("lykoskufi 5") || (check("lykoskufi") && u.includes("5"))) return "property.unitDesc.lykoskufi5";
  if (check("lykoskufi 2") || (check("lykoskufi") && (u.includes("2") || u.includes("ii")))) return "property.unitDesc.lykoskufi2";
  if (check("lykoskufi 1") || (check("lykoskufi") && (u.includes("1") || u.includes("i")))) return "property.unitDesc.lykoskufi1";
  if (check("lykoskufi")) return "property.unitDesc.lykoskufi1"; // fallback
  return null;
}

// True if unit is Lykoskufi 1, 2, 5 or Ogra House (rooms with full amenities modal)
function hasAmenitiesModal(unitName: string | undefined): boolean {
  if (!unitName) return false;
  const u = unitName.toLowerCase().trim().replace(/\s+/g, " ");
  if (/ogra\s*house/i.test(u)) return true;
  if (/lykoskufi\s*1|lykoskufi\s*2|lykoskufi\s*5|lykoskufi1|lykoskufi2|lykoskufi5/.test(u)) return true;
  return false;
}

// Amenities modal data: Lykoskufi 1, 2, 5
const LYKOSKUFI_AMENITIES_MODAL: Array<{ categoryKey: string; items: Array<{ key: string; descKey?: string }> }> = [
  { categoryKey: "amenities.modal.cat.parking", items: [{ key: "amenities.modal.parkingDesc", descKey: "amenities.modal.parkingDesc" }] },
  { categoryKey: "amenities.modal.cat.internet", items: [{ key: "amenities.modal.internetDesc", descKey: "amenities.modal.internetDesc" }] },
  { categoryKey: "amenities.modal.cat.kitchen", items: [
    { key: "amenities.modal.diningTable" }, { key: "amenities.modal.coffeeMachine" }, { key: "amenities.modal.cleaningProducts" },
    { key: "amenities.modal.toaster" }, { key: "amenities.modal.stovetop" }, { key: "amenities.modal.oven" },
    { key: "amenities.modal.cookware" }, { key: "amenities.modal.electricKettle" }, { key: "amenities.modal.kitchen" },
    { key: "amenities.modal.washingMachine" }, { key: "amenities.modal.dishwasher" }, { key: "amenities.modal.microwave" },
    { key: "amenities.modal.refrigerator" },
  ]},
  { categoryKey: "amenities.modal.cat.bedroom", items: [{ key: "amenities.modal.linens" }, { key: "amenities.modal.wardrobe" }] },
  { categoryKey: "amenities.modal.cat.bathroom", items: [
    { key: "amenities.modal.toiletPaper" }, { key: "amenities.modal.towels" }, { key: "amenities.modal.bathtubOrShower" },
    { key: "amenities.modal.privateBathroom" }, { key: "amenities.modal.toilet" }, { key: "amenities.modal.freeToiletries" },
    { key: "amenities.modal.hairDryer" }, { key: "amenities.modal.shower" },
  ]},
  { categoryKey: "amenities.modal.cat.living", items: [{ key: "amenities.modal.diningArea" }, { key: "amenities.modal.sofa" }, { key: "amenities.modal.sittingArea" }] },
  { categoryKey: "amenities.modal.cat.media", items: [{ key: "amenities.modal.flatScreenTV" }, { key: "amenities.modal.tv" }] },
  { categoryKey: "amenities.modal.cat.roomFeatures", items: [
    { key: "amenities.modal.outletNearBed" }, { key: "amenities.modal.dryingRack" }, { key: "amenities.modal.tiledFloor" },
    { key: "amenities.modal.soundproofing" }, { key: "amenities.modal.privateEntrance" }, { key: "amenities.modal.iron" },
  ]},
  { categoryKey: "amenities.modal.cat.pets", items: [{ key: "amenities.modal.petsDesc", descKey: "amenities.modal.petsDesc" }] },
  { categoryKey: "amenities.modal.cat.outdoor", items: [
    { key: "amenities.modal.outdoorDining" }, { key: "amenities.modal.outdoorFurniture" }, { key: "amenities.modal.yard" },
    { key: "amenities.modal.veranda" }, { key: "amenities.modal.garden" },
  ]},
  { categoryKey: "amenities.modal.cat.activities", items: [{ key: "amenities.modal.beach" }] },
  { categoryKey: "amenities.modal.cat.views", items: [{ key: "amenities.modal.gardenView" }, { key: "amenities.modal.seaView" }, { key: "amenities.modal.view" }] },
  { categoryKey: "amenities.modal.cat.building", items: [{ key: "amenities.modal.standalone" }] },
  { categoryKey: "amenities.modal.cat.reception", items: [{ key: "amenities.modal.invoice" }] },
  { categoryKey: "amenities.modal.cat.misc", items: [
    { key: "amenities.modal.ac" }, { key: "amenities.modal.smokingBan" }, { key: "amenities.modal.heating" },
    { key: "amenities.modal.familyRooms" }, { key: "amenities.modal.nonSmokingRooms" },
  ]},
  { categoryKey: "amenities.modal.cat.safety", items: [{ key: "amenities.modal.safe" }] },
  { categoryKey: "amenities.modal.cat.languages", items: [{ key: "amenities.modal.langDe" }, { key: "amenities.modal.langEl" }, { key: "amenities.modal.langEn" }, { key: "amenities.modal.langFr" }] },
];

function isLykoskufi5Unit(unitName: string | undefined): boolean {
  if (!unitName) return false;
  const u = unitName.toLowerCase().trim().replace(/\s+/g, " ");
  return /lykoskufi\s*5|lykoskufi5/.test(u);
}

function buildLykoskufiAmenitiesModal(unitName: string | undefined) {
  if (!isLykoskufi5Unit(unitName)) return LYKOSKUFI_AMENITIES_MODAL;
  return LYKOSKUFI_AMENITIES_MODAL.map((cat) =>
    cat.categoryKey === "amenities.modal.cat.media"
      ? { ...cat, items: [...cat.items, { key: "amenities.modal.grandPiano" }] }
      : cat,
  );
}

// Amenities modal data: Ogra House
const OGRA_AMENITIES_MODAL: Array<{ categoryKey: string; items: Array<{ key: string; descKey?: string }> }> = [
  { categoryKey: "amenities.modal.cat.parking", items: [{ key: "amenities.modal.parkingDesc", descKey: "amenities.modal.parkingDesc" }] },
  { categoryKey: "amenities.modal.cat.internet", items: [{ key: "amenities.modal.internetDesc", descKey: "amenities.modal.internetDesc" }] },
  { categoryKey: "amenities.modal.cat.kitchen", items: [
    { key: "amenities.modal.highChair" }, { key: "amenities.modal.diningTable" }, { key: "amenities.modal.coffeeMachine" },
    { key: "amenities.modal.toaster" }, { key: "amenities.modal.stovetop" }, { key: "amenities.modal.oven" },
    { key: "amenities.modal.cookware" }, { key: "amenities.modal.electricKettle" }, { key: "amenities.modal.kitchen" },
    { key: "amenities.modal.washingMachine" }, { key: "amenities.modal.dishwasher" }, { key: "amenities.modal.microwave" },
    { key: "amenities.modal.refrigerator" },
  ]},
  { categoryKey: "amenities.modal.cat.bedroom", items: [{ key: "amenities.modal.linens" }, { key: "amenities.modal.wardrobe" }] },
  { categoryKey: "amenities.modal.cat.bathroom", items: [
    { key: "amenities.modal.toiletPaper" }, { key: "amenities.modal.towels" }, { key: "amenities.modal.extraBathroom" },
    { key: "amenities.modal.privateBathroom" }, { key: "amenities.modal.toilet" }, { key: "amenities.modal.freeToiletries" },
    { key: "amenities.modal.hairDryer" }, { key: "amenities.modal.shower" },
  ]},
  { categoryKey: "amenities.modal.cat.living", items: [{ key: "amenities.modal.diningArea" }, { key: "amenities.modal.sofa" }, { key: "amenities.modal.sittingArea" }, { key: "amenities.modal.workDesk" }] },
  { categoryKey: "amenities.modal.cat.media", items: [{ key: "amenities.modal.flatScreenTV" }, { key: "amenities.modal.dvdPlayer" }, { key: "amenities.modal.radio" }, { key: "amenities.modal.tv" }, { key: "amenities.modal.grandPiano" }] },
  { categoryKey: "amenities.modal.cat.roomFeatures", items: [
    { key: "amenities.modal.outletNearBed" }, { key: "amenities.modal.dryingRack" }, { key: "amenities.modal.windowScreens" },
    { key: "amenities.modal.privateEntrance" }, { key: "amenities.modal.heating" }, { key: "amenities.modal.iron" },
  ]},
  { categoryKey: "amenities.modal.cat.accessibility", items: [{ key: "amenities.modal.groundFloor" }] },
  { categoryKey: "amenities.modal.cat.outdoor", items: [
    { key: "amenities.modal.beachfront" }, { key: "amenities.modal.outdoorDining" }, { key: "amenities.modal.outdoorFurniture" },
    { key: "amenities.modal.veranda" }, { key: "amenities.modal.barbecue" }, { key: "amenities.modal.bbqFacilities" },
    { key: "amenities.modal.garden" },
  ]},
  { categoryKey: "amenities.modal.cat.activities", items: [{ key: "amenities.modal.beach" }] },
  { categoryKey: "amenities.modal.cat.views", items: [{ key: "amenities.modal.seaView" }, { key: "amenities.modal.view" }] },
  { categoryKey: "amenities.modal.cat.building", items: [{ key: "amenities.modal.standalone" }] },
  { categoryKey: "amenities.modal.cat.reception", items: [{ key: "amenities.modal.invoice" }] },
  { categoryKey: "amenities.modal.cat.misc", items: [{ key: "amenities.modal.ac" }, { key: "amenities.modal.smokingBan" }] },
  { categoryKey: "amenities.modal.cat.safety", items: [{ key: "amenities.modal.safe" }] },
  { categoryKey: "amenities.modal.cat.languages", items: [{ key: "amenities.modal.langDe" }, { key: "amenities.modal.langEl" }, { key: "amenities.modal.langEn" }, { key: "amenities.modal.langFr" }] },
];

/** Extra essentials for Small & Big Bungalow (kitchen, appliances, outdoor). Toiletries included here. */
const BUNGALOW_EXTRA_ESSENTIALS = [
  { icon: Utensils, labelKey: "amenities.bungalowKitchen", descKey: "amenities.bungalowKitchenDesc" },
  { icon: Zap, labelKey: "amenities.bungalowElectricHob", descKey: "amenities.bungalowElectricHobDesc" },
  { icon: Microwave, labelKey: "amenities.bungalowMicrowave", descKey: "amenities.bungalowMicrowaveDesc" },
  { icon: Refrigerator, labelKey: "amenities.bungalowRefrigerator", descKey: "amenities.bungalowRefrigeratorDesc" },
  { icon: WashingMachine, labelKey: "amenities.bungalowWashingMachine", descKey: "amenities.bungalowWashingMachineDesc" },
  { icon: Coffee, labelKey: "amenities.bungalowKettle", descKey: "amenities.bungalowKettleDesc" },
  { icon: Fan, labelKey: "amenities.bungalowFan", descKey: "amenities.bungalowFanDesc" },
  { icon: UtensilsCrossed, labelKey: "amenities.bungalowCookware", descKey: "amenities.bungalowCookwareDesc" },
  { icon: Bed, labelKey: "amenities.bungalowLinens", descKey: "amenities.bungalowLinensDesc" },
  { icon: Flame, labelKey: "amenities.bungalowElectricBBQ", descKey: "amenities.bungalowElectricBBQDesc" },
  { icon: Sun, labelKey: "amenities.bungalowSunLoungers", descKey: "amenities.bungalowSunLoungersDesc" },
  { icon: Table, labelKey: "amenities.bungalowOutdoorTable", descKey: "amenities.bungalowOutdoorTableDesc" },
  { icon: Sparkles, labelKey: "amenities.toiletries", descKey: "amenities.toiletriesDesc" },
];

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const [selectedDates, setSelectedDates] = useState<{
    checkIn: Date;
    checkOut: Date;
  } | null>(null);
  const initialGuests = parseInt(searchParams.get("guests") || "2", 10) || 2;
  const [selectedGuests, setSelectedGuests] = useState(initialGuests);
  const [quotePricing, setQuotePricing] = useState<{ basePrice: number; subtotal: number; cleaningFee: number; totalPrice: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [data, setData] = useState<ApiPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbScrollRef = useRef<HTMLDivElement>(null);
  const [videoHovered, setVideoHovered] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
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
            closedForCurrentPeriod: !!u.closedForCurrentPeriod,
            reopenDate: u.reopenDate ?? null,
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

  // Per-unit max guests: Small/Big Bungalow & Lykoskufi 1 = 3, Lykoskufi 2 = 5, others from API
  const effectiveMaxGuests = currentUnit
    ? (getMaxGuestsForUnit(currentUnit.name) ?? currentUnit.maxGuests ?? 10)
    : 10;
  const [showOverGuestMessage, setShowOverGuestMessage] = useState(false);

  // Clamp selectedGuests when switching units or when over limit
  useEffect(() => {
    if (selectedGuests > effectiveMaxGuests) {
      setSelectedGuests(effectiveMaxGuests);
      setShowOverGuestMessage(true);
    }
  }, [effectiveMaxGuests, selectedGuests]);
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

  // Fetch quote when unit + guests change (and optionally dates)
  useEffect(() => {
    if (!currentUnit?.id) {
      setQuotePricing(null);
      return;
    }
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let checkIn: Date;
    let checkOut: Date;
    if (selectedDates) {
      checkIn = selectedDates.checkIn;
      checkOut = selectedDates.checkOut;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + 7);
      checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 7);
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuotePricing(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    fetch(apiUrl("/api/bookings/quote"), {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId: currentUnit.id,
        checkInDate: formatDate(checkIn),
        checkOutDate: formatDate(checkOut),
        guests: selectedGuests,
      }),
    })
      .then((r) => {
        if (cancelled) return null;
        if (!r.ok) return null;
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (!json) {
          const fb = getTieredPricePerNight(currentUnit!.name, checkIn, selectedGuests);
          if (fb != null) {
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            const cleaningFee = currentUnit!.cleaningFee ?? 0;
            setQuotePricing({
              basePrice: fb,
              subtotal: fb * nights,
              cleaningFee,
              totalPrice: fb * nights + cleaningFee,
            });
          } else {
            setQuotePricing(null);
          }
          return;
        }
        const payload = json.data ?? json;
        if (payload?.pricing) {
          const p = payload.pricing;
          setQuotePricing({
            basePrice: p.basePrice ?? 0,
            subtotal: p.subtotal ?? 0,
            cleaningFee: p.cleaningFee ?? 0,
            totalPrice: p.totalPrice ?? p.finalTotal ?? 0,
          });
        } else {
          const fb = getTieredPricePerNight(currentUnit!.name, checkIn, selectedGuests);
          if (fb != null) {
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            const cleaningFee = currentUnit!.cleaningFee ?? 0;
            setQuotePricing({
              basePrice: fb,
              subtotal: fb * nights,
              cleaningFee,
              totalPrice: fb * nights + cleaningFee,
            });
          } else {
            setQuotePricing(null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fb = getTieredPricePerNight(currentUnit!.name, checkIn, selectedGuests);
          if (fb != null) {
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            const cleaningFee = currentUnit!.cleaningFee ?? 0;
            setQuotePricing({
              basePrice: fb,
              subtotal: fb * nights,
              cleaningFee,
              totalPrice: fb * nights + cleaningFee,
            });
          } else {
            setQuotePricing(null);
          }
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [currentUnit?.id, currentUnit?.name, currentUnit?.cleaningFee, selectedDates, selectedGuests]);

  // Scroll selected thumbnail into view when changing image
  useEffect(() => {
    const el = thumbScrollRef.current;
    if (!el || images.length <= 1) return;
    const thumb = el.querySelector(`[data-thumb-index="${selectedImage}"]`);
    thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedImage, images.length]);

  const isUnitClosed = !!currentUnit?.closedForCurrentPeriod;
  const bungalowClosedListPrice =
    !!currentUnit &&
    !!data &&
    getClosedBungalowSeasonMessageKey(currentUnit.name, data.name, isUnitClosed) != null;
  const nightlyRegular = quotePricing?.basePrice ?? currentUnit?.basePrice ?? 0;
  const nightlyDisplayPrice =
    currentUnit && data
      ? getClosedBungalowNightlyDisplayPrice(
          currentUnit.name,
          data.name,
          isUnitClosed,
          nightlyRegular,
        )
      : nightlyRegular;
  const seasonalBungalowOffSeasonNotice =
    !!isUnitClosed &&
    !!data &&
    !!currentUnit &&
    isSeasonalBungalowUnit(currentUnit.name, data.name);
  const hardClosedNoBooking =
    !!isUnitClosed && !!currentUnit && !!data && !seasonalBungalowOffSeasonNotice;
  /** Server-backed quote: valid range, availability, and pricing (bungalows have no client price fallback). */
  const canBook =
    !!(data && currentUnit && selectedDates) && !quoteLoading && quotePricing != null;
  const formatDateForApi = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const handleBooking = () => {
    if (!canBook) return;
    const params = new URLSearchParams({
      unit: currentUnit!.id,
      property: data!.id,
      checkIn: formatDateForApi(selectedDates!.checkIn),
      checkOut: formatDateForApi(selectedDates!.checkOut),
    });
    params.set("guests", String(selectedGuests));
    window.location.href = `/checkout?${params.toString()}`;
  };
  return (
    <Layout>
      {/* Image Gallery */}
      <div className="bg-black relative">
        <div className="container-max">
          {loading ? (
            <div className="grid md:grid-cols-4 gap-2 py-6 animate-pulse">
              <div className="md:col-span-2 h-96 md:h-[500px] rounded-lg bg-muted" />
              <div className="md:col-span-2 grid grid-cols-3 gap-2 h-96 md:h-[500px]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-lg bg-muted" />
                ))}
              </div>
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
                    onError={(e) => { e.currentTarget.src = placeholderImage(); }}
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
                        onError={(e) => { e.currentTarget.src = placeholderImage(); }}
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
              {(() => {
                const bedTagKey = getUnitBedTagKey(data.name, currentUnit.name);
                const { bedroomsLine, inventoryLine } = getUnitBedDisplay(
                  t,
                  bedTagKey,
                  currentUnit.bedrooms,
                );
                return (
                  <>
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <BedDouble size={20} className="text-primary shrink-0" />
                      <span>{bedroomsLine}</span>
                    </div>
                    {inventoryLine ? (
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Bed size={20} className="text-primary shrink-0" />
                        <span>{inventoryLine}</span>
                      </div>
                    ) : null}
                  </>
                );
              })()}
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Bath size={20} className="text-primary shrink-0" />
                <span>{t("property.quickInfo.bathrooms").replace("{n}", String(currentUnit.bathrooms))}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Users size={20} className="text-primary shrink-0" />
                <span>{t("property.quickInfo.guests").replace("{n}", String(effectiveMaxGuests))}</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-muted-foreground">
                {!isSmallBungalowUnit(currentUnit.name, data.name) &&
                  !isBigBungalowUnit(currentUnit.name, data.name) && (
                  <Wifi size={20} className="shrink-0" aria-hidden />
                )}
                <Wind size={20} className="shrink-0" aria-hidden />
                {!isSmallBungalowUnit(currentUnit.name, data.name) &&
                  !isBigBungalowUnit(currentUnit.name, data.name) && (
                  <Utensils size={20} className="shrink-0" aria-hidden />
                )}
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
                  <h1 className={`text-3xl md:text-4xl font-bold text-foreground ${/small\s*bungalow/i.test(currentUnit.name) ? "mb-0" : "mb-6"}`}>
                    {(() => {
                      const tk = getUnitDisplayTitleKey(currentUnit.name);
                      return tk ? t(tk) : currentUnit.name;
                    })()}
                  </h1>
                  {/small\s*bungalow/i.test(currentUnit.name) && (
                    <p className="text-muted-foreground text-sm mt-1 mb-6">Studio</p>
                  )}
                  {/* Description — from system translations (not admin panel) */}
                  <div className="space-y-5">
                    {(() => {
                      const descKey = getUnitDescriptionKey(data.name, currentUnit.name);
                      const descText = descKey ? t(descKey) : null;
                      if (descText && descKey && !descText.startsWith("property.")) {
                        return (
                          <div className="text-muted-foreground leading-relaxed space-y-4">
                            {descText.split(/\n\n+/).map((para, i) => (
                              <p key={i}>{para.trim()}</p>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <>
                          <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium">
                            {data.description}
                          </p>
                          {currentUnit.description && (
                            <p className="text-muted-foreground leading-relaxed">
                              {currentUnit.description}
                            </p>
                          )}
                        </>
                      );
                    })()}
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
                              src={getViewVideoPath(data.name, currentUnit.name) || ""}
                              controls
                              playsInline
                              preload="metadata"
                              muted={false}
                              loop
                              onPlay={() => setVideoStarted(true)}
                              onLoadedData={() => console.log("🎬 [VIDEO] Video loaded successfully")}
                              onError={(e) => console.error("❌ [VIDEO] Video error:", e)}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                              style={{ width: '100%', height: '100%', maxHeight: '100%' }}
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

                {/* Amenities — grouped, aligned with Booking.com per unit (Lykoskufi 1,2,5 vs Ogra House) */}
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    {t("property.amenities")}
                  </h2>
                  {(() => {
                    const isOgraHouse = currentUnit?.name && /ogra\s*house/i.test(currentUnit.name);
                    const isSmallBungalowUnitFlag =
                      !!currentUnit?.name &&
                      !!data?.name &&
                      isSmallBungalowUnit(currentUnit.name, data.name);
                    const isBigBungalowUnitFlag =
                      !!currentUnit?.name &&
                      !!data?.name &&
                      isBigBungalowUnit(currentUnit.name, data.name);
                    const essentialsOgra = [
                      { icon: Wifi, labelKey: "amenities.fastWifi", descKey: "amenities.fastWifiDesc" },
                      { icon: Wind, labelKey: "amenities.ac", descKey: "amenities.acDesc" },
                      { icon: Utensils, labelKey: "amenities.fullKitchen", descKey: "amenities.fullKitchenDesc" },
                      { icon: Tv, labelKey: "amenities.tv", descKey: "amenities.tvDesc" },
                      { icon: Bath, labelKey: "amenities.privateBathroom", descKey: "amenities.privateBathroomDesc" },
                      { icon: Car, labelKey: "amenities.freeParking", descKey: "amenities.freeParkingDesc" },
                      { icon: Ban, labelKey: "amenities.nonSmoking", descKey: "amenities.nonSmokingDesc" },
                      { icon: ThermometerSun, labelKey: "amenities.heating", descKey: "amenities.heatingDesc" },
                      { icon: Shield, labelKey: "amenities.safe", descKey: "amenities.safeDesc" },
                      { icon: Heater, labelKey: "amenities.hairDryer", descKey: "amenities.hairDryerDesc" },
                      { icon: Sparkles, labelKey: "amenities.toiletries", descKey: "amenities.toiletriesDesc" },
                      { icon: Music, labelKey: "amenities.grandPiano", descKey: "amenities.grandPianoDesc" },
                    ];
                    const essentialsLykoskufiBase = [
                      { icon: Wifi, labelKey: "amenities.fastWifi", descKey: "amenities.fastWifiDesc" },
                      { icon: Wind, labelKey: "amenities.ac", descKey: "amenities.acDesc" },
                      { icon: Utensils, labelKey: "amenities.fullKitchen", descKey: "amenities.fullKitchenDesc" },
                      { icon: Tv, labelKey: "amenities.tv", descKey: "amenities.tvDesc" },
                      { icon: Bath, labelKey: "amenities.privateBathroom", descKey: "amenities.privateBathroomDesc" },
                      { icon: Car, labelKey: "amenities.freeParking", descKey: "amenities.freeParkingDesc" },
                      { icon: Ban, labelKey: "amenities.nonSmoking", descKey: "amenities.nonSmokingDesc" },
                      { icon: PawPrint, labelKey: "amenities.petsAllowed", descKey: "amenities.petsAllowedDesc" },
                      { icon: Heater, labelKey: "amenities.hairDryer", descKey: "amenities.hairDryerDesc" },
                      { icon: Sparkles, labelKey: "amenities.toiletries", descKey: "amenities.toiletriesDesc" },
                    ];
                    const essentialsLykoskufi = isLykoskufi5Unit(currentUnit?.name)
                      ? [
                          ...essentialsLykoskufiBase,
                          { icon: Music, labelKey: "amenities.grandPiano", descKey: "amenities.grandPianoDesc" },
                        ]
                      : essentialsLykoskufiBase;
                    const essentialsBigBungalow = [
                      { icon: Wind, labelKey: "amenities.acBigBungalow", descKey: "amenities.acBigBungalowDesc" },
                      { icon: Bath, labelKey: "amenities.privateBathroom", descKey: "amenities.privateBathroomDesc" },
                      { icon: Car, labelKey: "amenities.freeParking", descKey: "amenities.freeParkingDesc" },
                      { icon: Ban, labelKey: "amenities.nonSmoking", descKey: "amenities.nonSmokingDesc" },
                      { icon: PawPrint, labelKey: "amenities.petsAllowed", descKey: "amenities.petsAllowedDesc" },
                      ...BUNGALOW_EXTRA_ESSENTIALS,
                    ];
                    const essentialsSmallBungalow = [
                      { icon: Bath, labelKey: "amenities.privateBathroom", descKey: "amenities.privateBathroomDesc" },
                      { icon: Car, labelKey: "amenities.freeParking", descKey: "amenities.freeParkingDesc" },
                      { icon: Ban, labelKey: "amenities.nonSmoking", descKey: "amenities.nonSmokingDesc" },
                      { icon: PawPrint, labelKey: "amenities.petsAllowed", descKey: "amenities.petsAllowedDesc" },
                      ...BUNGALOW_EXTRA_ESSENTIALS,
                    ];
                    const outdoorOgra = [
                      { icon: Waves, labelKey: "amenities.beachfront", descKey: "amenities.beachfrontDesc" },
                      { icon: Mountain, labelKey: "amenities.seaView", descKey: "amenities.seaViewDesc" },
                      { icon: Flame, labelKey: "amenities.bbqFacilities", descKey: "amenities.bbqFacilitiesDesc" },
                      { icon: LayoutGrid, labelKey: "amenities.terrace", descKey: "amenities.terraceDesc" },
                    ];
                    const outdoorLykoskufi = [
                      { icon: MapPin, labelKey: "amenities.beachAccess", descKey: "amenities.beachAccessDesc" },
                      { icon: Mountain, labelKey: "amenities.seaView", descKey: "amenities.seaViewDesc" },
                    ];
                    const essentials = isOgraHouse
                      ? essentialsOgra
                      : isBigBungalowUnitFlag
                        ? essentialsBigBungalow
                        : isSmallBungalowUnitFlag
                          ? essentialsSmallBungalow
                          : essentialsLykoskufi;
                    const outdoor = isOgraHouse ? outdoorOgra : outdoorLykoskufi;
                    return (
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                            {t("property.amenities.essentials")}
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            {essentials.map((amenity, idx) => {
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
                            {outdoor.map((amenity, idx) => {
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
                        {hasAmenitiesModal(currentUnit?.name) && (
                          <>
                            <button
                              type="button"
                              onClick={() => setAmenitiesModalOpen(true)}
                              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl border-2 border-primary/40 bg-gradient-to-r from-primary/8 to-primary/5 text-primary font-semibold hover:from-primary hover:to-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
                            >
                              <ListPlus size={20} strokeWidth={2} className="opacity-90" />
                              {t("amenities.viewAllBtn")}
                            </button>
                            <Dialog open={amenitiesModalOpen} onOpenChange={setAmenitiesModalOpen}>
                              <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-2 border-primary/20 shadow-2xl shadow-primary/10">
                                <DialogHeader className="relative px-8 pt-8 pb-6 pr-14 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border-b border-primary/10">
                                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 to-transparent pointer-events-none" />
                                  <div className="relative">
                                    <div className="flex items-center gap-3 mb-1">
                                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                                        <LayoutGrid size={22} className="text-primary" strokeWidth={2} />
                                      </div>
                                      <DialogTitle className="text-2xl font-bold text-foreground tracking-tight font-luxury">
                                        {t("amenities.modal.title")}
                                      </DialogTitle>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
                                      {currentUnit?.name} · {t("property.amenities")}
                                    </p>
                                    <div className="h-px w-16 bg-gradient-to-r from-primary/50 to-transparent mt-4 ml-[52px]" />
                                  </div>
                                </DialogHeader>
                                <ScrollArea className="flex-1" style={{ maxHeight: "calc(90vh - 140px)" }}>
                                  <div className="p-6 sm:p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {(isOgraHouse ? OGRA_AMENITIES_MODAL : buildLykoskufiAmenitiesModal(currentUnit?.name)).map((cat, catIdx) => {
                                        const CatIcon = (
                                          { parking: Car, internet: Wifi, kitchen: Utensils, bedroom: Bed, bathroom: Bath,
                                            living: Sofa, media: Tv, roomFeatures: LayoutGrid, pets: PawPrint,
                                            outdoor: Mountain, activities: Waves, views: Mountain, building: Home,
                                            reception: Users, misc: Wind, safety: Shield, languages: Globe,
                                            accessibility: LayoutGrid
                                          } as Record<string, React.ComponentType<{ size?: number; className?: string }>>
                                        )[cat.categoryKey.replace("amenities.modal.cat.", "")] ?? LayoutGrid;
                                        return (
                                          <div
                                            key={catIdx}
                                            className="group rounded-xl border border-border/60 bg-card/50 p-5 hover:border-primary/20 hover:bg-primary/[0.03] hover:shadow-md transition-all duration-300"
                                          >
                                            <div className="flex items-center gap-3 mb-4">
                                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <CatIcon size={18} className="text-primary" strokeWidth={2} />
                                              </div>
                                              <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest" style={{ letterSpacing: "0.12em" }}>
                                                {t(cat.categoryKey)}
                                              </h4>
                                            </div>
                                            <ul className="space-y-2.5">
                                              {cat.items.map((item, itemIdx) => (
                                                <li key={itemIdx} className="flex items-start gap-3">
                                                  <CheckCircle2 size={16} className="text-primary/80 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                                  <span className="text-foreground/95 text-[15px] leading-relaxed">
                                                    {t(item.key)}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Highlights — aligned with Booking.com */}
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("property.whyLove")}
                  </h2>
                  <ul className="space-y-3">
                    {(() => {
                      const bungalow =
                        isSmallBungalowUnit(currentUnit.name, data.name) ||
                        isBigBungalowUnit(currentUnit.name, data.name);
                      const grandPianoEligible =
                        !bungalow &&
                        !!currentUnit?.name &&
                        (/ogra\s*house/i.test(currentUnit.name) || isLykoskufi5Unit(currentUnit.name));
                      const keys = [
                        "property.highlights.seaViews",
                        "property.highlights.modernKitchen",
                        "property.highlights.spaciousLiving",
                        "property.highlights.privateTerrace",
                        ...(grandPianoEligible ? ["property.highlights.grandPiano"] as const : []),
                        "property.highlights.parking",
                      ];
                      const list = bungalow
                        ? keys.filter(
                            (k) =>
                              k !== "property.highlights.modernKitchen" &&
                              k !== "property.highlights.spaciousLiving",
                          )
                        : keys;
                      return list.map((highlightKey, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span className="text-foreground">{t(highlightKey)}</span>
                        </li>
                      ));
                    })()}
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
                      src="https://www.openstreetmap.org/export/embed.html?bbox=22.865%2C37.207%2C22.906%2C37.247&layer=mapnik&marker=37.22692%2C22.88575"
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={t("property.locationTitle")}
                    />
                  </div>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=37.22692,22.88575"
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

                {/* Property License Details */}
                {(() => {
                  const license = data && currentUnit ? getPropertyLicenseInfo(data.name, currentUnit.name) : null;
                  if (!license) return null;
                  return (
                    <section className="mb-8" aria-labelledby="license-heading">
                      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
                        <h3 id="license-heading" className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                          {t("property.licenseTitle")}
                        </h3>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="font-medium text-foreground">{t(license.labelKey)}</span>
                            <span>{license.licenseNumber}</span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="font-medium text-foreground">ΚΑΕΚ</span>
                            <span>{license.kaek}</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })()}

                {/* Inquiry Form */}
                <InquiryForm propertyId={data?.id || ""} />
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
                      <span className="text-muted-foreground text-lg">
                        {t("property.priceFrom")}{" "}
                      </span>
                      <span className="text-3xl font-bold text-primary">
                        {quoteLoading && !bungalowClosedListPrice
                          ? "..."
                          : formatCurrency(nightlyDisplayPrice, language)}
                      </span>
                      <span className="text-muted-foreground">{t("common.perNight")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("checkout.taxes")}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">{t("common.guests")}</label>
                    <select
                      value={selectedGuests}
                      onChange={(e) => {
                        setSelectedGuests(Number(e.target.value));
                        setShowOverGuestMessage(false);
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      {Array.from({ length: Math.min(effectiveMaxGuests, 20) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    {showOverGuestMessage && (
                      <p className="mt-2 text-sm text-amber-600 dark:text-amber-500">
                        {t("property.guestsOverLimit").replace("{n}", String(effectiveMaxGuests))}
                      </p>
                    )}
                  </div>

                  <AvailabilityCalendar
                    unitId={currentUnit.id}
                    propertyName={data.name}
                    unitName={currentUnit.name}
                    onSelectDates={(checkIn, checkOut) =>
                      setSelectedDates({ checkIn, checkOut })
                    }
                    onInvalidSelection={() => setSelectedDates(null)}
                  />

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm mb-6">
                    {selectedDates && (
                      <>
                        <div className="flex justify-between text-foreground">
                          <span>
                            {Math.ceil(
                              (selectedDates.checkOut.getTime() - selectedDates.checkIn.getTime()) / (1000 * 60 * 60 * 24),
                            )}{" "}
                            {t("common.nights")} ×{" "}
                            {quoteLoading && !bungalowClosedListPrice
                              ? "..."
                              : formatCurrency(nightlyDisplayPrice, language)}
                          </span>
                          <span>
                            {quoteLoading && !bungalowClosedListPrice
                              ? "..."
                              : formatCurrency(
                                  (() => {
                                    const nights = Math.ceil(
                                      (selectedDates.checkOut.getTime() - selectedDates.checkIn.getTime()) /
                                        (1000 * 60 * 60 * 24),
                                    );
                                    if (!bungalowClosedListPrice && quotePricing?.subtotal != null) {
                                      return quotePricing.subtotal;
                                    }
                                    return nights * nightlyDisplayPrice;
                                  })(),
                                  language,
                                )}
                          </span>
                        </div>
                        <div className="flex justify-between text-foreground">
                          <span>{t("checkout.cleaningFee")}</span>
                          <span>
                            {quoteLoading && !bungalowClosedListPrice
                              ? "..."
                              : formatCurrency(
                                  quotePricing?.cleaningFee ?? currentUnit.cleaningFee,
                                  language,
                                )}
                          </span>
                        </div>
                        <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                          <span>{t("property.totalPrice")}</span>
                          <span>
                            {quoteLoading && !bungalowClosedListPrice
                              ? "..."
                              : formatCurrency(
                                  (() => {
                                    const nights = Math.ceil(
                                      (selectedDates.checkOut.getTime() - selectedDates.checkIn.getTime()) /
                                        (1000 * 60 * 60 * 24),
                                    );
                                    if (!bungalowClosedListPrice && quotePricing?.totalPrice != null) {
                                      return quotePricing.totalPrice;
                                    }
                                    return nights * nightlyDisplayPrice + currentUnit.cleaningFee;
                                  })(),
                                  language,
                                )}
                          </span>
                        </div>
                      </>
                    )}
                    {!selectedDates && (
                      <p className="text-muted-foreground text-sm">{t("property.booking.selectDates")}</p>
                    )}
                  </div>

                  {/* Seasonal bungalow: info only during off-season; booking still allowed for June–Sept dates. */}
                  {seasonalBungalowOffSeasonNotice && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-3">
                      <p className="font-semibold text-amber-800">{t("property.roomClosed")}</p>
                      {(() => {
                        const seasonKey = getClosedBungalowSeasonMessageKey(
                          currentUnit!.name,
                          data!.name,
                          true,
                        );
                        return seasonKey ? (
                          <p className="text-sm text-amber-700 mt-1">{t(seasonKey)}</p>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {hardClosedNoBooking ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-3">
                      <p className="font-semibold text-amber-800">{t("property.roomClosed")}</p>
                      {currentUnit?.reopenDate ? (
                        <p className="text-sm text-amber-700 mt-1">
                          {t("property.roomReopensOn").replace(
                            "{date}",
                            new Date(currentUnit.reopenDate).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }),
                          )}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled
                        className="btn-primary w-full justify-center mt-3 opacity-50 cursor-not-allowed"
                      >
                        {t("nav.bookNow")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBooking}
                      disabled={!canBook}
                      className="btn-primary w-full justify-center mb-3"
                    >
                      {t("nav.bookNow")}
                    </button>
                  )}
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

import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Users,
  Settings,
  BookOpen,
  Tag,
  Link2,
  Copy,
  Check,
  HelpCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { useNavigate } from "react-router-dom";
import PropertyManagement from "@/components/admin/PropertyManagement";
import BookingManagement from "@/components/admin/BookingManagement";
import UserManagement from "@/components/admin/UserManagement";
import { AdminPaginationBar } from "@/components/admin/AdminPaginationBar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Per-section color identity: left accent, header tint, icon, and jump nav tile */
const SECTION_ACCENTS: Record<
  string,
  { borderL: string; headerTint: string; iconTint: string; navButton: string }
> = {
  "admin-section-dashboard": {
    borderL: "border-l-sky-500",
    headerTint: "bg-sky-50 dark:bg-sky-950/40",
    iconTint: "text-sky-600 dark:text-sky-400",
    navButton:
      "bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white border-2 border-sky-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
  "admin-section-bookings": {
    borderL: "border-l-emerald-500",
    headerTint: "bg-emerald-50 dark:bg-emerald-950/40",
    iconTint: "text-emerald-600 dark:text-emerald-400",
    navButton:
      "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white border-2 border-emerald-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
  "admin-section-properties": {
    borderL: "border-l-orange-500",
    headerTint: "bg-orange-50 dark:bg-orange-950/40",
    iconTint: "text-orange-600 dark:text-orange-400",
    navButton:
      "bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white border-2 border-orange-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
  "admin-section-users": {
    borderL: "border-l-rose-500",
    headerTint: "bg-rose-50 dark:bg-rose-950/40",
    iconTint: "text-rose-600 dark:text-rose-400",
    navButton:
      "bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white border-2 border-rose-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
  "admin-section-inquiries": {
    borderL: "border-l-cyan-500",
    headerTint: "bg-cyan-50 dark:bg-cyan-950/40",
    iconTint: "text-cyan-600 dark:text-cyan-400",
    navButton:
      "bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white border-2 border-cyan-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
};

// ── Inquiries Management ───────────────────────────────────────────

function InquiriesManagement({
  onReplySent,
  onInquiryViewed,
  unreadCount = 0,
}: {
  onReplySent?: () => void;
  onInquiryViewed?: () => void;
  unreadCount?: number;
}) {
  const { t, language } = useLanguage();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 7;

  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [offerUnitId, setOfferUnitId] = useState("");
  const [offerCheckIn, setOfferCheckIn] = useState("");
  const [offerCheckOut, setOfferCheckOut] = useState("");
  const [offerGuests, setOfferGuests] = useState(2);
  const [offerTotal, setOfferTotal] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const admin = localStorage.getItem("admin");
      const token = admin ? JSON.parse(admin).accessToken : "";
      const res = await fetch(apiUrl(`/api/inquiries/admin/list?status=${statusFilter}&page=${currentPage}&pageSize=${pageSize}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.data?.inquiries || []);
        const total = data.data?.total ?? 0;
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInquiries(); }, [statusFilter, currentPage]);

  const viewInquiry = async (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setGeneratedUrl("");
    setOfferError(null);
    try {
      const admin = localStorage.getItem("admin");
      const token = admin ? JSON.parse(admin).accessToken : "";
      const res = await fetch(apiUrl(`/api/inquiries/admin/${inquiry.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data?.messages || []);
        onInquiryViewed?.();
      }
      const propRes = await fetch(apiUrl(`/api/properties/id/${inquiry.property_id}`));
      if (propRes.ok) {
        const propData = await propRes.json();
        const u = (propData.data?.units || []).map((x: any) => ({ id: x.id, name: x.name || x.unit?.name || "Unit" }));
        setUnits(u);
        if (u.length) setOfferUnitId(u[0].id);
      }
      const ci = String(inquiry.checkin_date || "").slice(0, 10);
      const co = String(inquiry.checkout_date || "").slice(0, 10);
      if (ci && co) {
        setOfferCheckIn(ci);
        setOfferCheckOut(co);
      }
      setOfferGuests(inquiry.guests || 2);
    } catch {}
  };

  const handleGenerateLink = async () => {
    if (!selectedInquiry || !offerUnitId || !offerCheckIn || !offerCheckOut || !offerTotal || Number(offerTotal) < 1) {
      setOfferError("Please fill all fields (unit, dates, total €)");
      return;
    }
    setLoadingOffer(true);
    setOfferError(null);
    try {
      const admin = localStorage.getItem("admin");
      const token = admin ? JSON.parse(admin).accessToken : "";
      const res = await fetch(apiUrl(`/api/inquiries/admin/${selectedInquiry.id}/custom-offer`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          unitId: offerUnitId,
          checkInDate: offerCheckIn,
          checkOutDate: offerCheckOut,
          guests: offerGuests,
          customTotalEur: Number(offerTotal),
        }),
      });
      const json = await res.json();
      if (res.ok && json.data?.checkoutUrl) {
        setGeneratedUrl(json.data.checkoutUrl);
      } else {
        setOfferError(json.error || "Failed to generate link");
      }
    } catch {
      setOfferError("Failed to generate link");
    } finally {
      setLoadingOffer(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedInquiry) return;
    setSending(true);
    try {
      const admin = localStorage.getItem("admin");
      const token = admin ? JSON.parse(admin).accessToken : "";
      const res = await fetch(apiUrl(`/api/inquiries/admin/${selectedInquiry.id}/reply`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText("");
        viewInquiry(selectedInquiry);
        fetchInquiries();
        onReplySent?.();
      }
    } catch {}
    finally { setSending(false); }
  };

  const formatDateOnly = (str: string | null | undefined) => {
    if (!str) return "—";
    const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)).toLocaleDateString();
    return new Date(str).toLocaleDateString();
  };
  const toDateInputValue = (str: string | null | undefined) => {
    if (!str) return "";
    const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : str.slice(0, 10);
  };

  if (selectedInquiry) {
    return (
      <div>
        <button onClick={() => { setSelectedInquiry(null); setMessages([]); }}
          className="text-primary hover:underline mb-4 inline-block">&larr; {t("admin.backToList")}</button>
        <div className="bg-card border border-border rounded-lg p-4 mb-3">
          <h3 className="font-bold text-foreground text-base mb-1.5">{t("admin.inquiryFrom")} {selectedInquiry.guest_name}</h3>
          <p className="text-sm text-muted-foreground">{selectedInquiry.guest_email}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateOnly(selectedInquiry.checkin_date)} - {formatDateOnly(selectedInquiry.checkout_date)} | {selectedInquiry.guests} {t("common.guests").toLowerCase()}
          </p>
          <p className="text-sm mt-1">{t("admin.propertyLabel")} <strong>{selectedInquiry.property?.name || "—"}</strong></p>
          <p className="text-sm">{t("admin.statusLabel")} <span className="font-semibold capitalize">{selectedInquiry.status?.toLowerCase().replace("_", " ")}</span></p>
        </div>

        <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.sender_type === "host" ? "bg-primary/10 ml-6" : "bg-muted mr-6"}`}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span className="font-semibold">{msg.sender_type === "host" ? t("admin.youHost") : t("admin.guestSender")}</span>
                <span>{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("admin.typeYourReply")}
            className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground" />
          <button onClick={handleReply} disabled={sending || !replyText.trim()} className="btn-primary px-6">
            {sending ? t("admin.sending") : t("admin.reply")}
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="font-bold text-foreground text-base mb-3 flex items-center gap-2">
            <Link2 size={20} />
            {language === "el" ? "Δημιουργία σύνδεσμου κράτησης" : "Create booking link"}
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            {language === "el"
              ? "Επιλέξτε ημερομηνίες και τιμή· ο σύνδεσμος οδηγεί τον επισκέπτη στο checkout. Η κράτηση δημιουργείται ΜΟΝΟ όταν πληρώσει."
              : "Select dates and price; the link takes the guest to checkout. Booking is created ONLY when they pay."}
          </p>
          {units.length === 0 && (
            <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg text-muted-foreground text-sm">
              {t("admin.noUnitsForProperty")}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t("admin.room")}</label>
              <select value={offerUnitId} onChange={(e) => setOfferUnitId(e.target.value)}
                disabled={units.length === 0}
                className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background disabled:opacity-50">
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{language === "el" ? "Έναρξη" : "Check-in"}</label>
              <input type="date" value={offerCheckIn} onChange={(e) => setOfferCheckIn(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{language === "el" ? "Λήξη" : "Check-out"}</label>
              <input type="date" value={offerCheckOut} onChange={(e) => setOfferCheckOut(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{language === "el" ? "Άτομα" : "Guests"}</label>
              <input type="number" min={1} max={20} value={offerGuests} onChange={(e) => setOfferGuests(Number(e.target.value) || 2)}
                className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{language === "el" ? "Συνολική τιμή (€)" : "Total price (€)"}</label>
              <input type="number" min={1} step={0.01} value={offerTotal} onChange={(e) => setOfferTotal(e.target.value)}
                placeholder="e.g. 350"
                className="w-full px-4 py-2 border border-border rounded-lg text-foreground bg-background" />
            </div>
          </div>
          {offerError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{offerError}</div>
          )}
          <button onClick={handleGenerateLink} disabled={loadingOffer || units.length === 0} className="btn-primary px-6 mb-4">
            {loadingOffer ? (language === "el" ? "Δημιουργία..." : "Generating...") : (language === "el" ? "Δημιούργησε σύνδεσμο" : "Generate link")}
          </button>
          {generatedUrl && (
            <div className="p-4 bg-muted/50 border border-border rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-2">{language === "el" ? "Σύνδεσμος (αντιγράψτε και στείλτε στον επισκέπτη)" : "Link (copy and send to guest)"}</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={generatedUrl}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-foreground bg-background text-sm" />
                <button onClick={copyToClipboard} className="btn-secondary px-4 flex items-center gap-2">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? (language === "el" ? "Αντιγράφηκε" : "Copied") : (language === "el" ? "Αντιγραφή" : "Copy")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-lg border-2 border-red-400 bg-red-50 px-3 py-3 text-sm text-red-900 shadow-sm dark:border-red-600 dark:bg-red-950/50 dark:text-red-100"
        >
          <span
            className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 animate-pulse"
            aria-hidden
          />
          <p className="font-semibold leading-snug">
            {t("admin.inquiriesUnreadBanner").replace("{count}", String(unreadCount))}
          </p>
        </div>
      ) : null}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-foreground">{t("admin.guestInquiries")}</h2>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 border border-border rounded-lg text-foreground bg-background">
          <option value="ALL">{t("admin.all")}</option>
          <option value="NEW">{t("admin.newStatus")}</option>
          <option value="ANSWERED">{t("admin.answered")}</option>
          <option value="GUEST_REPLIED">{t("admin.guestReplied")}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : inquiries.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.noInquiriesFound")}</p>
      ) : (
        <>
          <div className="space-y-2">
            {inquiries.map((inq: any) => (
              <div key={inq.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => viewInquiry(inq)}>
                <div>
                  <p className="font-semibold text-foreground">{inq.guest_name}</p>
                  <p className="text-sm text-muted-foreground">{inq.guest_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateOnly(inq.checkin_date)} - {formatDateOnly(inq.checkout_date)} | {inq.property?.name || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    inq.status === "NEW" ? "bg-blue-100 text-blue-700" :
                    inq.status === "ANSWERED" ? "bg-green-100 text-green-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{inq.status}</span>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(inq.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
          <AdminPaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => setCurrentPage(Math.max(1, currentPage - 1))}
            onNext={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}

function AdminAreaSection({
  sectionId,
  titleId,
  title,
  help,
  helpAriaLabel,
  icon: Icon,
  headerBadge,
  children,
}: {
  sectionId: string;
  titleId: string;
  title: string;
  help: string;
  helpAriaLabel: string;
  icon: LucideIcon;
  /** Red count badge next to title (e.g. unread inquiries). */
  headerBadge?: number;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const accent = SECTION_ACCENTS[sectionId] ?? SECTION_ACCENTS["admin-section-dashboard"];
  return (
    <section
      id={sectionId}
      aria-labelledby={titleId}
      className="scroll-mt-20 mb-8 md:mb-10"
    >
      <div
        className={cn(
          "rounded-xl border border-border bg-card shadow-sm p-4 md:p-5 border-l-4",
          accent.borderL,
        )}
      >
        <header
          className={cn(
            "mb-4 pb-3 border-b border-border -mx-1 px-3 py-2 rounded-lg",
            accent.headerTint,
          )}
        >
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <h2
              id={titleId}
              className="text-xl md:text-2xl font-bold text-foreground flex flex-wrap items-center gap-2 pr-1"
            >
              <Icon
                className={cn("h-7 w-7 shrink-0", accent.iconTint)}
                strokeWidth={1.75}
                aria-hidden
              />
              {title}
              {typeof headerBadge === "number" && headerBadge > 0 ? (
                <span
                  className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-sm font-black text-white shadow-md ring-2 ring-red-200 dark:ring-red-900"
                  aria-label={
                    headerBadge === 1
                      ? t("admin.inquiriesNewBadgeOne")
                      : t("admin.inquiriesNewBadgeMany").replace("{count}", String(headerBadge))
                  }
                >
                  {headerBadge > 99 ? "99+" : headerBadge}
                </span>
              ) : null}
            </h2>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 rounded-full p-1.5 min-h-10 min-w-10 items-center justify-center",
                    "text-foreground/70 hover:text-foreground hover:bg-background/80 border border-border/60 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  )}
                  aria-label={helpAriaLabel}
                >
                  <HelpCircle className="h-5 w-5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-sm text-left leading-snug z-[300]">
                {help}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}

export default function Admin() {
  const { language, t } = useLanguage();
  const [stats, setStats] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    propertiesCount: 0,
    occupancyByProperty: [],
    activeUsers: 0,
    unreadInquiriesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [panelRefreshKey, setPanelRefreshKey] = useState(0);
  const [refreshingPanel, setRefreshingPanel] = useState(false);
  const navigate = useNavigate();

  const [occupancyMonth, setOccupancyMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    // Check if admin is logged in
    const admin = localStorage.getItem("admin");
    if (!admin) {
      navigate("/admin/login");
      return;
    }

    // Fetch admin stats
    fetchStats();
  }, [navigate]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const tmr = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 150);
    return () => clearTimeout(tmr);
  }, []);

  const scrollToAdminSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  const fetchStats = async (
    monthOverride?: { year: number; month: number },
    opts?: { quiet?: boolean },
  ) => {
    const quiet = opts?.quiet === true;
    if (!monthOverride && !quiet) setLoading(true);
    const m = monthOverride ?? occupancyMonth;
    try {
      const params = new URLSearchParams({ year: String(m.year), month: String(m.month + 1) });
      const response = await fetch(apiUrl(`/api/admin/stats?${params}`));

      if (response.ok) {
        const response_data = await response.json();
        setStats(response_data.data || response_data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingPanel(true);
    setPanelRefreshKey((k) => k + 1);
    try {
      await fetchStats(undefined, { quiet: true });
    } finally {
      setRefreshingPanel(false);
    }
  };

  const statsCards = [
    {
      label: t("admin.totalBookings"),
      value: (stats?.totalBookings || 0).toString(),
      icon: BookOpen,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: t("admin.revenue"),
      value: formatCurrency(stats?.totalRevenue || 0, language),
      icon: DollarSign,
      color: "bg-green-100 text-green-700",
    },
    {
      label: t("admin.totalUsers"),
      value: (stats?.totalUsers || 0).toString(),
      icon: Users,
      color: "bg-purple-100 text-purple-700",
    },
    {
      label: t("admin.properties"),
      value: (stats?.propertiesCount || 0).toString(),
      icon: Settings,
      color: "bg-orange-100 text-orange-700",
    },
  ];

  const adminNavItems: {
    sectionId: string;
    label: string;
    icon: LucideIcon;
    badge?: number;
    navButton: string;
  }[] = [
    {
      sectionId: "admin-section-dashboard",
      label: t("admin.dashboard"),
      icon: BarChart3,
      navButton: SECTION_ACCENTS["admin-section-dashboard"].navButton,
    },
    {
      sectionId: "admin-section-bookings",
      label: t("admin.bookings"),
      icon: BookOpen,
      navButton: SECTION_ACCENTS["admin-section-bookings"].navButton,
    },
    {
      sectionId: "admin-section-properties",
      label: t("admin.properties"),
      icon: Calendar,
      navButton: SECTION_ACCENTS["admin-section-properties"].navButton,
    },
    {
      sectionId: "admin-section-users",
      label: t("admin.users"),
      icon: Users,
      navButton: SECTION_ACCENTS["admin-section-users"].navButton,
    },
    {
      sectionId: "admin-section-inquiries",
      label: t("admin.inquiries"),
      icon: Tag,
      badge: stats?.unreadInquiriesCount ?? 0,
      navButton: SECTION_ACCENTS["admin-section-inquiries"].navButton,
    },
  ];

  const navIntro = t("admin.areasNavIntro").trim();

  return (
    <Layout>
        <div className="min-h-screen">
          {/* Admin Header */}
          <div className="bg-gradient-to-br from-primary via-primary to-blue-800 dark:to-blue-950 text-white py-5 mb-5 shadow-lg">
            <div className="container-max flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold drop-shadow-sm">{t("admin.title")}</h1>
                <p className="text-white/90 mt-1.5 text-sm md:text-base max-w-2xl font-medium">
                  {t("admin.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRefreshAll()}
                disabled={refreshingPanel}
                className={cn(
                  "shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                  "bg-white/15 hover:bg-white/25 border border-white/30 text-white shadow-md",
                  "disabled:opacity-60 disabled:pointer-events-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                )}
                aria-label={t("admin.refreshPanel")}
              >
                <RefreshCw
                  className={cn("h-4 w-4 shrink-0", refreshingPanel && "animate-spin")}
                  aria-hidden
                />
                {t("admin.refreshPanel")}
              </button>
            </div>
          </div>

        <div className="container-max pb-8">
          <nav
            aria-label={t("admin.areasNavLabel")}
            className="sticky top-0 z-20 -mx-4 px-4 py-2.5 mb-6 rounded-b-xl border-b border-primary/20 bg-gradient-to-b from-muted/90 to-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 shadow-sm"
          >
            {navIntro ? (
              <p className="text-xs md:text-sm text-muted-foreground mb-3 max-w-2xl font-medium">
                {navIntro}
              </p>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {adminNavItems.map((item, idx) => {
                const Icon = item.icon;
                const badge = item.badge ?? 0;
                const hasAlert = badge > 0;
                return (
                  <button
                    key={item.sectionId}
                    type="button"
                    onClick={() => scrollToAdminSection(item.sectionId)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1 min-h-[3.75rem] sm:min-h-[4rem] px-2 py-2 rounded-xl font-bold text-xs sm:text-sm text-center leading-tight transition-transform",
                      item.navButton,
                    )}
                  >
                    <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-black text-white border border-white/30">
                      {idx + 1}
                    </span>
                    <Icon size={22} className="shrink-0 opacity-95" aria-hidden />
                    <span className="line-clamp-2">{item.label}</span>
                    {hasAlert && (
                      <span
                        className="absolute -top-1 -right-1 flex min-w-[24px] h-[24px] items-center justify-center rounded-full px-1 text-xs font-black bg-red-500 text-white ring-2 ring-white animate-pulse"
                        title={
                          badge === 1
                            ? t("admin.inquiriesNewBadgeOne")
                            : t("admin.inquiriesNewBadgeMany").replace("{count}", String(badge))
                        }
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <AdminAreaSection
            sectionId="admin-section-dashboard"
            titleId="admin-heading-dashboard"
            title={t("admin.dashboard")}
            help={t("admin.section.dashboard.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={BarChart3}
          >
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {statsCards.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-muted/30 p-3 md:p-4"
                    >
                      <div
                        className={`w-9 h-9 rounded-md ${stat.color} flex items-center justify-center mb-2`}
                      >
                        <Icon size={20} aria-hidden />
                      </div>
                      <p className="text-muted-foreground text-xs mb-0.5">
                        {stat.label}
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-base font-bold text-foreground mb-3">
                    {t("admin.recentBookings")}
                  </h3>
                  <div className="space-y-2">
                    {loading ? (
                      <p className="text-muted-foreground">{t("admin.loadingBookings")}</p>
                    ) : stats.totalBookings > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-green-600">✅ {t("admin.confirmedBookingsCount").replace("{count}", String(stats.confirmedBookings))}</p>
                        <p className="text-sm text-yellow-600">⏳ {t("admin.pendingBookingsCount").replace("{count}", String(stats.pendingBookings))}</p>
                        <p className="text-sm text-blue-600">💰 {t("admin.totalBookingsCount").replace("{count}", String(stats.totalBookings))}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">{t("admin.noBookingsFound")}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">
                      {t("admin.occupancyByProperty")}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = occupancyMonth.month === 0
                            ? { year: occupancyMonth.year - 1, month: 11 }
                            : { year: occupancyMonth.year, month: occupancyMonth.month - 1 };
                          setOccupancyMonth(prev);
                          fetchStats(prev);
                        }}
                        className="p-2 rounded-lg min-h-11 min-w-11 border border-border hover:bg-muted"
                        aria-label={t("admin.prevMonth")}
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden />
                      </button>
                      <span className="text-sm font-medium min-w-[140px] text-center">
                        {new Date(occupancyMonth.year, occupancyMonth.month).toLocaleDateString(
                          language === "el" ? "el-GR" : language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : "en-US",
                          { month: "long", year: "numeric" }
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = occupancyMonth.month === 11
                            ? { year: occupancyMonth.year + 1, month: 0 }
                            : { year: occupancyMonth.year, month: occupancyMonth.month + 1 };
                          setOccupancyMonth(next);
                          fetchStats(next);
                        }}
                        className="p-2 rounded-lg min-h-11 min-w-11 border border-border hover:bg-muted"
                        aria-label={t("admin.nextMonth")}
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {loading ? (
                      <p className="text-muted-foreground text-sm">{t("admin.loadingOccupancy")}</p>
                    ) : (stats?.occupancyByProperty?.length || 0) > 0 ? (
                      stats.occupancyByProperty.map((property) => (
                        <div key={property.id}>
                          <div className="flex justify-between text-xs md:text-sm mb-1">
                            <span className="font-semibold text-foreground">
                              {property.name}
                            </span>
                            <span className="text-muted-foreground">
                              {property.occupancyPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 min-w-0 overflow-hidden">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300 min-w-0 shrink-0"
                              style={{ width: `${Math.min(property.occupancyPercentage, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {property.bookedDays != null && property.daysInMonth != null
                              ? `${property.bookedDays} / ${property.daysInMonth} ${t("admin.daysOccupied")}`
                              : t("admin.unitsCount").replace("{count}", String(property.units))}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">{t("admin.noOccupancyData")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AdminAreaSection>

          <AdminAreaSection
            sectionId="admin-section-bookings"
            titleId="admin-heading-bookings"
            title={t("admin.bookings")}
            help={t("admin.section.bookings.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={BookOpen}
          >
            <BookingManagement key={panelRefreshKey} />
          </AdminAreaSection>

          <AdminAreaSection
            sectionId="admin-section-properties"
            titleId="admin-heading-properties"
            title={t("admin.properties")}
            help={t("admin.section.properties.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={Calendar}
          >
            <PropertyManagement key={panelRefreshKey} />
          </AdminAreaSection>

          <AdminAreaSection
            sectionId="admin-section-users"
            titleId="admin-heading-users"
            title={t("admin.users")}
            help={t("admin.section.users.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={Users}
          >
            <UserManagement key={panelRefreshKey} />
          </AdminAreaSection>

          <AdminAreaSection
            sectionId="admin-section-inquiries"
            titleId="admin-heading-inquiries"
            title={t("admin.inquiries")}
            help={t("admin.section.inquiries.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={Tag}
            headerBadge={stats.unreadInquiriesCount > 0 ? stats.unreadInquiriesCount : undefined}
          >
            <InquiriesManagement
              key={panelRefreshKey}
              unreadCount={stats.unreadInquiriesCount}
              onReplySent={() => fetchStats()}
              onInquiryViewed={() => fetchStats()}
            />
          </AdminAreaSection>
        </div>
        </div>
    </Layout>
  );
}

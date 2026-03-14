import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  Settings,
  BookOpen,
  Tag,
  CalendarRange,
  Plus,
  Pencil,
  Trash2,
  Euro,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { useNavigate } from "react-router-dom";
import PropertyManagement from "@/components/admin/PropertyManagement";
import BookingManagement from "@/components/admin/BookingManagement";
import UserManagement from "@/components/admin/UserManagement";

const defaultCouponForm = {
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discountValue: 10,
  validFrom: "",
  validUntil: "",
  minBookingAmount: "",
  maxUses: "",
  isActive: true,
};

// ── Payment Settings Panel ─────────────────────────────────────────

function PaymentSettingsPanel() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    depositPercentage: 25,
    balanceChargeDaysBefore: 21,
    fullPaymentThresholdDays: 21,
    refundDepositOnCancel: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/admin/settings/payment"));
        if (res.ok) {
          const data = await res.json();
          const d = data.data;
          setSettings({
            depositPercentage: d.deposit_percentage ?? 25,
            balanceChargeDaysBefore: d.balance_charge_days_before ?? 21,
            fullPaymentThresholdDays: d.full_payment_threshold_days ?? 21,
            refundDepositOnCancel: d.refund_deposit_on_cancel ?? false,
          });
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/admin/settings/payment"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) alert(t("admin.paymentSettingsSaved"));
      else alert(t("admin.paymentSettingsSaveError"));
    } catch { alert(t("admin.paymentSettingsError")); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="bg-card border border-border rounded-lg p-6"><p>{t("common.loading")}</p></div>;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-bold text-foreground mb-4">{t("admin.paymentPolicy")}</h3>
      <p className="text-muted-foreground text-sm mb-4">{t("admin.paymentPolicyDesc")}</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("admin.depositPercentage")}</label>
          <input type="number" value={settings.depositPercentage}
            onChange={(e) => setSettings({...settings, depositPercentage: parseInt(e.target.value) || 25})}
            min="5" max="100" step="5"
            className="w-full p-2 border border-border rounded-md bg-background text-foreground" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("admin.fullPaymentThreshold")}</label>
          <input type="number" value={settings.fullPaymentThresholdDays}
            onChange={(e) => setSettings({...settings, fullPaymentThresholdDays: parseInt(e.target.value) || 21})}
            min="1" max="90"
            className="w-full p-2 border border-border rounded-md bg-background text-foreground" />
          <p className="text-xs text-muted-foreground mt-1">{t("admin.fullPaymentThresholdDesc")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("admin.balanceChargeDays")}</label>
          <input type="number" value={settings.balanceChargeDaysBefore}
            onChange={(e) => setSettings({...settings, balanceChargeDaysBefore: parseInt(e.target.value) || 21})}
            min="1" max="90"
            className="w-full p-2 border border-border rounded-md bg-background text-foreground" />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="refundDeposit" checked={settings.refundDepositOnCancel}
            onChange={(e) => setSettings({...settings, refundDepositOnCancel: e.target.checked})} />
          <label htmlFor="refundDeposit" className="text-sm font-medium text-foreground">
            {t("admin.allowDepositRefund")}
          </label>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? t("admin.savingPaymentSettings") : t("admin.savePaymentSettings")}
        </button>
      </div>
    </div>
  );
}

// ── Inquiries Management ───────────────────────────────────────────

function InquiriesManagement() {
  const { t } = useLanguage();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

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
    try {
      const admin = localStorage.getItem("admin");
      const token = admin ? JSON.parse(admin).accessToken : "";
      const res = await fetch(apiUrl(`/api/inquiries/admin/${inquiry.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data?.messages || []);
      }
    } catch {}
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
      }
    } catch {}
    finally { setSending(false); }
  };

  if (selectedInquiry) {
    return (
      <div>
        <button onClick={() => { setSelectedInquiry(null); setMessages([]); }}
          className="text-primary hover:underline mb-4 inline-block">&larr; {t("admin.backToList")}</button>
        <div className="bg-card border border-border rounded-lg p-6 mb-4">
          <h3 className="font-bold text-foreground mb-2">{t("admin.inquiryFrom")} {selectedInquiry.guest_name}</h3>
          <p className="text-sm text-muted-foreground">{selectedInquiry.guest_email}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(selectedInquiry.checkin_date).toLocaleDateString()} - {new Date(selectedInquiry.checkout_date).toLocaleDateString()} | {selectedInquiry.guests} {t("common.guests").toLowerCase()}
          </p>
          <p className="text-sm mt-1">{t("admin.propertyLabel")} <strong>{selectedInquiry.property?.name || "—"}</strong></p>
          <p className="text-sm">{t("admin.statusLabel")} <span className="font-semibold capitalize">{selectedInquiry.status?.toLowerCase().replace("_", " ")}</span></p>
        </div>

        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`p-4 rounded-lg ${msg.sender_type === "host" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span className="font-semibold">{msg.sender_type === "host" ? t("admin.youHost") : t("admin.guestSender")}</span>
                <span>{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder={t("admin.typeYourReply")}
            className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground" />
          <button onClick={handleReply} disabled={sending || !replyText.trim()} className="btn-primary px-6">
            {sending ? t("admin.sending") : t("admin.reply")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">{t("admin.guestInquiries")}</h2>
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
          <div className="space-y-3">
            {inquiries.map((inq: any) => (
              <div key={inq.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => viewInquiry(inq)}>
                <div>
                  <p className="font-semibold text-foreground">{inq.guest_name}</p>
                  <p className="text-sm text-muted-foreground">{inq.guest_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inq.checkin_date).toLocaleDateString()} - {new Date(inq.checkout_date).toLocaleDateString()} | {inq.property?.name || "—"}
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
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn-secondary-sm"
              >
                {t("admin.previous")}
              </button>
              <span className="text-sm text-muted-foreground">
                {t("admin.pageOf").replace("{current}", String(currentPage)).replace("{total}", String(totalPages))}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary-sm"
              >
                {t("admin.next")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Τιμές & Περίοδος (Prices & Period) ─────────────────────────────────

function PricesAndPeriodPanel() {
  const { t } = useLanguage();
  const [data, setData] = useState<{
    currentPeriod: { label: string; roomPrices: Array<{ roomName: string; closed: boolean; price?: number; price6?: number; price10?: number }> } | null;
    upcomingPeriods: Array<{ label: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/admin/prices-and-period"));
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="bg-card border border-border rounded-lg p-6"><p>{t("common.loading")}</p></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {t("admin.pricesAndPeriod")}
      </h2>
      <p className="text-muted-foreground mb-6">
        Οι τιμές προέρχονται αυτόματα από τον Πίνακα Τιμών Δωματίων. Δεν απαιτείται χειροκίνητη επεξεργασία.
      </p>

      <div className="space-y-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <CalendarRange size={20} />
            {t("admin.currentPeriod")}
          </h3>
          {data?.currentPeriod ? (
            <>
              <p className="text-lg font-semibold text-primary mb-6">
                {data.currentPeriod.label}
              </p>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{t("admin.currentPrices")}</h4>
              <div className="space-y-4">
                {data.currentPeriod.roomPrices.map((rp) => (
                  <div key={rp.roomName} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="font-semibold text-foreground">{rp.roomName}</span>
                    {rp.closed ? (
                      <span className="text-muted-foreground italic">{t("admin.roomClosed")}</span>
                    ) : rp.price !== undefined ? (
                      <span className="font-bold text-primary">{rp.price}€</span>
                    ) : (
                      <div className="flex gap-4">
                        <span>{t("admin.guests10")} → <strong>{rp.price10}€</strong></span>
                        <span>{t("admin.guests6")} → <strong>{rp.price6}€</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Δεν βρέθηκε τρέχουσα περίοδος.</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-bold text-foreground mb-4">{t("admin.upcomingPeriods")}</h3>
          {data?.upcomingPeriods && data.upcomingPeriods.length > 0 ? (
            <ul className="space-y-2">
              {data.upcomingPeriods.map((p) => (
                <li key={p.label} className="flex items-center gap-2">
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium text-foreground">{p.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Δεν υπάρχουν επόμενες περίοδοι.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PricingAndDiscounts() {
  const { language, t } = useLanguage();
  const [seasonalPricing, setSeasonalPricing] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponFormOpen, setCouponFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [couponForm, setCouponForm] = useState(defaultCouponForm);
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPricing = async () => {
    try {
      console.log("🔍 [PRICING] Fetching pricing data...");
      const res = await fetch(apiUrl("/api/admin/pricing"));
      console.log("🔍 [PRICING] Response status:", res.status, res.ok);
      
      if (res.ok) {
        const data = await res.json();
        console.log("✅ [PRICING] Pricing data:", data);
        
        // Validate and sanitize data to prevent undefined errors
        const safeCoupons = (data.coupons || []).map((coupon: any) => ({
          ...coupon,
          discountValue: coupon.discountValue || 0,
          validFrom: coupon.validFrom || new Date().toISOString(),
          validUntil: coupon.validUntil || new Date().toISOString(),
          minBookingAmount: coupon.minBookingAmount || 0,
          maxUses: coupon.maxUses || null,
          usedCount: coupon.usedCount || 0
        }));
        
        setSeasonalPricing(data.seasonalPricing || []);
        setCoupons(safeCoupons);
      } else {
        console.error("❌ [PRICING] Failed to fetch pricing:", res.status);
      }
    } catch (e) {
      console.error("❌ [PRICING] Network error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({
      ...defaultCouponForm,
      validFrom: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    setCouponFormOpen(true);
    setCouponError(null);
  };

  const openEditCoupon = (c: any) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code,
      description: c.description ?? "",
      discountType: c.discountType,
      discountValue: c.discountValue,
      validFrom: new Date(c.validFrom).toISOString().slice(0, 10),
      validUntil: new Date(c.validUntil).toISOString().slice(0, 10),
      minBookingAmount: c.minBookingAmount != null ? String(c.minBookingAmount) : "",
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      isActive: c.isActive,
    });
    setCouponFormOpen(true);
    setCouponError(null);
  };

  const closeCouponForm = () => {
    setCouponFormOpen(false);
    setEditingCoupon(null);
    setCouponError(null);
  };

  const submitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponSaving(true);
    setCouponError(null);
    const validFrom = new Date(couponForm.validFrom + "T00:00:00").toISOString();
    const validUntil = new Date(couponForm.validUntil + "T23:59:59").toISOString();
    const body = {
      code: couponForm.code.trim().toUpperCase(),
      description: couponForm.description.trim() || undefined,
      discountType: couponForm.discountType,
      discountValue: Number(couponForm.discountValue),
      validFrom,
      validUntil,
      minBookingAmount: couponForm.minBookingAmount ? Number(couponForm.minBookingAmount) : undefined,
      maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
      isActive: couponForm.isActive,
    };
    try {
      if (editingCoupon) {
        const res = await fetch(apiUrl(`/api/admin/coupons/${editingCoupon.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setCouponError(data.error || "Failed to update");
          return;
        }
        closeCouponForm();
        await fetchPricing();
        alert(t("admin.couponUpdated"));
      } else {
        const res = await fetch(apiUrl("/api/admin/coupons"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setCouponError(data.error === "A coupon with this code already exists" ? t("admin.couponCodeExists") : (data.error || "Failed to create"));
          return;
        }
        closeCouponForm();
        await fetchPricing();
        alert(t("admin.couponCreated"));
      }
    } finally {
      setCouponSaving(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm(t("admin.deleteCouponConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(apiUrl(`/api/admin/coupons/${id}`), { method: "DELETE" });
      if (res.ok) {
        await fetchPricing();
        alert(t("admin.couponDeleted"));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">
        {t("admin.pricing")}
      </h2>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="space-y-8">
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Tag size={20} />
                {t("admin.coupons")}
              </h3>
              <button
                type="button"
                onClick={openCreateCoupon}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                <Plus size={18} />
                {t("admin.addCoupon")}
              </button>
            </div>

            {couponFormOpen && (
              <form onSubmit={submitCoupon} className="mb-6 p-4 bg-muted/50 rounded-lg space-y-4">
                {couponError && (
                  <p className="text-sm text-destructive">{couponError}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.code")}</label>
                    <input
                      type="text"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                      placeholder="SUMMER20"
                      required
                      disabled={!!editingCoupon}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.type")}</label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discountType: e.target.value as "PERCENTAGE" | "FIXED" }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                    >
                      <option value="PERCENTAGE">{t("admin.percentage")}</option>
                      <option value="FIXED">{t("admin.fixed")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.value")}</label>
                    <input
                      type="number"
                      min="0"
                      step={couponForm.discountType === "PERCENTAGE" ? "1" : "0.01"}
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                      required
                    />
                    {couponForm.discountType === "PERCENTAGE" ? "%" : "€"}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.validFrom")}</label>
                    <input
                      type="date"
                      value={couponForm.validFrom}
                      onChange={(e) => setCouponForm((f) => ({ ...f, validFrom: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.validUntil")}</label>
                    <input
                      type="date"
                      value={couponForm.validUntil}
                      onChange={(e) => setCouponForm((f) => ({ ...f, validUntil: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.description")}</label>
                    <input
                      type="text"
                      value={couponForm.description}
                      onChange={(e) => setCouponForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.minBookingAmount")}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={couponForm.minBookingAmount}
                      onChange={(e) => setCouponForm((f) => ({ ...f, minBookingAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t("admin.maxUses")}</label>
                    <input
                      type="number"
                      min="1"
                      value={couponForm.maxUses}
                      onChange={(e) => setCouponForm((f) => ({ ...f, maxUses: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="coupon-active"
                      checked={couponForm.isActive}
                      onChange={(e) => setCouponForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="rounded border-border"
                    />
                    <label htmlFor="coupon-active" className="text-sm font-medium text-foreground">{t("admin.isActive")}</label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={couponSaving} className="btn-primary">
                    {couponSaving ? t("common.loading") : editingCoupon ? t("common.save") : t("admin.createCoupon")}
                  </button>
                  <button type="button" onClick={closeCouponForm} className="btn-secondary">
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            )}

            {coupons.length === 0 ? (
              <p className="text-muted-foreground">
                {t("admin.noCouponsYet")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-foreground">{t("admin.code")}</th>
                      <th className="text-left py-2 font-medium text-foreground">{t("admin.type")}</th>
                      <th className="text-left py-2 font-medium text-foreground">{t("admin.value")}</th>
                      <th className="text-left py-2 font-medium text-foreground">{t("admin.validFrom")}</th>
                      <th className="text-left py-2 font-medium text-foreground">{t("admin.validUntil")}</th>
                      <th className="text-left py-2 font-medium text-foreground">{t("admin.used")}</th>
                      <th className="text-left py-2 font-medium text-foreground">{t("admin.active")}</th>
                      <th className="text-left py-2 font-medium text-foreground w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2 font-mono font-medium text-foreground">{c.code}</td>
                        <td className="py-2 text-muted-foreground">{c.discountType}</td>
                        <td className="py-2 text-foreground">
                          {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : formatCurrency(c.discountValue || 0, language)}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(c.validFrom).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(c.validUntil).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ""}
                        </td>
                        <td className="py-2">
                          <span className={c.isActive ? "text-green-600" : "text-muted-foreground"}>
                            {c.isActive ? t("common.yes") : t("common.no")}
                          </span>
                        </td>
                        <td className="py-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditCoupon(c)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                            title={t("common.edit")}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCoupon(c.id)}
                            disabled={deletingId === c.id}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                            title={t("admin.deleteCoupon")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {t("admin.pricingFooterNote")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
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
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Tax settings state
  const [taxSettings, setTaxSettings] = useState({
    taxRate: 15,
    additionalFees: 0,
  });
  const [savingSettings, setSavingSettings] = useState(false);

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

  const fetchStats = async () => {
    try {
      console.log("🔍 [ADMIN CLIENT] Fetching stats from server...");
      const response = await fetch(apiUrl("/api/admin/stats"));
      
      if (response.ok) {
        const response_data = await response.json();
        console.log("✅ [ADMIN CLIENT] Stats received:", response_data);
        setStats(response_data.data || response_data);
      } else {
        console.error("❌ [ADMIN CLIENT] Failed to fetch stats:", response.status);
      }
    } catch (error) {
      console.error("❌ [ADMIN CLIENT] Network error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTaxSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch(apiUrl("/api/admin/settings/tax"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taxSettings),
      });

      if (response.ok) {
        alert(t("admin.settingsSaved"));
      } else {
        alert(t("admin.settingsSaveError"));
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert(t("admin.settingsSaveError"));
    } finally {
      setSavingSettings(false);
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

  const adminMenuItems = [
    { id: "dashboard", label: t("admin.dashboard"), icon: BarChart3 },
    { id: "bookings", label: t("admin.bookings"), icon: BookOpen },
    { id: "pricesAndPeriod", label: t("admin.pricesAndPeriod"), icon: Euro },
    { id: "pricing", label: t("admin.pricing"), icon: DollarSign },
    { id: "properties", label: t("admin.properties"), icon: Calendar },
    { id: "users", label: t("admin.users"), icon: Users },
    { id: "inquiries", label: t("admin.inquiries"), icon: Tag },
    { id: "settings", label: t("admin.settings"), icon: Settings },
  ];

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Admin Header */}
        <div className="bg-primary text-white py-8 mb-8">
          <div className="container-max">
            <h1 className="text-4xl font-bold">{t("admin.title")}</h1>
            <p className="text-white/80 mt-2">
              {t("admin.subtitle")}
            </p>
          </div>
        </div>

        <div className="container-max pb-12">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === item.id
                      ? "bg-primary text-white"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {t("admin.dashboardOverview")}
              </h2>

              {/* Stats Grid */}
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                {statsCards.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-card border border-border rounded-lg p-6"
                    >
                      <div
                        className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}
                      >
                        <Icon size={24} />
                      </div>
                      <p className="text-muted-foreground text-sm mb-1">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    {t("admin.recentBookings")}
                  </h3>
                  <div className="space-y-4">
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

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {t("admin.occupancyByProperty")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {new Date().toLocaleDateString(
                      language === "el" ? "el-GR" : language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : "en-US",
                      { month: "long", year: "numeric" }
                    )}
                  </p>
                  <div className="space-y-4">
                    {loading ? (
                      <p className="text-muted-foreground">{t("admin.loadingOccupancy")}</p>
                    ) : (stats?.occupancyByProperty?.length || 0) > 0 ? (
                      stats.occupancyByProperty.map((property) => (
                        <div key={property.id}>
                          <div className="flex justify-between text-sm mb-2">
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
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <BookingManagement />
          )}

          {/* Τιμές & Περίοδος Tab */}
          {activeTab === "pricesAndPeriod" && (
            <PricesAndPeriodPanel />
          )}

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <PricingAndDiscounts />
          )}

          {/* Properties Tab */}
          {activeTab === "properties" && (
            <PropertyManagement />
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <UserManagement />
          )}

          {/* Inquiries Tab */}
          {activeTab === "inquiries" && (
            <InquiriesManagement />
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {t("admin.settings")}
              </h2>
              <div className="grid gap-6 max-w-2xl">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold text-foreground mb-4">
                    {t("admin.taxSettings")}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {t("admin.taxSettingsDesc")}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t("admin.taxRate")}
                      </label>
                      <input
                        type="number"
                        value={taxSettings.taxRate}
                        onChange={(e) => setTaxSettings({...taxSettings, taxRate: parseFloat(e.target.value) || 0})}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t("admin.additionalFees")}
                      </label>
                      <input
                        type="number"
                        value={taxSettings.additionalFees}
                        onChange={(e) => setTaxSettings({...taxSettings, additionalFees: parseFloat(e.target.value) || 0})}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                      />
                    </div>
                    <button 
                      onClick={handleSaveTaxSettings}
                      disabled={savingSettings}
                      className="btn-primary"
                    >
                      {savingSettings ? t("common.saving") : t("admin.saveSettings")}
                    </button>
                  </div>
                </div>

                {/* Payment Policy Settings */}
                <PaymentSettingsPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

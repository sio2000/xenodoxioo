import { apiUrl } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { programmerAuthHeaders, programmerJsonHeaders } from "@/lib/programmerAuthHeaders";
import { Tag, CalendarRange, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";

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

export function PaymentSettingsPanelProgrammer() {
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
        const res = await fetch(apiUrl("/api/admin/settings/payment"), { headers: { ...programmerAuthHeaders() } });
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
        headers: { ...programmerJsonHeaders() },
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

// ── Τιμές & Περίοδος (Prices & Period) ─────────────────────────────────

export function PricesAndPeriodPanelProgrammer() {
  const { t } = useLanguage();
  const [data, setData] = useState<{
    currentPeriod: { label: string; roomPrices: Array<{ roomName: string; closed: boolean; price?: number; price6?: number; price10?: number }> } | null;
    upcomingPeriods: Array<{ label: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/admin/prices-and-period"), { headers: { ...programmerAuthHeaders() } });
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

export function PricingAndDiscountsProgrammer() {
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
      const res = await fetch(apiUrl("/api/admin/pricing"), { headers: { ...programmerAuthHeaders() } });
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

  const submitCoupon = async (e: FormEvent) => {
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
          headers: { ...programmerJsonHeaders() },
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
          headers: { ...programmerJsonHeaders() },
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
      const res = await fetch(apiUrl(`/api/admin/coupons/${id}`), { method: "DELETE", headers: { ...programmerAuthHeaders() } });
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


export function TaxSettingsPanelProgrammer() {
  const { t } = useLanguage();
  const [taxSettings, setTaxSettings] = useState({ taxRate: 15, additionalFees: 0 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(apiUrl("/api/admin/settings/tax"), {
          headers: { ...programmerAuthHeaders() },
        });
        if (response.ok) {
          const data = await response.json();
          setTaxSettings({
            taxRate: data.taxRate ?? 15,
            additionalFees: data.additionalFees ?? 0,
          });
        }
      } catch {}
      finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveTaxSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch(apiUrl("/api/admin/settings/tax"), {
        method: "PUT",
        headers: { ...programmerJsonHeaders() },
        body: JSON.stringify(taxSettings),
      });
      if (response.ok) alert(t("admin.settingsSaved"));
      else alert(t("admin.settingsSaveError"));
    } catch {
      alert(t("admin.settingsSaveError"));
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-bold text-foreground text-lg mb-4">{t("admin.taxSettings")}</h3>
      <p className="text-muted-foreground text-sm mb-4">{t("admin.taxSettingsDesc")}</p>
      <div className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("admin.taxRate")}</label>
          <input
            type="number"
            value={taxSettings.taxRate}
            onChange={(e) => setTaxSettings({ ...taxSettings, taxRate: parseFloat(e.target.value) || 0 })}
            min="0"
            max="100"
            step="0.1"
            className="w-full p-3 text-base border border-border rounded-lg bg-background text-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("admin.additionalFees")}</label>
          <input
            type="number"
            value={taxSettings.additionalFees}
            onChange={(e) => setTaxSettings({ ...taxSettings, additionalFees: parseFloat(e.target.value) || 0 })}
            min="0"
            max="100"
            step="0.1"
            className="w-full p-3 text-base border border-border rounded-lg bg-background text-foreground"
          />
        </div>
        <button type="button" onClick={handleSaveTaxSettings} disabled={savingSettings} className="btn-primary">
          {savingSettings ? t("common.saving") : t("admin.saveSettings")}
        </button>
      </div>
    </div>
  );
}

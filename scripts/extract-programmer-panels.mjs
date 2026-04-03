import fs from "fs";

const s = fs.readFileSync("client/pages/Admin.tsx", "utf8");
const i2 = s.indexOf("// ── Inquiries Management");
const i3 = s.indexOf("// ── Τιμές & Περίοδος");
const i4 = s.indexOf("function AdminAreaSection");
const payment = s.slice(s.indexOf("function PaymentSettingsPanel"), i2);
const block = s.slice(i3, i4);
let out = payment + block;
out = out.replace(/function PaymentSettingsPanel/g, "export function PaymentSettingsPanelProgrammer");
out = out.replace(/function PricesAndPeriodPanel/g, "export function PricesAndPeriodPanelProgrammer");
out = out.replace(/function PricingAndDiscounts/g, "export function PricingAndDiscountsProgrammer");
out = out.replace(
  'await fetch(apiUrl("/api/admin/settings/payment"))',
  'await fetch(apiUrl("/api/admin/settings/payment"), { headers: { ...programmerAuthHeaders() } })',
);
out = out.replace(
  'method: "PUT",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify(settings),',
  'method: "PUT",\n        headers: { ...programmerJsonHeaders() },\n        body: JSON.stringify(settings),',
);
out = out.replace(
  'await fetch(apiUrl("/api/admin/prices-and-period"))',
  'await fetch(apiUrl("/api/admin/prices-and-period"), { headers: { ...programmerAuthHeaders() } })',
);
out = out.replace(
  'const res = await fetch(apiUrl("/api/admin/pricing"));',
  'const res = await fetch(apiUrl("/api/admin/pricing"), { headers: { ...programmerAuthHeaders() } });',
);
out = out.replace(
  'headers: { "Content-Type": "application/json" },\n          body: JSON.stringify(body),',
  'headers: { ...programmerJsonHeaders() },\n          body: JSON.stringify(body),',
);
out = out.replace(
  "fetch(apiUrl(`/api/admin/coupons/${id}`), { method: \"DELETE\" })",
  "fetch(apiUrl(`/api/admin/coupons/${id}`), { method: \"DELETE\", headers: { ...programmerAuthHeaders() } })",
);

const header = `import { apiUrl } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { programmerAuthHeaders, programmerJsonHeaders } from "@/lib/programmerAuthHeaders";
import { Tag, CalendarRange, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

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

`;

const taxPanel = `
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
`;

fs.mkdirSync("client/components/staff", { recursive: true });
fs.writeFileSync("client/components/staff/ProgrammerStaffPanels.tsx", header + out + taxPanel);
console.log("Wrote ProgrammerStaffPanels.tsx");

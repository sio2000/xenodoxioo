import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface UnitFormProps {
  unit?: any;
  propertyId: string;
  properties: any[];
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export default function UnitForm({ unit, propertyId, properties, onSubmit, onClose }: UnitFormProps) {
  const { language, t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    basePrice: 100,
    cleaningFee: 0,
    minStayDays: 1,
    propertyId: propertyId,
  });

  useEffect(() => {
    if (unit) {
      setFormData({
        ...unit,
        propertyId: unit.propertyId || propertyId,
      });
    }
  }, [unit, propertyId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
      images: [],
      is_active: true,
    };
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-foreground">
            {unit ? t("admin.editUnit") : t("admin.addUnit")}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.property")}
            </label>
            <select
              value={formData.propertyId}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              required
            >
              <option value="">{t("admin.selectProperty")}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.unitName")}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.description")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.maxGuests")}
              </label>
              <input
                type="number"
                value={formData.maxGuests}
                onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                min="1"
                max="10"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.bedrooms")}
              </label>
              <input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                min="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.bathrooms")}
              </label>
              <input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.beds")}
              </label>
              <input
                type="number"
                value={formData.beds}
                onChange={(e) => setFormData({ ...formData, beds: parseInt(e.target.value) })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-md text-sm text-muted-foreground">
              Τιμές ορίζονται αυτόματα από τον Πίνακα Τιμών Δωματίων (κατάστημα Τιμές & Περίοδος).
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.cleaningFee")}
              </label>
              <input
                type="number"
                value={formData.cleaningFee}
                onChange={(e) => setFormData({ ...formData, cleaningFee: parseFloat(e.target.value) })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.minStayDays")}
            </label>
            <input
              type="number"
              value={formData.minStayDays}
              onChange={(e) => setFormData({ ...formData, minStayDays: parseInt(e.target.value) })}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              min="1"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
            >
              {t("admin.cancel")}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              {unit ? t("admin.update") : t("admin.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

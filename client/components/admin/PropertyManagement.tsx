import { useState, useEffect } from "react";
import { apiUrl, imageUrl, placeholderImage } from "@/lib/api";
import { Plus, Edit, Trash2, BedDouble, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

interface Property {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  main_image: string;
  gallery_images: string;
  is_active: boolean;
  units: {
    id: string;
    name: string;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    beds: number;
    basePrice: number;
  }[];
}

interface Unit {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  basePrice: number;
  cleaningFee: number;
  images: string;
  minStayDays: number;
  isActive: boolean;
}

export default function PropertyManagement() {
  const { language, t } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [updatingUnit, setUpdatingUnit] = useState(false);
  const [updatingProperty, setUpdatingProperty] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log("🔍 [PROPERTIES] Fetching data...");
      const [propertiesRes, unitsRes] = await Promise.all([
        fetch(apiUrl("/api/admin/properties")),
        fetch(apiUrl("/api/admin/units"))
      ]);

      console.log("🔍 [PROPERTIES] Properties response:", propertiesRes.status, propertiesRes.ok);
      console.log("🔍 [PROPERTIES] Units response:", unitsRes.status, unitsRes.ok);

      if (propertiesRes.ok && unitsRes.ok) {
        const propertiesResponse = await propertiesRes.json();
        const unitsResponse = await unitsRes.json();
        
        console.log("✅ [PROPERTIES] Properties response:", propertiesResponse);
        console.log("✅ [PROPERTIES] Units response:", unitsResponse);
        
        // Handle wrapped response format from Netlify functions
        const propertiesData = propertiesResponse.success ? propertiesResponse.data : propertiesResponse;
        const unitsData = unitsResponse.success ? unitsResponse.data : unitsResponse;
        
        console.log("✅ [PROPERTIES] Properties data:", propertiesData);
        console.log("✅ [PROPERTIES] Units data:", unitsData);
        
        // Ensure we have arrays before setting state
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
        setUnits(Array.isArray(unitsData) ? unitsData : []);
      } else {
        console.error("❌ [PROPERTIES] Failed to fetch:", {
          properties: propertiesRes.status,
          units: unitsRes.status
        });
      }
    } catch (error) {
      console.error("❌ [PROPERTIES] Network error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = async (formData: any) => {
    try {
      let mainImageUrl = "";

      // Upload main image if provided
      if (formData.mainImage instanceof File) {
        const imageFormData = new FormData();
        imageFormData.append('file', formData.mainImage);
        
        const uploadResponse = await fetch(apiUrl("/api/admin/upload-image"), {
          method: "POST",
          body: imageFormData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          if (uploadResult.success && uploadResult.imageUrl) {
            mainImageUrl = uploadResult.imageUrl;
          }
        }
      }
      if (!mainImageUrl) {
        alert(t("admin.uploadMainImage"));
        return;
      }

      const submitData = {
        name: formData.name,
        description: formData.description || "",
        location: formData.location || "",
        city: formData.city,
        country: formData.country,
        main_image: mainImageUrl,
        gallery_images: [],
        is_active: true
      };

      const response = await fetch(apiUrl("/api/admin/properties"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setShowPropertyForm(false);
        fetchData();
      } else {
        const error = await response.json();
        console.error("Failed to create property:", error);
        alert(`Error: ${error.message || "Failed to create property"}`);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const handleCreateUnit = async (formData: any) => {
    try {
      console.log("🔍 [CLIENT] Creating unit with data:", formData);
      
      // Check if formData is valid
      if (!formData || !formData.propertyId || !formData.name) {
        console.error("❌ [CLIENT] Missing required unit data");
        alert("Please select a property and enter unit name");
        return;
      }
      
      const fd = new FormData();
      fd.append("propertyId", formData.propertyId || selectedProperty);
      fd.append("name", formData.name);
      fd.append("description", formData.description || "");
      fd.append("maxGuests", String(formData.maxGuests));
      fd.append("bedrooms", String(formData.bedrooms));
      fd.append("bathrooms", String(formData.bathrooms));
      fd.append("basePrice", String(formData.basePrice));
      fd.append("cleaningFee", String(formData.cleaningFee));
      fd.append("minStayDays", String(formData.minStayDays));
      (formData.imageFiles || []).forEach((f: File) => fd.append("images", f));

      console.log("🔍 [CLIENT] Sending FormData with entries:", Array.from(fd.entries()));

      const response = await fetch(apiUrl("/api/admin/units"), {
        method: "POST",
        body: fd,
      });

      if (response.ok) {
        setShowUnitForm(false);
        fetchData();
      } else {
        const err = await response.json();
        console.error("Failed to create unit:", err);
        alert(`Error: ${err.message || "Failed to create unit"}`);
      }
    } catch (error) {
      console.error("Failed to create unit:", error);
      alert("Failed to create unit");
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setShowUnitForm(true);
  };

  const handleUpdateProperty = async (formData: any) => {
    if (!editingProperty) return;
    setUpdatingProperty(true);
    const uploadUrl = apiUrl("/api/admin/upload-image");
    const putUrl = apiUrl(`/api/admin/properties/${editingProperty.id}`);
    try {
      let mainImageUrl = editingProperty.main_image || "";
      if (formData.mainImage instanceof File) {
        const base64 = await compressAndToBase64(formData.mainImage);
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: base64,
            filename: `property-main-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`,
          }),
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.imageUrl) {
          mainImageUrl = uploadJson.imageUrl;
        } else {
          console.error("[UPDATE PROPERTY] Upload failed:", uploadJson);
          alert(uploadJson?.error || "Failed to upload image");
          setUpdatingProperty(false);
          return;
        }
      }
      const body = {
        name: formData.name,
        description: formData.description ?? editingProperty.description ?? "",
        location: formData.location ?? editingProperty.location ?? "",
        city: formData.city ?? editingProperty.city ?? "",
        country: formData.country ?? editingProperty.country ?? "Greece",
        main_image: mainImageUrl,
      };
      const response = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let responseData: any = {};
      try {
        const text = await response.text();
        responseData = text ? JSON.parse(text) : {};
      } catch {
        responseData = {};
      }
      if (response.ok) {
        setShowPropertyForm(false);
        setEditingProperty(null);
        fetchData();
      } else {
        console.error("[UPDATE PROPERTY] Failed:", responseData);
        alert(responseData?.error || responseData?.message || "Failed to update property");
      }
    } catch (error) {
      console.error("[UPDATE PROPERTY] Exception:", error);
      alert("Failed to update property");
    } finally {
      setUpdatingProperty(false);
    }
  };

  const compressAndToBase64 = (file: File, maxW = 1200, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.readAsDataURL(file);
              return;
            }
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.readAsDataURL(blob);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      };
      img.src = url;
    });

  const handleUpdateUnit = async (formData: any) => {
    console.log("[UPDATE UNIT] handleUpdateUnit called", {
      editingUnit: editingUnit ? { id: editingUnit.id, name: editingUnit.name } : null,
      hasFormData: !!formData,
    });

    if (!editingUnit) {
      console.error("[UPDATE UNIT] ABORT: editingUnit is null/undefined");
      return;
    }

    setUpdatingUnit(true);
    const uploadUrl = apiUrl("/api/admin/upload-image");
    const putUrl = apiUrl(`/api/admin/units/${editingUnit.id}`);
    console.log("[UPDATE UNIT] API URLs", { uploadUrl, putUrl });

    try {
      const existing = formData.existingImages || [];
      let newUrls: string[] = [];
      const files = formData.imageFiles || [];

      console.log("[UPDATE UNIT] Step 1: Data", {
        existingCount: existing.length,
        newFilesCount: files.length,
        existingSample: existing.slice(0, 2),
      });

      for (let i = 0; i < files.length; i++) {
        const f = files[i] as File;
        console.log(`[UPDATE UNIT] Step 2a: Upload file ${i + 1}/${files.length}`, {
          name: f.name,
          size: f.size,
          type: f.type,
        });
        try {
          const base64 = await compressAndToBase64(f);
          console.log(`[UPDATE UNIT] Step 2b: Compressed, base64 length=${base64?.length ?? 0}`);
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data: base64,
              filename: `unit-${editingUnit.id}-${Date.now()}-${i}-${Math.round(Math.random() * 1e6)}.jpg`,
            }),
          });
          const json = await res.json();
          console.log(`[UPDATE UNIT] Step 2c: Upload response ${i + 1}`, {
            status: res.status,
            ok: res.ok,
            success: json.success,
            imageUrl: json.imageUrl ? "yes" : "no",
            error: json.error,
          });
          if (json.success && json.imageUrl) {
            newUrls.push(json.imageUrl);
          } else {
            console.warn("[UPDATE UNIT] Upload failed for file", i, json);
          }
        } catch (e) {
          console.warn("[UPDATE UNIT] Upload error for file", i, e);
        }
      }

      const images = [...existing, ...newUrls];
      const propId = formData.propertyId || editingUnit.propertyId || (editingUnit as any).property_id;
      const body = {
        propertyId: propId,
        name: String(formData.name || "").trim(),
        description: String(formData.description || "").trim(),
        maxGuests: parseInt(String(formData.maxGuests), 10) || 2,
        bedrooms: parseInt(String(formData.bedrooms), 10) || 1,
        bathrooms: parseInt(String(formData.bathrooms), 10) || 1,
        basePrice: parseFloat(String(formData.basePrice)) || 100,
        cleaningFee: parseFloat(String(formData.cleaningFee)) || 0,
        minStayDays: parseInt(String(formData.minStayDays), 10) || 1,
        images,
      };

      const bodyStr = JSON.stringify(body);
      console.log("[UPDATE UNIT] Step 3: Sending PUT", {
        url: putUrl,
        bodySize: bodyStr.length,
        imagesCount: images.length,
        propertyId: propId,
      });

      const response = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
      });

      let responseData: any = {};
      try {
        const text = await response.text();
        responseData = text ? JSON.parse(text) : {};
      } catch {
        responseData = { parseError: true };
      }

      console.log("[UPDATE UNIT] Step 4: PUT response", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: responseData,
      });

      if (response.ok) {
        console.log("[UPDATE UNIT] SUCCESS");
        setShowUnitForm(false);
        setEditingUnit(null);
        fetchData();
      } else {
        console.error("[UPDATE UNIT] FAILED:", responseData);
        alert(responseData?.error || responseData?.message || t("common.error"));
      }
    } catch (error) {
      console.error("[UPDATE UNIT] EXCEPTION:", error);
      alert(t("common.error"));
    } finally {
      setUpdatingUnit(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm(t("admin.deletePropertyConfirm"))) return;
    try {
      const response = await fetch(apiUrl(`/api/admin/properties/${id}`), { method: "DELETE" });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Failed to delete property:", error);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm(t("admin.deleteUnitConfirm"))) return;
    try {
      const response = await fetch(apiUrl(`/api/admin/units/${id}`), { method: "DELETE" });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Failed to delete unit:", error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded mb-6"></div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {t("admin.propertyManagement")}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPropertyForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            {t("admin.addProperty")}
          </button>
          <button
            onClick={() => setShowUnitForm(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={16} />
            {t("admin.addUnit")}
          </button>
        </div>
      </div>

      {/* Properties List */}
      <div className="space-y-6">
        {properties.map((property) => {
          const imageUrlSrc = imageUrl(property.main_image);
          return (
          <div key={property.id} className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                <img
                  src={imageUrlSrc}
                  alt={property.name}
                  className="w-24 h-24 object-cover rounded-lg border border-border bg-muted"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = placeholderImage();
                  }}
                />
                <div>
                  <h3 className="text-lg font-bold text-foreground">{property.name}</h3>
                  <p className="text-muted-foreground">{property.location}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("admin.unitsLabel").replace("{count}", String(property.units?.length || 0))}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditProperty(property)}
                  className="btn-secondary-sm"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteProperty(property.id)}
                  className="btn-danger-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Units for this property */}
            <div className="space-y-3">
              {units
                .filter(unit => unit.propertyId === property.id)
                .map((unit) => (
                  <div key={unit.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-foreground">{unit.name}</h4>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BedDouble size={14} />
                            {t("admin.bedroomsCount").replace("{count}", String(unit.bedrooms))}
                          </span>
                          <span>{t("admin.guestsCount").replace("{count}", String(unit.maxGuests))}</span>
                          <span>{formatCurrency(unit.basePrice, language)}{t("admin.perNightSuffix")}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUnit(unit)}
                          className="btn-secondary-sm"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="btn-danger-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
      </div>

      {/* Property Form Modal */}
      {showPropertyForm && (
        <PropertyForm
          property={editingProperty}
          onSubmit={editingProperty ? handleUpdateProperty : handleCreateProperty}
          updating={updatingProperty}
          onClose={() => {
            setShowPropertyForm(false);
            setEditingProperty(null);
          }}
        />
      )}

      {/* Unit Form Modal */}
      {showUnitForm && (
        <UnitForm
          unit={editingUnit}
          propertyId={editingUnit?.propertyId || (editingUnit as any)?.property_id || selectedProperty}
          properties={properties}
          onSubmit={editingUnit ? handleUpdateUnit : handleCreateUnit}
          updating={updatingUnit}
          onClose={() => {
            setShowUnitForm(false);
            setEditingUnit(null);
            setSelectedProperty("");
          }}
          onPropertyChange={setSelectedProperty}
        />
      )}
    </div>
  );
}

// Property Form Component
function PropertyForm({ property, onSubmit, onClose, updating = false }: any) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: property?.name ?? "",
    location: property?.location ?? "",
    city: property?.city ?? "",
    country: property?.country ?? "Greece",
    mainImage: null as File | null,
    galleryImages: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-foreground mb-4">
          {property ? t("admin.editProperty") : t("admin.addNewProperty")}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.propertyName")}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.city")}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.country")}
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.locationLabel")}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              placeholder={t("admin.locationPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {property ? t("admin.mainImageKeep") : t("admin.mainImage")}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFormData({ ...formData, mainImage: file || null });
              }}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              required={!property}
            />
            {(formData.mainImage || property?.main_image) && (
              <div className="mt-2">
                <img 
                  src={formData.mainImage ? URL.createObjectURL(formData.mainImage) : imageUrl(property?.main_image)} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg border border-border"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = placeholderImage();
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-primary" disabled={updating}>
              {updating ? t("common.loading") : (property ? t("admin.updateProperty") : t("admin.createProperty"))}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={updating}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Unit Form Component
function UnitForm({ unit, propertyId, properties, onSubmit, onClose, onPropertyChange, updating = false }: any) {
  const { t } = useLanguage();
  const parseImages = (v: string | string[] | undefined): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const existingImgs = parseImages(unit?.images);
  const [formData, setFormData] = useState({
    name: unit?.name ?? "",
    description: unit?.description ?? "",
    maxGuests: unit?.maxGuests ?? 2,
    bedrooms: unit?.bedrooms ?? 1,
    bathrooms: unit?.bathrooms ?? 1,
    basePrice: unit?.basePrice ?? 100,
    cleaningFee: unit?.cleaningFee ?? 50,
    minStayDays: unit?.minStayDays ?? 1,
    imageFiles: [] as File[],
    existingImages: existingImgs,
    propertyId: propertyId ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[UNIT FORM] Submit clicked", {
      isEdit: !!unit,
      unitId: unit?.id,
      formData: {
        propertyId: formData.propertyId,
        name: formData.name,
        existingImagesCount: formData.existingImages?.length ?? 0,
        imageFilesCount: formData.imageFiles?.length ?? 0,
      },
    });
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-foreground mb-4">
          {unit ? t("admin.editUnit") : t("admin.addNewUnit")}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.property")}
            </label>
            <select
              value={propertyId}
              onChange={(e) => {
                onPropertyChange(e.target.value);
                setFormData({ ...formData, propertyId: e.target.value });
              }}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              required
            >
              <option value="">{t("admin.selectProperty")}</option>
              {properties.map((prop: any) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name}
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
              {t("admin.descriptionLabel")}
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
                {t("admin.maxGuestsLabel")}
              </label>
              <input
                type="number"
                value={formData.maxGuests}
                onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.bedroomsLabel")}
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.bathroomsLabel")}
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
            <div className="col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-md text-sm text-muted-foreground">
              Τιμές ορίζονται αυτόματα από τον Πίνακα Τιμών Δωματίων (κατάστημα Τιμές & Περίοδος).
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("admin.cleaningFeeLabel")}
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
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("admin.imagesLabel")}
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setFormData({ ...formData, imageFiles: files });
              }}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            />
            {(formData.existingImages?.length || 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.existingImages.map((url: string, i: number) => (
                  <div
                    key={`ex-${String(url)}`}
                    className="relative group cursor-grab active:cursor-grabbing border-2 border-transparent hover:border-primary/50 rounded transition-colors"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(i));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                      if (from === i) return;
                      const arr = [...formData.existingImages];
                      const [removed] = arr.splice(from, 1);
                      arr.splice(i, 0, removed);
                      setFormData({ ...formData, existingImages: arr });
                    }}
                  >
                    <img 
                      src={imageUrl(typeof url === "string" ? url : String(url))} 
                      alt="" 
                      className="w-20 h-20 object-cover rounded border pointer-events-none" 
                      draggable={false}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.src = placeholderImage();
                      }}
                    />
                    <span className="absolute top-0.5 left-0.5 bg-black/50 text-white text-[10px] px-1 rounded">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({
                          ...formData,
                          existingImages: formData.existingImages.filter((_: string, j: number) => j !== i),
                        });
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(formData.imageFiles?.length || 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.imageFiles.map((f, i) => (
                  <div
                    key={`new-${i}-${f.name}`}
                    className="relative group cursor-grab active:cursor-grabbing border-2 border-transparent hover:border-primary/50 rounded transition-colors"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(i));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                      if (from === i) return;
                      const arr = [...formData.imageFiles];
                      const [removed] = arr.splice(from, 1);
                      arr.splice(i, 0, removed);
                      setFormData({ ...formData, imageFiles: arr });
                    }}
                  >
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="w-20 h-20 object-cover rounded border pointer-events-none"
                      draggable={false}
                    />
                    <span className="absolute top-0.5 left-0.5 bg-black/50 text-white text-[10px] px-1 rounded">
                      {(formData.existingImages?.length || 0) + i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-primary" disabled={updating}>
              {updating ? t("common.loading") : (unit ? t("admin.updateUnit") : t("admin.createUnit"))}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={updating}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { apiUrl, imageUrl } from "@/lib/api";
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
        const propertiesData = await propertiesRes.json();
        const unitsData = await unitsRes.json();
        
        console.log("✅ [PROPERTIES] Properties data:", propertiesData);
        console.log("✅ [PROPERTIES] Units data:", unitsData);
        
        setProperties(propertiesData);
        setUnits(unitsData);
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
      let mainImageUrl = "https://picsum.photos/400/300?random=" + Date.now();
      
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
          if (uploadResult.success) {
            mainImageUrl = uploadResult.imageUrl;
            console.log("✅ Image uploaded:", mainImageUrl);
          }
        } else {
          console.error("❌ Image upload failed");
        }
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
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("description", formData.description);
      fd.append("location", formData.location || editingProperty.location);
      fd.append("city", formData.city);
      fd.append("country", formData.country);
      if (formData.mainImage instanceof File) fd.append("mainImage", formData.mainImage);

      const response = await fetch(apiUrl(`/api/admin/properties/${editingProperty.id}`), {
        method: "PUT",
        body: fd,
      });
      if (response.ok) {
        setShowPropertyForm(false);
        setEditingProperty(null);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update property:", error);
    }
  };

  const handleUpdateUnit = async (formData: any) => {
    if (!editingUnit) return;
    try {
      const fd = new FormData();
      fd.append("propertyId", formData.propertyId || editingUnit.propertyId);
      fd.append("name", formData.name);
      fd.append("description", formData.description || "");
      fd.append("maxGuests", String(formData.maxGuests));
      fd.append("bedrooms", String(formData.bedrooms));
      fd.append("bathrooms", String(formData.bathrooms));
      fd.append("basePrice", String(formData.basePrice));
      fd.append("cleaningFee", String(formData.cleaningFee));
      fd.append("minStayDays", String(formData.minStayDays));
      const existing = formData.existingImages || [];
      fd.append("existingImages", JSON.stringify(existing));
      (formData.imageFiles || []).forEach((f: File) => fd.append("images", f));

      const response = await fetch(apiUrl(`/api/admin/units/${editingUnit.id}`), {
        method: "PUT",
        body: fd,
      });
      if (response.ok) {
        setShowUnitForm(false);
        setEditingUnit(null);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update unit:", error);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Delete this property and all its units?")) return;
    try {
      const response = await fetch(apiUrl(`/api/admin/properties/${id}`), { method: "DELETE" });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Failed to delete property:", error);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm("Delete this unit?")) return;
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
          Property Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPropertyForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Property
          </button>
          <button
            onClick={() => setShowUnitForm(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Unit
          </button>
        </div>
      </div>

      {/* Properties List */}
      <div className="space-y-6">
        {properties.map((property) => {
          const imageUrlSrc = imageUrl(property.main_image);
          console.log(`🖼️ [IMAGE] Property: ${property.name}, Image URL: ${imageUrlSrc}`);
          
          return (
          <div key={property.id} className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                <img
                  src={imageUrlSrc}
                  alt={property.name}
                  className="w-24 h-24 object-cover rounded-lg border border-border"
                  style={{
                    backgroundColor: '#f3f4f6',
                    backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23f3f4f6" width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14">Loading...</text></svg>')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                  onError={(e: any) => {
                    console.error(`❌ [IMAGE] Failed to load: ${imageUrlSrc}`);
                    e.currentTarget.src = `https://picsum.photos/400/300?random=${property.id}&blur=2`;
                  }}
                  onLoad={(e: any) => {
                    console.log(`✅ [IMAGE] Loaded: ${property.name}`);
                    e.currentTarget.style.backgroundImage = 'none';
                  }}
                />
                <div>
                  <h3 className="text-lg font-bold text-foreground">{property.name}</h3>
                  <p className="text-muted-foreground">{property.location}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {property.units?.length || 0} units
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
                            {unit.bedrooms} bedrooms
                          </span>
                          <span>{unit.maxGuests} guests</span>
                          <span>{formatCurrency(unit.basePrice, language)}/night</span>
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
          propertyId={editingUnit?.propertyId || selectedProperty}
          properties={properties}
          onSubmit={editingUnit ? handleUpdateUnit : handleCreateUnit}
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
function PropertyForm({ property, onSubmit, onClose }: any) {
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
          {property ? "Edit Property" : "Add New Property"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Property Name
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
                City
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
                Country
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
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
              placeholder="e.g. Leonidion, Arcadia"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Main Image {property && "(leave empty to keep current)"}
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
            {(formData.mainImage || property?.mainImage) && (
              <div className="mt-2">
                <img 
                  src={formData.mainImage ? URL.createObjectURL(formData.mainImage) : imageUrl(property?.mainImage)} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg border border-border"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-primary">
              {property ? "Update Property" : "Create Property"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Unit Form Component
function UnitForm({ unit, propertyId, properties, onSubmit, onClose, onPropertyChange }: any) {
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
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-foreground mb-4">
          {unit ? "Edit Unit" : "Add New Unit"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Property
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
              <option value="">Select a property</option>
              {properties.map((prop: any) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Unit Name
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
              Description
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
                Max Guests
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
                Bedrooms
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
                Bathrooms
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
                Base Price (€/night)
              </label>
              <input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Cleaning Fee (€)
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
                Minimum Stay Days
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
              Images (multiple allowed)
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
                  <div key={i} className="relative">
                    <img 
                      src={imageUrl(url)} 
                      alt="" 
                      className="w-20 h-20 object-cover rounded border" 
                      onError={(e: any) => {
                        console.error(`❌ [UNIT IMAGE] Failed to load: ${url}`);
                        e.currentTarget.src = `https://picsum.photos/80/80?random=${i}&blur=2`;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          existingImages: formData.existingImages.filter((_: string, j: number) => j !== i),
                        })
                      }
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
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
                  <img
                    key={i}
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="w-20 h-20 object-cover rounded border"
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-primary">
              {unit ? "Update Unit" : "Create Unit"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { Router } from "express";
import { supabase } from "../lib/db";
import { getMinimumPriceForRoom, getRoomClosedStatusAndReopenDate } from "../services/price-table.service";

const router = Router();

// List all active properties with basic aggregated info
router.get("/", async (_req, res, next) => {
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!properties || properties.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const propertyIds = properties.map((p) => p.id);

    // Get units for each property
    const { data: units } = await supabase
      .from('units')
      .select('*')
      .eq('is_active', true)
      .in('property_id', propertyIds);

    // Aggregate units per property (use price table for basePrice when available)
    const aggregatedProperties = properties.map((property) => {
      const propertyUnits = units?.filter((u) => u.property_id === property.id) || [];
      const unitPrices = propertyUnits.map((u) => {
        const fromTable = getMinimumPriceForRoom(u.name);
        return fromTable ?? (Number(u.base_price) || 0);
      });
      const minPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : 0;

      // Parse unit images
      const parsedUnits = propertyUnits.map(unit => {
        let parsedImages = [];
        if (unit.images) {
          try {
            if (typeof unit.images === 'string') {
              parsedImages = JSON.parse(unit.images);
            } else if (Array.isArray(unit.images)) {
              parsedImages = unit.images;
            }
          } catch {
            parsedImages = [];
          }
        }

        const basePrice = getMinimumPriceForRoom(unit.name) ?? (Number(unit.base_price) || 0);
        const { closed: closedForCurrentPeriod, reopenDate } = getRoomClosedStatusAndReopenDate(unit.name);
        return {
          ...unit,
          images: parsedImages,
          propertyId: unit.property_id,
          maxGuests: unit.max_guests,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          basePrice,
          cleaningFee: Number(unit.cleaning_fee) || 0,
          minStayDays: unit.min_stay_days,
          isActive: unit.is_active,
          closedForCurrentPeriod,
          reopenDate,
        };
      });

      return {
        id: property.id,
        name: property.name,
        slug: property.slug,
        location: property.location,
        city: property.city,
        country: property.country,
        description: property.description,
        mainImage: property.main_image,
        galleryImages: property.gallery_images,
        isActive: property.is_active,
        createdAt: property.created_at,
        updatedAt: property.updated_at,
        units: parsedUnits, // Include parsed units with proper image arrays
        unitsCount: propertyUnits.length,
        startingFrom: minPrice, // Add startingFrom field for homepage
        _count: {
          units: propertyUnits.length,
        },
        _min: {
          basePrice: minPrice,
        },
      };
    });

    res.json({ success: true, data: aggregatedProperties });
  } catch (error) {
    next(error);
  }
});

// Get single property by slug with its units
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    const { data: units } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', property.id)
      .eq('is_active', true)
      .order('base_price', { ascending: true });

    const { data: amenities } = await supabase
      .from('amenities')
      .select('*')
      .eq('property_id', property.id);

    // Transform units to match frontend expectations (use price table for basePrice)
    const transformedUnits = (units || []).map(unit => {
      let parsedImages = [];
      if (unit.images) {
        try {
          if (typeof unit.images === 'string') {
            parsedImages = JSON.parse(unit.images);
          } else if (Array.isArray(unit.images)) {
            parsedImages = unit.images;
          }
        } catch (error) {
          console.log("⚠️ [PROPERTIES] Failed to parse images for unit:", unit.id, error);
          parsedImages = [];
        }
      }
      const basePrice = getMinimumPriceForRoom(unit.name) ?? (Number(unit.base_price) || 0);
      return {
        ...unit,
        images: parsedImages,
        propertyId: unit.property_id,
        maxGuests: unit.max_guests,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        basePrice,
        cleaningFee: Number(unit.cleaning_fee) || 0,
        minStayDays: unit.min_stay_days || 1,
        isActive: unit.is_active
      };
    });

    const result = {
      ...property,
      units: transformedUnits,
      amenities: amenities || [],
    };

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get single property by ID
router.get("/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error || !property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    
    // Get units for this property
    const { data: units } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', id)
      .eq('is_active', true)
      .order('base_price', { ascending: true });
    
    // Get amenities for this property
    const { data: amenities } = await supabase
      .from('amenities')
      .select('*')
      .eq('property_id', id);
    
    // Get reviews for this property
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        *,
        user:users(first_name, last_name)
      `)
      .eq('booking_id', 'in (SELECT id FROM bookings WHERE unit_id IN (SELECT id FROM units WHERE property_id = ' + id + '))');
    
    // Transform data for frontend
    const transformedProperty = {
      ...property,
      // Handle gallery_images - it's already an array in your database
      gallery_images: property.gallery_images || [],
      // Transform units to match frontend expectations
      units: (units || []).map(unit => {
        let parsedImages = [];
        if (unit.images) {
          try {
            if (typeof unit.images === 'string') {
              parsedImages = JSON.parse(unit.images);
            } else if (Array.isArray(unit.images)) {
              parsedImages = unit.images;
            }
          } catch {
            parsedImages = [];
          }
        }
        const basePrice = getMinimumPriceForRoom(unit.name) ?? (Number(unit.base_price) || 0);
        const { closed: closedForCurrentPeriod, reopenDate } = getRoomClosedStatusAndReopenDate(unit.name);
        return {
          ...unit,
          images: parsedImages,
          propertyId: property.id,
          maxGuests: unit.max_guests,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          basePrice,
          cleaningFee: Number(unit.cleaning_fee) || 0,
          minStayDays: unit.min_stay_days || 1,
          isActive: unit.is_active,
          closedForCurrentPeriod,
          reopenDate,
        };
      }),
      amenities: amenities || [],
      reviews: (reviews || []).map(review => ({
        ...review,
        userName: review.user ? `${review.user.first_name} ${review.user.last_name}` : 'Anonymous'
      }))
    };
    
    res.json({ 
      success: true, 
      data: transformedProperty
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch property" });
  }
});

export default router;
export const propertiesRouter = router;

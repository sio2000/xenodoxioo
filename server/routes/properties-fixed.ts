import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/db";

const router = Router();

// ========================================
// FIXED PROPERTY ROUTES WITH PROPER RELATIONS
// ========================================

// Get all active properties with units and amenities
router.get("/", async (req, res) => {
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        *,
        units:units(
          id,
          name,
          slug,
          description,
          max_guests,
          bedrooms,
          bathrooms,
          base_price,
          cleaning_fee,
          images,
          min_stay_days,
          is_active
        ),
        amenities:amenities(
          id,
          name,
          description,
          icon
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ [PROPERTIES] Error fetching properties:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch properties" });
    }

    // Transform data for frontend
    const transformedProperties = properties?.map(property => ({
      ...property,
      units: property.units?.filter(unit => unit.is_active) || [],
      amenities: property.amenities || [],
      // Handle image arrays
      gallery_images: property.gallery_images ? 
        (typeof property.gallery_images === 'string' ? JSON.parse(property.gallery_images) : property.gallery_images) 
        : []
    })) || [];

    res.json(transformedProperties);
  } catch (error) {
    console.error("❌ [PROPERTIES] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch properties" });
  }
});

// Get single property by ID with full relations
router.get("/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        units:units(
          id,
          name,
          slug,
          description,
          max_guests,
          bedrooms,
          bathrooms,
          beds,
          base_price,
          cleaning_fee,
          images,
          min_stay_days,
          is_active,
          created_at,
          updated_at
        ),
        amenities:amenities(
          id,
          name,
          description,
          icon,
          created_at
        ),
        reviews:reviews(
          id,
          rating,
          comment,
          created_at,
          user:users(
            first_name,
            last_name
          )
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !property) {
      console.error("❌ [PROPERTIES] Property not found:", error);
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // Transform data for frontend
    const transformedProperty = {
      ...property,
      // Handle image arrays properly
      gallery_images: property.gallery_images ? 
        (typeof property.gallery_images === 'string' ? JSON.parse(property.gallery_images) : property.gallery_images) 
        : [],
      // Transform units
      units: property.units?.map(unit => ({
        ...unit,
        images: unit.images ? 
          (typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images) 
          : [],
        propertyId: property.id,
        maxGuests: unit.max_guests,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        basePrice: unit.base_price,
        cleaningFee: unit.cleaning_fee,
        minStayDays: unit.min_stay_days,
        isActive: unit.is_active
      })) || [],
      // Transform amenities
      amenities: property.amenities || [],
      // Transform reviews
      reviews: property.reviews?.map(review => ({
        ...review,
        userName: review.user ? `${review.user.first_name} ${review.user.last_name}` : 'Anonymous'
      })) || []
    };

    res.json({ success: true, data: transformedProperty });
  } catch (error) {
    console.error("❌ [PROPERTIES] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch property" });
  }
});

// Get single property by slug with full relations
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        units:units(
          id,
          name,
          slug,
          description,
          max_guests,
          bedrooms,
          bathrooms,
          beds,
          base_price,
          cleaning_fee,
          images,
          min_stay_days,
          is_active
        ),
        amenities:amenities(
          id,
          name,
          description,
          icon
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // Transform data for frontend
    const transformedProperty = {
      ...property,
      gallery_images: property.gallery_images ? 
        (typeof property.gallery_images === 'string' ? JSON.parse(property.gallery_images) : property.gallery_images) 
        : [],
      units: property.units?.map(unit => ({
        ...unit,
        images: unit.images ? 
          (typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images) 
          : [],
        propertyId: property.id,
        maxGuests: unit.max_guests,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        basePrice: unit.base_price,
        cleaningFee: unit.cleaning_fee,
        minStayDays: unit.min_stay_days,
        isActive: unit.is_active
      })) || [],
      amenities: property.amenities || []
    };

    res.json({ success: true, data: transformedProperty });
  } catch (error) {
    console.error("❌ [PROPERTIES] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch property" });
  }
});

// FIXED: Get property availability for date range
router.get("/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: "Check-in and check-out dates required" });
    }

    // Get property with units
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        units:units(
          id,
          name,
          max_guests,
          base_price,
          is_active
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // Check availability for each unit
    const availabilityPromises = property.units?.map(async (unit) => {
      // Check for conflicting bookings
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('unit_id', unit.id)
        .neq('status', 'CANCELLED')
        .or(`check_in_date.lt.${checkOut},check_out_date.gt.${checkIn}`);

      const isAvailable = !conflictingBookings || conflictingBookings.length === 0;
      
      return {
        ...unit,
        isAvailable,
        maxGuests: unit.max_guests,
        basePrice: unit.base_price
      };
    }) || [];

    const unitsWithAvailability = await Promise.all(availabilityPromises);

    res.json({ 
      success: true, 
      data: {
        property: {
          id: property.id,
          name: property.name
        },
        units: unitsWithAvailability
      }
    });
  } catch (error) {
    console.error("❌ [PROPERTIES] Availability check error:", error);
    res.status(500).json({ success: false, message: "Failed to check availability" });
  }
});

// FIXED: Get property pricing for date range
router.get("/:id/pricing", async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, guests } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: "Check-in and check-out dates required" });
    }

    // Get seasonal pricing for property
    const { data: seasonalPricing } = await supabase
      .from('seasonal_pricing')
      .select('*')
      .eq('property_id', id)
      .or(`start_date.lte.${checkOut},end_date.gte.${checkIn}`);

    // Get tax settings
    const { data: taxSettings } = await supabase
      .from('tax_settings')
      .select('tax_rate')
      .eq('is_active', true)
      .single();

    const taxRate = taxSettings?.tax_rate || 0.15;

    res.json({ 
      success: true, 
      data: {
        seasonalPricing: seasonalPricing || [],
        taxRate: Math.round(taxRate * 100) // Return as percentage
      }
    });
  } catch (error) {
    console.error("❌ [PROPERTIES] Pricing error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch pricing" });
  }
});

export default router;

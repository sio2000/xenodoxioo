import { Router } from "express";
import { supabase } from "../lib/db";

const router = Router();

// List all active units with their parent property
router.get("/", async (_req, res, next) => {
  try {
    const { data: units } = await supabase
      .from('units')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!units) {
      return res.json({ success: true, data: [] });
    }

    // Transform the data to match the expected interface
    const transformedUnits = units?.map(unit => {
      // Parse images JSON string to array
      let parsedImages = [];
      if (unit.images) {
        try {
          if (typeof unit.images === 'string') {
            parsedImages = JSON.parse(unit.images);
          } else if (Array.isArray(unit.images)) {
            parsedImages = unit.images;
          }
        } catch (error) {
          console.log("⚠️ [UNITS] Failed to parse images for unit:", unit.id, error);
          parsedImages = [];
        }
      }

      return {
        ...unit,
        propertyId: unit.property_id,
        maxGuests: unit.max_guests,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        basePrice: Number(unit.base_price) || 0,
        cleaningFee: Number(unit.cleaning_fee) || 0,
        images: parsedImages, // Use parsed array instead of JSON string
        minStayDays: unit.min_stay_days || 1,
        isActive: unit.is_active
      };
    }) || [];

    res.json({ success: true, data: transformedUnits });
  } catch (error) {
    next(error);
  }
});

// Get single unit by slug
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { data: unit } = await supabase
      .from('units')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    // Parse images JSON string to array
    let parsedImages = [];
    if (unit.images) {
      try {
        if (typeof unit.images === 'string') {
          parsedImages = JSON.parse(unit.images);
        } else if (Array.isArray(unit.images)) {
          parsedImages = unit.images;
        }
      } catch (error) {
        console.log("⚠️ [UNITS] Failed to parse images for unit:", unit.id, error);
        parsedImages = [];
      }
    }

    // Transform the data to match the expected interface
    const transformedUnit = {
      ...unit,
      propertyId: unit.property_id,
      maxGuests: unit.max_guests,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      basePrice: unit.base_price || 0, // Ensure basePrice is never undefined/null
      cleaningFee: unit.cleaning_fee || 0,
      images: parsedImages,
      minStayDays: unit.min_stay_days || 1,
      isActive: unit.is_active
    };

    res.json({ success: true, data: transformedUnit });
  } catch (error) {
    next(error);
  }
});

export default router;
export const unitsRouter = router;

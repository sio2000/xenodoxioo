import { Router } from "express";
import { supabase } from "../lib/db";

const router = Router();

// ========================================
// FIXED ADMIN ROUTES WITH PROPER ERROR HANDLING
// ========================================

// Admin Stats - Fixed with proper joins
router.get("/stats", async (req, res) => {
  try {
    console.log("🔍 [ADMIN] Fetching stats from Supabase...");
    
    // Get total bookings with proper joins
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        total_price,
        unit:units(
          id,
          property_id,
          property:properties(
            id,
            name
          )
        )
      `);

    if (bookingsError) {
      console.error("❌ [ADMIN] Bookings error:", bookingsError);
      return res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error("❌ [ADMIN] Users error:", usersError);
      return res.status(500).json({ success: false, message: "Failed to fetch users" });
    }

    // Get properties with unit counts
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        units:units(id)
      `)
      .eq('is_active', true);

    if (propertiesError) {
      console.error("❌ [ADMIN] Properties error:", propertiesError);
      return res.status(500).json({ success: false, message: "Failed to fetch properties" });
    }

    // Calculate stats
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === 'CONFIRMED').length || 0;
    const pendingBookings = bookings?.filter(b => b.status === 'PENDING').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'CANCELLED').length || 0;
    const totalRevenue = bookings?.filter(b => b.status === 'COMPLETED').reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
    const propertiesCount = properties?.length || 0;

    // Calculate occupancy by property
    const occupancyByProperty = properties?.map(property => ({
      id: property.id,
      name: property.name,
      units: property.units?.length || 0,
      occupancyPercentage: 0 // TODO: Calculate actual occupancy
    })) || [];

    const stats = {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue,
      totalUsers: totalUsers || 0,
      propertiesCount,
      occupancyByProperty,
      activeUsers: 0 // TODO: Calculate based on last_login
    };

    console.log("✅ [ADMIN] Stats calculated:", stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ [ADMIN] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// ========================================
// FIXED TAX SETTINGS WITH DATABASE PERSISTENCE
// ========================================

router.get("/settings/tax", async (req, res) => {
  try {
    console.log("🔍 [SETTINGS] Fetching tax settings...");
    
    const { data: taxSettings, error } = await supabase
      .from('tax_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error("❌ [SETTINGS] Tax settings error:", error);
      return res.status(500).json({ taxRate: 15, additionalFees: 0 });
    }

    const response = taxSettings ? {
      taxRate: Math.round(taxSettings.tax_rate * 100), // Convert to percentage
      additionalFees: taxSettings.additional_fees || 0
    } : {
      taxRate: 15,
      additionalFees: 0
    };

    console.log("✅ [SETTINGS] Tax settings fetched:", response);
    res.json(response);
  } catch (error) {
    console.error("❌ [SETTINGS] Failed to fetch tax settings:", error);
    res.status(500).json({ taxRate: 15, additionalFees: 0 });
  }
});

router.post("/settings/tax", async (req, res) => {
  try {
    const { taxRate, additionalFees } = req.body;
    console.log("🔍 [SETTINGS] Saving tax settings:", { taxRate, additionalFees });
    
    const taxRateDecimal = taxRate / 100; // Convert percentage to decimal
    
    // Update existing or insert new
    const { data, error } = await supabase
      .from('tax_settings')
      .upsert({
        tax_rate: taxRateDecimal,
        additional_fees: additionalFees || 0,
        is_active: true,
        description: `Tax rate set to ${taxRate}%`
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [SETTINGS] Failed to save tax settings:", error);
      return res.status(500).json({ success: false, message: "Failed to save tax settings" });
    }

    console.log("✅ [SETTINGS] Tax settings saved:", data);
    res.json({ 
      success: true, 
      taxRate, 
      additionalFees: additionalFees || 0 
    });
  } catch (error) {
    console.error("❌ [SETTINGS] Failed to save tax settings:", error);
    res.status(500).json({ success: false, message: "Failed to save tax settings" });
  }
});

// ========================================
// FIXED UNIT CREATION WITH PROPER FORMDATA PARSING
// ========================================

router.post("/units", async (req, res) => {
  try {
    console.log("🔍 [UNITS] Raw request body:", req.body);
    console.log("🔍 [UNITS] Request files:", req.files);
    
    let unitData;
    
    // Enhanced FormData parsing with better detection
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      // Check if it's FormData by looking for specific FormData patterns
      const bodyKeys = Object.keys(req.body);
      const hasFormDataKeys = bodyKeys.includes('propertyId') || bodyKeys.includes('name') || bodyKeys.includes('maxGuests');
      
      if (hasFormDataKeys) {
        // Parse FormData with proper type conversion
        unitData = {
          propertyId: req.body.propertyId,
          name: req.body.name,
          description: req.body.description || "",
          maxGuests: parseInt(req.body.maxGuests) || 2,
          bedrooms: parseInt(req.body.bedrooms) || 1,
          bathrooms: parseInt(req.body.bathrooms) || 1,
          basePrice: parseFloat(req.body.basePrice) || 100,
          cleaningFee: parseFloat(req.body.cleaningFee) || 0,
          minStayDays: parseInt(req.body.minStayDays) || 1,
          images: []
        };
        console.log("🔍 [UNITS] Parsed FormData:", unitData);
      } else {
        // JSON data
        unitData = req.body;
        console.log("🔍 [UNITS] Using JSON data:", unitData);
      }
    } else {
      unitData = req.body;
    }
    
    // Enhanced validation
    if (!unitData || !unitData.propertyId || !unitData.name) {
      console.error("❌ [UNITS] Missing required fields:", { 
        hasUnitData: !!unitData, 
        hasPropertyId: !!unitData?.propertyId, 
        hasName: !!unitData?.name 
      });
      return res.status(400).json({ 
        success: false, 
        message: "Missing propertyId or unit data or name" 
      });
    }
    
    // Generate slug properly
    const slug = unitData.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50); // Limit length
    
    // Transform for database
    const dbUnitData = {
      property_id: unitData.propertyId,
      name: unitData.name,
      slug: slug || `unit-${Date.now()}`,
      description: unitData.description || "",
      max_guests: unitData.maxGuests,
      bedrooms: unitData.bedrooms,
      bathrooms: unitData.bathrooms,
      beds: unitData.bedrooms,
      base_price: unitData.basePrice,
      cleaning_fee: unitData.cleaningFee || 0,
      images: unitData.images && unitData.images.length > 0 ? JSON.stringify(unitData.images) : '{}',
      min_stay_days: unitData.minStayDays || 1,
      is_active: true
    };
    
    console.log("🔍 [UNITS] Database data:", dbUnitData);
    
    const { data: unit, error } = await supabase
      .from('units')
      .insert(dbUnitData)
      .select(`
        *,
        property:properties(*)
      `)
      .single();

    if (error) {
      console.error("❌ [UNITS] Supabase error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    // Transform response for frontend
    const transformedUnit = {
      ...unit,
      propertyId: unit.property_id,
      maxGuests: unit.max_guests,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      basePrice: unit.base_price,
      cleaningFee: unit.cleaning_fee,
      images: unit.images,
      minStayDays: unit.min_stay_days,
      isActive: unit.is_active
    };

    console.log("✅ [UNITS] Unit created successfully:", transformedUnit);
    res.json({ success: true, data: transformedUnit });
  } catch (error) {
    console.error("❌ [UNITS] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to create unit" });
  }
});

export default router;

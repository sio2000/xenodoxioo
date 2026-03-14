import { Router } from "express";
import { supabase } from "../lib/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getCurrentPeriod, getUpcomingPeriods } from "../services/price-table.service";

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for unit creation with disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Stub admin routes - TODO: Implement with Supabase
router.post("/login", async (req, res) => {
  res.json({ success: false, message: "Admin login not implemented yet" });
});

router.get("/stats", async (req, res) => {
  try {
    console.log("🔍 [ADMIN] Fetching stats from Supabase...");
    
    // Get total bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*');
    
    // Get total users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    // Get properties with units
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        *,
        units:units(*)
      `);
    
    if (bookingsError || usersError || propertiesError) {
      console.error("❌ [ADMIN] Database errors:", { bookingsError, usersError, propertiesError });
      throw new Error("Database query failed");
    }
    
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === 'CONFIRMED').length || 0;
    const pendingBookings = bookings?.filter(b => b.status === 'PENDING').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'CANCELLED').length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + (parseFloat(b.total_paid) || 0), 0) || 0;
    const totalUsers = users?.length || 0;
    const propertiesCount = properties?.length || 0;
    
    // Monthly occupancy by property — current month: booked days / total days in month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

    const occupancyByProperty = properties?.map(property => {
      const units = property.units || [];
      const totalUnits = units.length;
      const bookedDatesByUnit = new Map<string, Set<string>>();

      units.forEach((u: { id: string }) => {
        bookedDatesByUnit.set(u.id, new Set());
      });

      const confirmedBookings = bookings?.filter((b: { status: string }) => b.status === 'CONFIRMED') || [];
      confirmedBookings.forEach((booking: { unit_id: string; check_in_date: string; check_out_date: string }) => {
        const unitSet = bookedDatesByUnit.get(booking.unit_id);
        if (!unitSet) return;

        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        const start = new Date(Math.max(checkIn.getTime(), monthStart.getTime()));
        const end = new Date(Math.min(checkOut.getTime(), monthEnd.getTime() + 86400000));

        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          unitSet.add(toDateKey(d));
        }
      });

      let totalBookedDays = 0;
      bookedDatesByUnit.forEach(set => { totalBookedDays += set.size; });
      const totalUnitDays = totalUnits * daysInMonth;
      const occupancyPercentage = totalUnitDays > 0 ? Math.round((totalBookedDays / totalUnitDays) * 100) : 0;

      return {
        id: property.id,
        name: property.name,
        units: totalUnits,
        occupancyPercentage,
        bookedDays: totalBookedDays,
        daysInMonth
      };
    }) || [];
    
    const stats = {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue,
      totalUsers,
      propertiesCount,
      occupancyByProperty,
      activeUsers: users?.filter(u => u.status === 'ACTIVE').length || 0
    };
    
    console.log("✅ [ADMIN] Stats calculated:", stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ [ADMIN] Failed to fetch stats:", error);
    res.status(500).json({ 
      totalBookings: 0,
      confirmedBookings: 0,
      pendingBookings: 0,
      cancelledBookings: 0,
      totalRevenue: 0,
      totalUsers: 0,
      propertiesCount: 0,
      occupancyByProperty: [],
      activeUsers: 0
    });
  }
});

// ── Τιμές & Περίοδος (Prices & Period) ───────────────────────────────
// Returns current period, room prices, and upcoming periods from price table

router.get("/prices-and-period", async (_req, res, next) => {
  try {
    const current = getCurrentPeriod();
    const upcoming = getUpcomingPeriods();
    res.json({
      success: true,
      data: {
        currentPeriod: current
          ? {
              label: current.period.label,
              roomPrices: current.roomPrices,
            }
          : null,
        upcomingPeriods: upcoming,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Admin Properties Management
router.get("/properties", async (req, res) => {
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select(`
        *,
        units:units(*)
      `)
      .order('created_at', { ascending: false });

    // Transform the data to match the expected interface
    const transformedProperties = properties?.map(property => ({
      ...property,
      main_image: property.main_image,
      gallery_images: property.gallery_images,
      is_active: property.is_active,
      units: property.units?.map(unit => ({
        ...unit,
        propertyId: unit.property_id,
        maxGuests: unit.max_guests,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        beds: unit.beds,
        basePrice: unit.base_price
      })) || []
    })) || [];

    res.json(transformedProperties);
  } catch (error) {
    console.error("❌ [PROPERTIES] Failed to fetch properties:", error);
    res.status(500).json([]);
  }
});

router.post("/properties", async (req, res) => {
  try {
    const propertyData = req.body;
    console.log("🔍 Creating property with data:", propertyData);
    
    if (!propertyData) {
      return res.status(400).json({ success: false, message: "No data provided", data: null });
    }
    
    // Generate unique slug (handle Greek characters)
    let baseSlug = propertyData.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0370-\u03FF\u1F00-\u1FFF\-]/g, '') // Keep Greek letters, numbers, letters, hyphens
      .replace(/α/g, 'a').replace(/ά/g, 'a')
      .replace(/β/g, 'b').replace(/γ/g, 'g').replace(/δ/g, 'd')
      .replace(/ε/g, 'e').replace(/έ/g, 'e')
      .replace(/ζ/g, 'z').replace(/η/g, 'i').replace(/ή/g, 'i')
      .replace(/θ/g, 'th').replace(/ι/g, 'i').replace(/ί/g, 'i').replace(/ϊ/g, 'i').replace(/ΐ/g, 'i')
      .replace(/κ/g, 'k').replace(/λ/g, 'l').replace(/μ/g, 'm')
      .replace(/ν/g, 'n').replace(/ξ/g, 'x').replace(/ο/g, 'o').replace(/ό/g, 'o')
      .replace(/π/g, 'p').replace(/ρ/g, 'r').replace(/σ/g, 's').replace(/ς/g, 's')
      .replace(/τ/g, 't').replace(/υ/g, 'y').replace(/ύ/g, 'y').replace(/ϋ/g, 'y').replace(/ΰ/g, 'y')
      .replace(/φ/g, 'f').replace(/χ/g, 'ch').replace(/ψ/g, 'ps').replace(/ω/g, 'o').replace(/ώ/g, 'o');
    
    // If slug is empty after cleaning (including encoding issues), use timestamp
    if (!baseSlug || baseSlug.length === 0 || baseSlug.includes('?')) {
      baseSlug = `property-${Date.now()}`;
    }
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists and generate unique one
    while (true) {
      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existing) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Convert gallery_images from string to array if needed
    if (propertyData.gallery_images) {
      if (typeof propertyData.gallery_images === 'string') {
        try {
          propertyData.gallery_images = JSON.parse(propertyData.gallery_images);
        } catch (e) {
          propertyData.gallery_images = [];
        }
      }
    } else {
      propertyData.gallery_images = [];
    }
    
    // Add the unique slug
    propertyData.slug = slug;
    
    // Add default main_image if not provided
    if (!propertyData.main_image) {
      propertyData.main_image = '';
    }
    
    const { data: property, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ success: false, message: error.message, data: null });
    }

    console.log("✅ Property created:", property);
    res.json({ success: true, data: property });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Failed to create property", data: null });
  }
});

router.put("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const { data: property } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    res.json({ success: true, data: property });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update property" });
  }
});

router.delete("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, message: "Failed to delete property" });
    }

    res.json({ success: true, message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete property" });
  }
});

// Admin Coupons Management - FIXED
router.get("/coupons", async (req, res) => {
  try {
    console.log("🔍 [COUPONS] Fetching coupons...");
    
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ [COUPONS] Error fetching coupons:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch coupons" });
    }

    // Transform coupons data to match frontend expectations
    const transformedCoupons = coupons?.map(coupon => ({
      ...coupon,
      discountValue: coupon.discount_value || 0, // Ensure discountValue is never undefined
      discountType: coupon.discount_type,
      validFrom: coupon.valid_from,
      validUntil: coupon.valid_until,
      minBookingAmount: coupon.min_booking_amount,
      maxUses: coupon.max_uses,
      usedCount: coupon.used_count,
      isActive: coupon.is_active
    })) || [];

    console.log("✅ [COUPONS] Coupons fetched:", transformedCoupons?.length || 0);
    res.json({ success: true, data: transformedCoupons });
  } catch (error) {
    console.error("❌ [COUPONS] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch coupons" });
  }
});

router.post("/coupons", async (req, res) => {
  try {
    const couponData = req.body;
    console.log("🔍 [COUPONS] Creating coupon:", couponData);
    
    // Support both camelCase (frontend) and snake_case (database) field names
    const code = couponData.code;
    const description = couponData.description;
    const discountType = couponData.discountType || couponData.discount_type;
    const discountValue = couponData.discountValue || couponData.discount_value;
    const validFrom = couponData.validFrom || couponData.valid_from;
    const validUntil = couponData.validUntil || couponData.valid_until;
    const minBookingAmount = couponData.minBookingAmount || couponData.min_booking_amount;
    const maxUses = couponData.maxUses || couponData.max_uses;
    const isActive = couponData.isActive !== undefined ? couponData.isActive : couponData.is_active;
    
    // Validate required fields
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required coupon fields: code, discountType, discountValue" 
      });
    }
    
    // Check for duplicate codes
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "Coupon code already exists" 
      });
    }
    
    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({
        code: code.toUpperCase(),
        description: description || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        valid_from: validFrom,
        valid_until: validUntil,
        min_booking_amount: minBookingAmount ? parseFloat(minBookingAmount) : null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        used_count: 0,
        is_active: isActive !== undefined ? isActive : true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [COUPONS] Supabase error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    console.log("✅ [COUPONS] Coupon created:", coupon);
    
    // Transform response to match frontend expectations
    const transformedCoupon = {
      ...coupon,
      discountValue: coupon.discount_value || 0,
      discountType: coupon.discount_type,
      validFrom: coupon.valid_from,
      validUntil: coupon.valid_until,
      minBookingAmount: coupon.min_booking_amount,
      maxUses: coupon.max_uses,
      usedCount: coupon.used_count,
      isActive: coupon.is_active
    };
    
    res.json({ success: true, data: transformedCoupon });
  } catch (error) {
    console.error("❌ [COUPONS] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to create coupon" });
  }
});

router.put("/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log("🔍 [COUPONS] Updating coupon:", id, updateData);
    
    // Prepare update data - support both camelCase (frontend) and snake_case (database)
    const dbUpdateData: any = {};
    if (updateData.code) dbUpdateData.code = updateData.code.toUpperCase();
    if (updateData.description !== undefined) dbUpdateData.description = updateData.description;
    if (updateData.discountType || updateData.discount_type) dbUpdateData.discount_type = updateData.discountType || updateData.discount_type;
    if (updateData.discountValue !== undefined || updateData.discount_value !== undefined) {
      const value = updateData.discountValue !== undefined ? updateData.discountValue : updateData.discount_value;
      dbUpdateData.discount_value = parseFloat(value);
    }
    if (updateData.validFrom || updateData.valid_from) dbUpdateData.valid_from = updateData.validFrom || updateData.valid_from;
    if (updateData.validUntil || updateData.valid_until) dbUpdateData.valid_until = updateData.validUntil || updateData.valid_until;
    if (updateData.minBookingAmount !== undefined || updateData.min_booking_amount !== undefined) {
      const value = updateData.minBookingAmount !== undefined ? updateData.minBookingAmount : updateData.min_booking_amount;
      dbUpdateData.min_booking_amount = value ? parseFloat(value) : null;
    }
    if (updateData.maxUses !== undefined || updateData.max_uses !== undefined) {
      const value = updateData.maxUses !== undefined ? updateData.maxUses : updateData.max_uses;
      dbUpdateData.max_uses = value ? parseInt(value) : null;
    }
    if (updateData.isActive !== undefined || updateData.is_active !== undefined) dbUpdateData.is_active = updateData.isActive !== undefined ? updateData.isActive : updateData.is_active;
    
    const { data: coupon, error } = await supabase
      .from('coupons')
      .update(dbUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("❌ [COUPONS] Update error:", error);
      return res.status(500).json({ success: false, message: "Failed to update coupon" });
    }

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    console.log("✅ [COUPONS] Coupon updated:", coupon);
    
    // Transform response to match frontend expectations
    const transformedCoupon = {
      ...coupon,
      discountValue: coupon.discount_value || 0,
      discountType: coupon.discount_type,
      validFrom: coupon.valid_from,
      validUntil: coupon.valid_until,
      minBookingAmount: coupon.min_booking_amount,
      maxUses: coupon.max_uses,
      usedCount: coupon.used_count,
      isActive: coupon.is_active
    };
    
    res.json({ success: true, data: transformedCoupon });
  } catch (error) {
    console.error("❌ [COUPONS] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to update coupon" });
  }
});

router.delete("/coupons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 [COUPONS] Deleting coupon:", id);
    
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("❌ [COUPONS] Delete error:", error);
      return res.status(500).json({ success: false, message: "Failed to delete coupon" });
    }

    console.log("✅ [COUPONS] Coupon deleted");
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("❌ [COUPONS] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to delete coupon" });
  }
});

// Coupon validation endpoint for checkout
router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, unitId, checkInDate, checkOutDate, guests } = req.body;
    console.log("🔍 [COUPONS] Validating coupon:", { code, unitId, checkInDate, checkOutDate, guests });
    
    if (!code) {
      console.log("❌ [COUPONS] No code provided");
      return res.status(400).json({ 
        success: false, 
        message: "Coupon code is required" 
      });
    }
    
    // Find the coupon
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();
    
    console.log("🔍 [COUPONS] Coupon lookup result:", { coupon, error });
    
    if (error || !coupon) {
      console.log("❌ [COUPONS] Coupon not found:", error);
      return res.status(404).json({ 
        success: false, 
        message: "Invalid coupon code" 
      });
    }
    
    // Check if coupon is still valid
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);
    
    console.log("🔍 [COUPONS] Date validation:", { 
      now: now.toISOString(), 
      validFrom: validFrom.toISOString(), 
      validUntil: validUntil.toISOString(),
      nowHours: now.getHours(),
      validFromHours: validFrom.getHours()
    });
    
    // Adjust for timezone - if coupon was created today, allow it to be used immediately
    const today = new Date();
    const couponCreatedDate = new Date(coupon.created_at);
    const isCouponCreatedToday = today.toDateString() === couponCreatedDate.toDateString();
    
    let isValidDate = true;
    if (!isCouponCreatedToday) {
      // For older coupons, check normal date range
      isValidDate = now >= validFrom && now <= validUntil;
    } else {
      // For today's coupons, only check if it's not past the end date
      isValidDate = now <= validUntil;
    }
    
    if (!isValidDate) {
      console.log("❌ [COUPONS] Coupon expired", { isCouponCreatedToday });
      return res.status(400).json({ 
        success: false, 
        message: "Coupon has expired" 
      });
    }
    
    // Check usage limits
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      console.log("❌ [COUPONS] Usage limit reached");
      return res.status(400).json({ 
        success: false, 
        message: "Coupon usage limit reached" 
      });
    }
    
    // If we have booking details, calculate the total amount
    let totalAmount = 0;
    if (unitId && checkInDate && checkOutDate) {
      try {
        // Get the unit details
        const { data: unit } = await supabase
          .from('units')
          .select('*')
          .eq('id', unitId)
          .single();
        
        console.log("🔍 [COUPONS] Unit data:", unit);
        
        if (unit) {
          // Calculate nights
          const checkIn = new Date(checkInDate);
          const checkOut = new Date(checkOutDate);
          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log("🔍 [COUPONS] Booking calculation:", { 
            basePrice: unit.base_price, 
            cleaningFee: unit.cleaning_fee, 
            nights 
          });
          
          if (nights > 0) {
            // Calculate base amount
            totalAmount = (unit.base_price || 0) * nights + (unit.cleaning_fee || 0);
          }
        }
      } catch (error) {
        console.error("❌ [COUPONS] Error calculating booking amount:", error);
        // Continue with 0 amount if calculation fails
      }
    }
    
    console.log("🔍 [COUPONS] Total amount calculated:", totalAmount);
    
    // Check minimum booking amount
    if (coupon.min_booking_amount && totalAmount > 0 && totalAmount < coupon.min_booking_amount) {
      console.log("❌ [COUPONS] Minimum booking amount not met");
      return res.status(400).json({ 
        success: false, 
        message: `Minimum booking amount of ${coupon.min_booking_amount}€ required` 
      });
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (totalAmount > 0) {
      const discountValue = parseFloat(coupon.discount_value); // Convert string to number
      console.log("🔍 [COUPONS] Discount calculation:", { 
        discountType: coupon.discount_type, 
        discountValue, 
        totalAmount 
      });
      
      if (coupon.discount_type === 'PERCENTAGE') {
        discountAmount = (totalAmount * discountValue) / 100;
      } else if (coupon.discount_type === 'FIXED') {
        discountAmount = discountValue;
      }
      
      // Ensure discount doesn't exceed amount
      discountAmount = Math.min(discountAmount, totalAmount);
    }
    
    console.log("✅ [COUPONS] Coupon validated:", { 
      code: coupon.code, 
      totalAmount,
      discountAmount,
      type: coupon.discount_type 
    });
    
    res.json({ 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: parseFloat(coupon.discount_value),
        discountAmount,
        validFrom: coupon.valid_from,
        validUntil: coupon.valid_until
      }
    });
  } catch (error) {
    console.error("❌ [COUPONS] Validation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to validate coupon" 
    });
  }
});

// Admin Bookings Management
router.get("/bookings", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, search } = req.query;
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        unit:units(*, property:properties(*)),
        user:users(*)
      `);

    // Apply status filter if provided
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`booking_number.ilike.%${search}%,guest_name.ilike.%${search}%,guest_email.ilike.%${search}%`);
    }

    const { data: bookings, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ [BOOKINGS] Database error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }

    // Transform bookings data to match frontend expectations
    const transformedBookings = bookings?.map(booking => ({
      id: booking.id,
      bookingNumber: booking.booking_number,
      unit: {
        id: booking.unit?.id,
        name: booking.unit?.name || 'Unknown Unit',
        property: {
          id: booking.unit?.property_id || booking.unit?.property?.id,
          name: booking.unit?.property?.name || 'Unknown Property'
        }
      },
      user: booking.user ? {
        id: booking.user.id,
        email: booking.user.email,
        firstName: booking.user.first_name,
        lastName: booking.user.last_name
      } : null,
      // Use guest info when user is null
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      guestPhone: booking.guest_phone,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      nights: booking.nights,
      guests: booking.guests,
      totalPrice: parseFloat(booking.total_price) || 0,
      totalPaid: parseFloat(booking.total_paid) || 0,
      remainingAmount: parseFloat(booking.remaining_amount) || 0,
      depositAmount: parseFloat(booking.deposit_amount) || 0,
      paymentType: booking.payment_type || "FULL",
      scheduledChargeDate: booking.scheduled_charge_date || null,
      status: booking.status,
      paymentStatus: booking.payment_status,
      createdAt: booking.created_at
    })) || [];

    // Calculate pagination
    const totalItems = transformedBookings.length;
    const totalPages = Math.ceil(totalItems / parseInt(pageSize as string));
    const startIndex = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const endIndex = startIndex + parseInt(pageSize as string);
    const paginatedBookings = transformedBookings.slice(startIndex, endIndex);

    console.log(`✅ [BOOKINGS] Fetched ${transformedBookings.length} bookings, page ${page} of ${totalPages}`);
    
    res.json({ 
      success: true, 
      bookings: paginatedBookings,
      totalPages,
      currentPage: parseInt(page as string),
      totalItems
    });
  } catch (error) {
    console.error("❌ [BOOKINGS] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
});

// Admin: Update Booking Status
router.put("/bookings/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const validStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const updateData: Record<string, any> = { status };
    if (status === "CANCELLED") {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !booking) {
      console.error("[ADMIN] Failed to update booking status:", error);
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    console.log(`[ADMIN] Booking ${booking.booking_number} status updated to ${status}`);
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("[ADMIN] Error updating booking status:", error);
    res.status(500).json({ success: false, message: "Failed to update booking status" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 10;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim().replace(/'/g, "''");
      const pattern = `%${term}%`;
      query = query.or(`email.ilike.'${pattern}',first_name.ilike.'${pattern}',last_name.ilike.'${pattern}'`);
    }

    const { data: allUsers, count: totalCount, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    const users = allUsers || [];
    const totalItems = totalCount ?? users.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeNum));
    const startIndex = (pageNum - 1) * pageSizeNum;
    const paginatedUsers = users.slice(startIndex, startIndex + pageSizeNum).map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name ?? u.firstName,
      lastName: u.last_name ?? u.lastName,
      status: u.status,
      isEmailVerified: u.is_email_verified ?? u.isEmailVerified ?? false,
      createdAt: u.created_at ?? u.createdAt,
      _count: { bookings: u._count?.bookings ?? 0 },
    }));

    res.json({
      success: true,
      data: paginatedUsers,
      totalPages,
      currentPage: pageNum,
      totalItems,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

// Admin Pricing Management
router.get("/pricing", async (req, res) => {
  try {
    const { data: coupons } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: seasonalPricing } = await supabase
      .from('seasonal_pricing')
      .select('*')
      .order('created_at', { ascending: false });

    // Transform coupons data to match frontend expectations
    const transformedCoupons = coupons?.map(coupon => ({
      ...coupon,
      discountValue: coupon.discount_value || 0, // Ensure discountValue is never undefined
      discountType: coupon.discount_type,
      validFrom: coupon.valid_from,
      validUntil: coupon.valid_until,
      minBookingAmount: coupon.min_booking_amount,
      maxUses: coupon.max_uses,
      usedCount: coupon.used_count,
      isActive: coupon.is_active
    })) || [];

    // Transform seasonal pricing data
    const transformedSeasonalPricing = seasonalPricing?.map(pricing => ({
      ...pricing,
      pricePerNight: pricing.price_per_night || 0, // Ensure pricePerNight is never undefined
      startDate: pricing.start_date,
      endDate: pricing.end_date,
      minStayDays: pricing.min_stay_days
    })) || [];

    res.json({
      coupons: transformedCoupons,
      seasonalPricing: transformedSeasonalPricing
    });
  } catch (error) {
    res.status(500).json({ coupons: [], seasonalPricing: [] });
  }
});

// Admin Units Management
router.get("/units", async (req, res) => {
  try {
    const { data: units } = await supabase
      .from('units')
      .select(`
        *,
        property:properties(*)
      `)
      .order('created_at', { ascending: false });

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
        basePrice: unit.base_price || 0, // Ensure basePrice is never undefined/null
        cleaningFee: unit.cleaning_fee || 0,
        images: parsedImages, // Use parsed array instead of JSON string
        minStayDays: unit.min_stay_days || 1,
        isActive: unit.is_active
      };
    }) || [];

    res.json(transformedUnits);
  } catch (error) {
    console.error("❌ [UNITS] Failed to fetch units:", error);
    res.status(500).json([]);
  }
});

// Get individual unit by ID
router.get("/units/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: unit } = await supabase
      .from('units')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('id', id)
      .single();

    if (!unit) {
      return res.status(404).json({ success: false, message: "Unit not found" });
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

    res.json(transformedUnit);
  } catch (error) {
    console.error("❌ [UNITS] Failed to fetch unit:", error);
    res.status(500).json({ success: false, message: "Failed to fetch unit" });
  }
});

router.post("/units", upload.any(), async (req, res) => {
  try {
    console.log("🔍 [UNITS] Raw request body:", req.body);
    console.log("🔍 [UNITS] Request files:", req.files);
    
    // Handle FormData parsing - check if it's FormData or JSON
    let unitData;
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      // Check if it's FormData (has string values) or JSON (has typed values)
      const hasStringValues = Object.values(req.body).some(val => typeof val === 'string');
      
      if (hasStringValues) {
        // FormData comes as object with string values
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
    
    console.log("🔍 [UNITS] Creating unit with data:", unitData);
    
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
    
    // Handle image uploads
    const uploadedImages = [];
    if (req.files && Array.isArray(req.files)) {
      console.log("🔍 [UNITS] Processing uploaded files:", req.files.map(f => ({ 
        fieldname: f.fieldname, 
        originalname: f.originalname, 
        filename: f.filename 
      })));
      
      for (const file of req.files) {
        // Handle both 'images' field name and any image files
        if (file.fieldname === 'images' || file.mimetype?.startsWith('image/')) {
          if (file.filename) {
            uploadedImages.push(`/uploads/${file.filename}`);
            console.log("✅ [UNITS] Added image:", `/uploads/${file.filename}`);
          } else {
            console.error("❌ [UNITS] File has no filename:", file);
          }
        }
      }
    } else if (req.files && !Array.isArray(req.files)) {
      // Handle single file case
      const file = req.files as any;
      if (file.filename && (file.fieldname === 'images' || file.mimetype?.startsWith('image/'))) {
        uploadedImages.push(`/uploads/${file.filename}`);
        console.log("✅ [UNITS] Added single image:", `/uploads/${file.filename}`);
      }
    }
    
    console.log("🔍 [UNITS] Total uploaded images:", uploadedImages);
    
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
      images: uploadedImages.length > 0 ? uploadedImages : [],
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
      basePrice: unit.base_price || 0, // Ensure basePrice is never undefined/null
      cleaningFee: unit.cleaning_fee || 0,
      images: uploadedImages, // Return the uploaded image URLs
      minStayDays: unit.min_stay_days || 1,
      isActive: unit.is_active
    };

    console.log("✅ [UNITS] Unit created successfully:", transformedUnit);
    res.json({ success: true, data: transformedUnit });
  } catch (error) {
    console.error("❌ [UNITS] Server error:", error);
    res.status(500).json({ success: false, message: "Failed to create unit" });
  }
});

router.put("/units/:id", upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 [UNITS] Updating unit:", id);
    console.log("🔍 [UNITS] Request body:", req.body);
    console.log("🔍 [UNITS] Request files:", req.files);
    
    // Parse FormData
    const updateData: any = {};
    
    // Handle form fields
    if (req.body.propertyId) updateData.property_id = req.body.propertyId;
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.maxGuests) updateData.max_guests = parseInt(req.body.maxGuests);
    if (req.body.bedrooms) updateData.bedrooms = parseInt(req.body.bedrooms);
    if (req.body.bathrooms) updateData.bathrooms = parseInt(req.body.bathrooms);
    if (req.body.basePrice) updateData.base_price = parseFloat(req.body.basePrice);
    if (req.body.cleaningFee) updateData.cleaning_fee = parseFloat(req.body.cleaningFee);
    if (req.body.minStayDays) updateData.min_stay_days = parseInt(req.body.minStayDays);
    
    // Handle existing images
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        console.error("❌ Failed to parse existingImages:", e);
      }
    }
    
    // Handle new image uploads
    const uploadedImages = [];
    if (req.files && Array.isArray(req.files)) {
      console.log("🔍 [UNITS] Processing uploaded files for update:", req.files.map(f => ({ 
        fieldname: f.fieldname, 
        originalname: f.originalname, 
        filename: f.filename 
      })));
      
      for (const file of req.files) {
        // Handle both 'images' field name and any image files
        if (file.fieldname === 'images' || file.mimetype?.startsWith('image/')) {
          if (file.filename) {
            uploadedImages.push(`/uploads/${file.filename}`);
            console.log("✅ [UNITS] Added update image:", `/uploads/${file.filename}`);
          } else {
            console.error("❌ [UNITS] Update file has no filename:", file);
          }
        }
      }
    } else if (req.files && !Array.isArray(req.files)) {
      // Handle single file case
      const file = req.files as any;
      if (file.filename && (file.fieldname === 'images' || file.mimetype?.startsWith('image/'))) {
        uploadedImages.push(`/uploads/${file.filename}`);
        console.log("✅ [UNITS] Added single update image:", `/uploads/${file.filename}`);
      }
    }
    
    console.log("🔍 [UNITS] Total uploaded images for update:", uploadedImages);
    
    // Combine existing and new images
    const allImages = [...existingImages, ...uploadedImages];
    
    // Handle images field properly for database
    if (allImages.length > 0) {
      updateData.images = allImages; // Send as array, not JSON string
    } else {
      // For empty arrays, set to empty array
      updateData.images = [];
    }
    
    console.log("🔍 [UNITS] Update data:", updateData);
    
    const { data: unit, error } = await supabase
      .from('units')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        property:properties(*)
      `)
      .single();

    if (error) {
      console.error("❌ [UNITS] Update error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!unit) {
      return res.status(404).json({ success: false, message: "Unit not found" });
    }

    // Transform response for frontend
    const transformedUnit = {
      ...unit,
      propertyId: unit.property_id,
      maxGuests: unit.max_guests,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      basePrice: unit.base_price || 0,
      cleaningFee: unit.cleaning_fee || 0,
      images: allImages, // Return the combined image URLs
      minStayDays: unit.min_stay_days || 1,
      isActive: unit.is_active
    };

    console.log("✅ [UNITS] Unit updated successfully:", transformedUnit);
    res.json({ success: true, data: transformedUnit });
  } catch (error) {
    console.error("❌ [UNITS] Update server error:", error);
    res.status(500).json({ success: false, message: "Failed to update unit" });
  }
});

router.delete("/units/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, message: "Failed to delete unit" });
    }

    res.json({ success: true, message: "Unit deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete unit" });
  }
});

// Admin Tax Settings
router.get("/settings/tax", async (req, res) => {
  try {
    console.log("🔍 [TAX] Fetching tax settings...");
    
    const { data: taxSettings, error } = await supabase
      .from('tax_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error("❌ [TAX] Tax settings error:", error);
      return res.status(500).json({ taxRate: 15, additionalFees: 0 });
    }

    const response = taxSettings ? {
      taxRate: Math.round(parseFloat(taxSettings.tax_rate) * 100), // Convert to percentage
      additionalFees: parseFloat(taxSettings.additional_fees) || 0,
      description: taxSettings.description
    } : {
      taxRate: 15,
      additionalFees: 0,
      description: null
    };

    console.log("✅ [TAX] Tax settings fetched:", response);
    res.json(response);
  } catch (error) {
    console.error("❌ [TAX] Failed to fetch tax settings:", error);
    res.status(500).json({ taxRate: 15, additionalFees: 0 });
  }
});

router.post("/settings/tax", async (req, res) => {
  try {
    const { taxRate, additionalFees, description } = req.body;
    console.log("🔍 [TAX] Saving tax settings:", { taxRate, additionalFees, description });
    
    const taxRateDecimal = taxRate / 100; // Convert percentage to decimal
    
    // Update existing or insert new
    const { data, error } = await supabase
      .from('tax_settings')
      .upsert({
        tax_rate: taxRateDecimal,
        additional_fees: additionalFees || 0,
        description: description || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [TAX] Failed to save tax settings:", error);
      return res.status(500).json({ success: false, message: "Failed to save tax settings" });
    }

    console.log("✅ [TAX] Tax settings saved:", data);
    res.json({ 
      success: true, 
      taxRate, 
      additionalFees: additionalFees || 0,
      description: description || null
    });
  } catch (error) {
    console.error("❌ [TAX] Failed to save tax settings:", error);
    res.status(500).json({ success: false, message: "Failed to save tax settings" });
  }
});

router.put("/settings/tax", async (req, res) => {
  try {
    const { taxRate, additionalFees, description } = req.body;
    console.log("🔍 [TAX] Updating tax settings:", { taxRate, additionalFees, description });
    
    const taxRateDecimal = taxRate / 100; // Convert percentage to decimal
    
    const { data, error } = await supabase
      .from('tax_settings')
      .update({
        tax_rate: taxRateDecimal,
        additional_fees: additionalFees || 0,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      console.error("❌ [TAX] Failed to update tax settings:", error);
      return res.status(500).json({ success: false, message: "Failed to update tax settings" });
    }

    console.log("✅ [TAX] Tax settings updated:", data);
    res.json({ 
      success: true, 
      taxRate, 
      additionalFees: additionalFees || 0,
      description: description || null
    });
  } catch (error) {
    console.error("❌ [TAX] Failed to update tax settings:", error);
    res.status(500).json({ success: false, message: "Failed to update tax settings" });
  }
});

// ── Payment Settings ───────────────────────────────────────────────

router.get("/settings/payment", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ success: false, error: "Failed to fetch payment settings" });
    }

    res.json({
      success: true,
      data: data || {
        deposit_percentage: 25,
        balance_charge_days_before: 21,
        full_payment_threshold_days: 21,
        refund_deposit_on_cancel: false,
        currency: "EUR",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch payment settings" });
  }
});

router.put("/settings/payment", async (req, res) => {
  try {
    const { depositPercentage, balanceChargeDaysBefore, fullPaymentThresholdDays, refundDepositOnCancel } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (depositPercentage !== undefined) updates.deposit_percentage = depositPercentage;
    if (balanceChargeDaysBefore !== undefined) updates.balance_charge_days_before = balanceChargeDaysBefore;
    if (fullPaymentThresholdDays !== undefined) updates.full_payment_threshold_days = fullPaymentThresholdDays;
    if (refundDepositOnCancel !== undefined) updates.refund_deposit_on_cancel = refundDepositOnCancel;

    const { data: existing } = await supabase.from("payment_settings").select("id").eq("is_active", true).single();

    if (existing) {
      await supabase.from("payment_settings").update(updates).eq("id", existing.id);
    } else {
      await supabase.from("payment_settings").insert({
        ...updates,
        deposit_percentage: depositPercentage ?? 25,
        balance_charge_days_before: balanceChargeDaysBefore ?? 21,
        full_payment_threshold_days: fullPaymentThresholdDays ?? 21,
        refund_deposit_on_cancel: refundDepositOnCancel ?? false,
        currency: "EUR",
        is_active: true,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update payment settings" });
  }
});

// Image Upload Route
router.post("/upload-image", (req, res) => {
  try {
    const upload = req.app.locals.uploadAny;
    
    upload(req, res, (err: any) => {
      if (err) {
        console.error("❌ Upload error:", err);
        return res.status(400).json({ 
          success: false, 
          message: err.message || "Upload failed" 
        });
      }
      
      console.log("📁 Upload request files:", req.files);
      console.log("📁 Upload request body:", req.body);
      
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ 
          success: false, 
          message: "No file uploaded" 
        });
      }
      
      const file = Array.isArray(req.files) ? req.files[0] : req.files.file;
      if (!file) {
        return res.status(400).json({ 
          success: false, 
          message: "No valid file found" 
        });
      }
      
      const imageUrl = `/uploads/${(file as any).filename}`;
      
      console.log("✅ Image uploaded:", imageUrl);
      console.log("📁 File details:", {
        filename: (file as any).filename,
        originalname: (file as any).originalname,
        size: (file as any).size,
        mimetype: (file as any).mimetype
      });
      
      res.json({ 
        success: true, 
        imageUrl: imageUrl,
        filename: (file as any).filename
      });
    });
  } catch (error) {
    console.error("❌ Upload route error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Upload failed" 
    });
  }
});

export default router;
export const adminRouter = router;

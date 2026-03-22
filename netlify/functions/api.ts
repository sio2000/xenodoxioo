import { randomBytes } from 'crypto';

/** Effective max guests per unit. Small/Big Bungalow & Lykoskufi 1 = 3, Lykoskufi 2 = 5, others from DB. */
function getEffectiveMaxGuests(unitName: string, dbMaxGuests: number): number {
  const u = (unitName || "").toLowerCase().trim().replace(/\s+/g, " ");
  if (/small\s*bungalow/i.test(u)) return 3;
  if ((/big\s*bungalow|μεγάλο|megalo/i.test(u)) && /bungalow/i.test(u)) return 3;
  if (/lykoskufi\s*1|lykoskufi1|lykoski\s*1/i.test(u)) return 3;
  if (/lykoskufi\s*2|lykoskufi2|lykoski\s*2/i.test(u)) return 5;
  return dbMaxGuests ?? 10;
}

// Main API function - simple Supabase connection without express
export const handler = async (event: any, context: any) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const environment = process.env.NODE_ENV || 'production';
  const supabaseUrl = process.env.SUPABASE_URL || 'UNKNOWN';
  
  console.log(`=== MAIN API FUNCTION CALLED ===`);
  console.log(`🆔 [${requestId}] Request ID: ${requestId}`);
  console.log(`🌍 [${requestId}] Environment: ${environment}`);
  console.log(`🗄️ [${requestId}] Supabase URL: ${supabaseUrl}`);
  console.log(`📝 [${requestId}] ${event.httpMethod || 'GET'} ${event.path || event.rawPath || ''}`);
  
  try {
    // Get the path from the event
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || 'GET';
    
    console.log(`📝 [${requestId}] ${method} ${path}`);

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`❌ [${requestId}] Missing Supabase configuration`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Missing Supabase configuration',
          error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
          requestId,
          environment
        })
      };
    }

    // Import Supabase dynamically
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`✅ [${requestId}] Connected to Supabase`);

    // Route handling
    if (path === '/api/properties' || path === '/properties') {
      // Fetch properties with units
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Database error',
            error: error.message
          })
        };
      }

      if (!properties || properties.length === 0) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: []
          })
        };
      }

      // Get units for each property
      const propertyIds = properties.map((p) => p.id);
      
      const { data: units } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .in('property_id', propertyIds);

      console.log(`✅ Found ${properties?.length || 0} properties and ${units?.length || 0} units`);

      // Use price table for room prices (matches admin Τιμές & Περίοδος)
      let getMinPrice: (name: string) => number | null = () => null;
      let getClosed: (name: string) => { closed: boolean; reopenDate: string | null } = () => ({ closed: false, reopenDate: null });
      try {
        const pt = await import('../../server/services/price-table.service');
        getMinPrice = pt.getMinimumPriceForRoom;
        getClosed = pt.getRoomClosedStatusAndReopenDate;
      } catch (e) {
        console.warn(`⚠️ [${requestId}] Price table not loaded, using DB base_price`);
      }

      // Transform properties to match frontend expectations
      const aggregatedProperties = properties.map((property) => {
        const propertyUnits = units?.filter((u) => u.property_id === property.id) || [];
        const unitPrices = propertyUnits.map((u) => {
          const fromTable = getMinPrice(u.name);
          return fromTable ?? (Number(u.base_price) || 0);
        });
        const minPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : 0;

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
          units: propertyUnits.map((unit: any) => {
            const basePrice = getMinPrice(unit.name) ?? (Number(unit.base_price) || 0);
            const { closed: closedForCurrentPeriod, reopenDate } = getClosed(unit.name);
            return {
              ...unit,
              images: unit.images ? (typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images) : [],
              propertyId: unit.property_id,
              maxGuests: unit.max_guests,
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms,
              basePrice,
              cleaningFee: unit.cleaning_fee,
              minStayDays: unit.min_stay_days,
              isActive: unit.is_active,
              closedForCurrentPeriod,
              reopenDate
            };
          }),
          unitsCount: propertyUnits.length,
          startingFrom: minPrice,
          _count: { units: propertyUnits.length },
          _min: { basePrice: minPrice }
        };
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: aggregatedProperties
        })
      };
    }

    // GET /api/properties/:id
    if (path.startsWith('/api/properties/') && method === 'GET' && !path.includes('/id/')) {
      // Extract ID from path like /api/properties/eb483818-92f9-43dd-bd62-9c3767324271
      const id = path.split('/').pop();
      console.log(`🔍 [${requestId}] Fetching property detail for ID: ${id}`);
      
      const { data: property, error } = await supabase
        .from('properties')
        .select(`
          *,
          units:units(*)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !property) {
        console.error(`❌ [${requestId}] Property not found:`, error);
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: "Property not found",
            error: error?.message
          })
        };
      }

      // Get units for this property
      const { data: units } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', property.id)
        .eq('is_active', true)
        .order('base_price', { ascending: true });

      console.log(`✅ [${requestId}] Found property with ${units?.length || 0} units`);

      let getMinPrice: (name: string) => number | null = () => null;
      let getClosed: (name: string) => { closed: boolean; reopenDate: string | null } = () => ({ closed: false, reopenDate: null });
      try {
        const pt = await import('../../server/services/price-table.service');
        getMinPrice = pt.getMinimumPriceForRoom;
        getClosed = pt.getRoomClosedStatusAndReopenDate;
      } catch {}

      const transformedProperty = {
        ...property,
        gallery_images: property.gallery_images || [],
        units: (units || []).map((unit: any) => {
          let parsedImages = [];
          if (unit.images) {
            try {
              parsedImages = typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images;
            } catch {}
          }
          const basePrice = getMinPrice(unit.name) ?? (Number(unit.base_price) || 0);
          const { closed: closedForCurrentPeriod, reopenDate } = getClosed(unit.name);
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
            isActive: unit.is_active,
            closedForCurrentPeriod,
            reopenDate
          };
        })
      };

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: transformedProperty
        })
      };
    }

    // GET /api/properties/id/:id (legacy route)
    if (path.startsWith('/api/properties/id/') && method === 'GET') {
      // Extract ID from path like /api/properties/id/eb483818-92f9-43dd-bd62-9c3767324271
      const id = path.split('/').pop();
      console.log(`🔍 [${requestId}] Fetching property detail for ID: ${id}`);
      
      const { data: property, error } = await supabase
        .from('properties')
        .select(`
          *,
          units:units(*)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !property) {
        console.error(`❌ [${requestId}] Property not found:`, error);
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: "Property not found",
            error: error?.message
          })
        };
      }

      // Get units for this property
      const { data: units } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', property.id)
        .eq('is_active', true)
        .order('base_price', { ascending: true });

      console.log(`✅ [${requestId}] Found property with ${units?.length || 0} units`);

      let getMinPrice: (name: string) => number | null = () => null;
      let getClosed: (name: string) => { closed: boolean; reopenDate: string | null } = () => ({ closed: false, reopenDate: null });
      try {
        const pt = await import('../../server/services/price-table.service');
        getMinPrice = pt.getMinimumPriceForRoom;
        getClosed = pt.getRoomClosedStatusAndReopenDate;
      } catch {}

      const transformedProperty = {
        ...property,
        gallery_images: property.gallery_images || [],
        units: (units || []).map((unit: any) => {
          let parsedImages = [];
          if (unit.images) {
            try {
              parsedImages = typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images;
            } catch {}
          }
          const basePrice = getMinPrice(unit.name) ?? (Number(unit.base_price) || 0);
          const { closed: closedForCurrentPeriod, reopenDate } = getClosed(unit.name);
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
            isActive: unit.is_active,
            closedForCurrentPeriod,
            reopenDate
          };
        })
      };

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: transformedProperty
        })
      };
    }

    // GET /api/bookings/offer/:token - custom offer for checkout (public)
    const offerTokenMatch = path.match(/^\/api\/bookings\/offer\/([^/]+)$/);
    if (offerTokenMatch && method === 'GET') {
      const token = offerTokenMatch[1];
      const { data: offer, error } = await supabase
        .from('custom_checkout_offers')
        .select('*, unit:units(name, max_guests), property:properties(name)')
        .eq('token', token)
        .is('used_at', null)
        .single();
      if (error || !offer) {
        return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Offer not found or already used' }) };
      }
      const checkInStr = (offer.check_in_date || '').toString().slice(0, 10);
      const checkOutStr = (offer.check_out_date || '').toString().slice(0, 10);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: { token: offer.token, unitId: offer.unit_id, propertyId: offer.property_id, checkIn: checkInStr, checkOut: checkOutStr, guests: offer.guests, customTotalEur: Number(offer.custom_total_eur), unit: offer.unit, property: offer.property }
        })
      };
    }

    // GET /api/bookings/occupied-dates - blocked dates for calendar (CRITICAL: prevents double booking)
    if ((path === '/api/bookings/occupied-dates' || path === '/bookings/occupied-dates') && method === 'GET') {
      const unitId = event.queryStringParameters?.unitId?.trim();
      if (!unitId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'unitId required' })
        };
      }
      const BLOCKING_STATUSES = ['CONFIRMED', 'COMPLETED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'];
      const { data: ranges, error } = await supabase
        .from('bookings')
        .select('check_in_date, check_out_date')
        .eq('unit_id', unitId)
        .in('status', BLOCKING_STATUSES)
        .order('check_in_date', { ascending: true });

      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
      const mapped = (ranges || []).map((r: { check_in_date: string; check_out_date: string }) => ({
        start: (r.check_in_date || '').slice(0, 10),
        end: (r.check_out_date || '').slice(0, 10),
      }));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: mapped })
      };
    }

    // GET /api/bookings/user - user's bookings (requires auth)
    if ((path === '/api/bookings/user' || path === '/bookings/user') && method === 'GET') {
      const authHeader = event.headers?.authorization || event.headers?.Authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Unauthorized' })
        };
      }
      try {
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email?: string };
        const qs = event.queryStringParameters || {};
        const page = parseInt(qs.page || '1', 10);
        const pageSize = parseInt(qs.pageSize || '20', 10);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        // Include bookings by user_id OR orphaned (user_id null) where guest_email matches
        const userEmail = (payload.email || '').toLowerCase().trim();
        let bookings: any[] = [];
        let totalCount = 0;
        const { data: byUserId, count: count1 } = await supabase
          .from('bookings')
          .select('*, unit:units(*, property:properties(*))', { count: 'exact' })
          .eq('user_id', payload.userId)
          .order('created_at', { ascending: false })
          .range(from, to);
        bookings = byUserId || [];
        totalCount = count1 ?? 0;
        if (userEmail) {
          const { data: orphaned, count: count2 } = await supabase
            .from('bookings')
            .select('*, unit:units(*, property:properties(*))', { count: 'exact' })
            .is('user_id', null)
            .ilike('guest_email', userEmail)
            .order('created_at', { ascending: false });
          const orphanedList = orphaned || [];
          if (orphanedList.length > 0) {
            const merged = [...(byUserId || []), ...orphanedList];
            merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            bookings = merged.slice(from, to + 1);
            totalCount = (count1 ?? 0) + (count2 ?? 0);
          }
        }
        const mapped = bookings.map((b: any) => ({
          id: b.id,
          bookingNumber: b.booking_number,
          checkInDate: b.check_in_date,
          checkOutDate: b.check_out_date,
          nights: b.nights,
          status: b.status,
          paymentStatus: b.payment_status,
          totalPrice: parseFloat(b.total_price) || 0,
          totalPaid: parseFloat(b.total_paid) || 0,
          guestName: b.guest_name,
          guestEmail: b.guest_email,
          guests: b.guests,
          unit: b.unit ? { id: b.unit.id, name: b.unit.name, property: b.unit.property } : null,
        }));
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: { bookings: mapped, total: totalCount, page, pageSize }
          })
        };
      } catch {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid or expired token' })
        };
      }
    }

    // GET /api/bookings/:id - single booking (auth or email)
    const bookingIdMatch = path.match(/^\/api\/bookings\/([^/]+)$/);
    if (bookingIdMatch && method === 'GET') {
      const id = bookingIdMatch[1];
      if (id === 'user' || id === 'quote' || id === 'occupied-dates') return null as any;
      const authHeader = event.headers?.authorization || event.headers?.Authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const email = event.queryStringParameters?.email?.trim();
      let userId: string | null = null;
      let userEmail: string | null = null;
      if (token) {
        try {
          const jwt = await import('jsonwebtoken');
          const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string; email?: string };
          userId = payload.userId;
          userEmail = (payload.email || '').toLowerCase().trim() || null;
        } catch { /* invalid token */ }
      }
      if (!userId && !email) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Sign in or provide email' })
        };
      }
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, unit:units(*, property:properties(*))')
        .eq('id', id)
        .single();
      if (error || !booking) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Booking not found' })
        };
      }
      const userOwnsByUserId = userId && booking.user_id === userId;
      const userOwnsByEmail = userId && userEmail && !booking.user_id && booking.guest_email?.toLowerCase() === userEmail;
      if (userId && !userOwnsByUserId && !userOwnsByEmail) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Unauthorized' })
        };
      }
      if (!userId && email && booking.guest_email?.toLowerCase() !== email.toLowerCase()) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Email does not match booking' })
        };
      }
      const unit = booking.unit || {};
      const prop = unit.property || {};
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            id: booking.id,
            bookingNumber: booking.booking_number,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            nights: booking.nights,
            status: booking.status,
            totalPrice: parseFloat(booking.total_price) || 0,
            subtotal: parseFloat(booking.subtotal) || 0,
            cleaningFee: parseFloat(booking.cleaning_fee) || 0,
            taxes: parseFloat(booking.taxes) || 0,
            discountAmount: parseFloat(booking.discount_amount) || 0,
            guestName: booking.guest_name,
            guestEmail: booking.guest_email,
            guestPhone: booking.guest_phone,
            guests: booking.guests,
            unit: { id: unit.id, name: unit.name, property: { id: prop.id, name: prop.name } },
          }
        })
      };
    }

    // POST /api/bookings/:id/cancel
    const cancelMatch = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
    if (cancelMatch && method === 'POST') {
      const id = cancelMatch[1];
      const authHeader = event.headers?.authorization || event.headers?.Authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      let userId: string | null = null;
      let guestEmail: string | null = null;
      if (token) {
        try {
          const jwt = await import('jsonwebtoken');
          const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
          userId = payload.userId;
        } catch { /* invalid */ }
      }
      if (!userId) {
        let body: { guestEmail?: string } = {};
        try {
          body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
          guestEmail = body.guestEmail?.trim() || null;
        } catch { /* */ }
      }
      if (!userId && !guestEmail) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Sign in or provide guest email' })
        };
      }
      const { data: booking, error } = await supabase.from('bookings').select('*').eq('id', id).single();
      if (error || !booking) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Booking not found' })
        };
      }
      if (booking.status === 'CANCELLED') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Booking is already cancelled' })
        };
      }
      if (userId && booking.user_id !== userId) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Unauthorized' })
        };
      }
      if (guestEmail && booking.guest_email?.toLowerCase() !== guestEmail.toLowerCase()) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Email does not match' })
        };
      }
      await supabase.from('bookings').update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        is_cancelled: true
      }).eq('id', id);
      const { data: updated } = await supabase.from('bookings').select('*').eq('id', id).single();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: updated })
      };
    }

    // POST /api/bookings/quote - pricing quote for checkout
    if ((path === '/api/bookings/quote' || path === '/bookings/quote') && method === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { unitId, checkInDate, checkOutDate, guests = 1, couponCode } = body;
        if (!unitId || !checkInDate || !checkOutDate) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Missing unitId, checkInDate, or checkOutDate' })
          };
        }
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkIn >= checkOut) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Invalid dates' })
          };
        }
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const { data: unit, error: unitError } = await supabase.from('units').select('*').eq('id', unitId).single();
        if (unitError || !unit) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Unit not found' })
          };
        }
        const maxGuests = getEffectiveMaxGuests(unit.name, unit.max_guests ?? 10);
        if (guests > maxGuests) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              error: `Maximum ${maxGuests} guests allowed for this room`
            })
          };
        }
        const basePrice = Number(unit.base_price) || 0;
        const cleaningFee = Number(unit.cleaning_fee) || 0;
        let subtotal = basePrice * nights;
        let discountAmount = 0;
        if (couponCode) {
          const { data: coupon } = await supabase.from('coupons').select('*').eq('code', String(couponCode).toUpperCase()).eq('is_active', true).single();
          if (coupon) {
            discountAmount = coupon.discount_type === 'PERCENTAGE' ? subtotal * (Number(coupon.discount_value) / 100) : Number(coupon.discount_value);
            discountAmount = Math.min(discountAmount, subtotal);
          }
        }
        subtotal -= discountAmount;

        const { data: taxRow } = await supabase.from('tax_settings').select('tax_rate, additional_fees').eq('is_active', true).single();
        const taxRateDecimal = taxRow?.tax_rate != null ? parseFloat(taxRow.tax_rate) : 0.15;
        const additionalFeesPct = taxRow?.additional_fees != null ? parseFloat(taxRow.additional_fees) : 0;
        const taxRate = taxRateDecimal + (additionalFeesPct / 100);
        const taxes = Math.round((subtotal + cleaningFee) * taxRate * 100) / 100;
        const finalTotal = Math.round((subtotal + cleaningFee + taxes) * 100) / 100;

        const { data: paymentRow } = await supabase.from('payment_settings').select('deposit_percentage, full_payment_threshold_days').eq('is_active', true).single();
        const depositPct = (paymentRow?.deposit_percentage ?? 25) / 100;
        const fullPaymentDays = paymentRow?.full_payment_threshold_days ?? 21;
        const daysToCheckIn = Math.ceil((checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isFullPayment = daysToCheckIn <= fullPaymentDays;
        const depositAmount = isFullPayment ? finalTotal : Math.round(finalTotal * depositPct * 100) / 100;
        const balanceAmount = finalTotal - depositAmount;
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: {
              unit: { id: unitId },
              pricing: {
                nights,
                basePrice,
                subtotal: basePrice * nights,
                cleaningFee,
                discountAmount,
                taxes,
                taxRate: Math.round(taxRate * 100),
                totalPrice: finalTotal,
                depositAmount,
                balanceAmount,
                isFullPayment,
                scheduledChargeDate: null
              }
            }
          })
        };
      } catch (err) {
        console.error('Quote error:', err);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Failed to calculate quote' })
        };
      }
    }

    // POST /api/bookings
    if (path === '/api/bookings' && method === 'POST') {
      console.log(`🔍 [${requestId}] Creating booking...`);
      
      try {
        const body = JSON.parse(event.body || '{}');
        console.log(`📝 [${requestId}] Booking data:`, JSON.stringify(body, null, 2));
        
        // Get user_id from auth token if logged in
        let authUserId: string | null = null;
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (token) {
          try {
            const jwt = await import('jsonwebtoken');
            const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
            authUserId = payload.userId;
          } catch { /* invalid token */ }
        }
        
        // Validate required fields
        if (!body.unitId || !body.checkInDate || !body.checkOutDate || !body.guests) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              message: 'Missing required fields: unitId, checkInDate, checkOutDate, guests'
            })
          };
        }
        
        // Generate booking number and cancellation token
        const bookingNumber = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const cancellationToken = randomBytes(32).toString('hex');

        // Calculate nights
        const checkIn = new Date(body.checkInDate);
        const checkOut = new Date(body.checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get unit details for pricing
        const { data: unit } = await supabase
          .from('units')
          .select('*')
          .eq('id', body.unitId)
          .single();
          
        if (!unit) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              message: 'Unit not found'
            })
          };
        }

        const maxGuests = getEffectiveMaxGuests(unit.name, unit.max_guests ?? 10);
        const requestedGuests = parseInt(body.guests) || 1;
        if (requestedGuests > maxGuests) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              message: `Maximum ${maxGuests} guests allowed for this room`
            })
          };
        }

        // CRITICAL: Check availability - prevent double booking
        const BLOCKING_STATUSES = ['CONFIRMED', 'COMPLETED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'];
        const { data: conflicting } = await supabase
          .from('bookings')
          .select('id')
          .eq('unit_id', body.unitId)
          .in('status', BLOCKING_STATUSES)
          .lt('check_in_date', body.checkOutDate)
          .gt('check_out_date', body.checkInDate);
        if (conflicting && conflicting.length > 0) {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              message: 'Dates are already booked',
              error: 'Dates are already booked'
            })
          };
        }
        
        // Calculate total price
        const basePrice = Number(unit.base_price) || 0;
        const cleaningFee = Number(unit.cleaning_fee) || 0;
        const totalPrice = (basePrice * nights) + cleaningFee;
        
        // Create booking (include user_id for logged-in users)
        const insertData: Record<string, any> = {
          booking_number: bookingNumber,
          unit_id: body.unitId,
          guest_name: body.guestName || '',
          guest_email: body.guestEmail || '',
          guest_phone: body.guestPhone || '',
          check_in_date: body.checkInDate,
          check_out_date: body.checkOutDate,
          nights: nights,
          total_nights: nights,
          guests: parseInt(body.guests) || 1,
          base_price: basePrice,
          cleaning_fee: cleaningFee,
          subtotal: basePrice * nights,
          total_price: totalPrice,
          status: 'PENDING',
          cancellation_token: cancellationToken
        };
        if (authUserId) insertData.user_id = authUserId;
        const { data: booking, error } = await supabase
          .from('bookings')
          .insert([insertData])
          .select()
          .single();

        if (error) {
          console.error(`❌ [${requestId}] Booking creation error:`, error);
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              message: 'Failed to create booking',
              error: error.message
            })
          };
        }

        console.log(`✅ [${requestId}] Booking created:`, booking);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: {
              ...booking,
              unit: {
                name: unit.name,
                property: {
                  name: (await supabase.from('properties').select('name').eq('id', unit.property_id).single())?.data?.name || ''
                }
              }
            }
          })
        };
        
      } catch (error: any) {
        console.error(`❌ [${requestId}] Booking creation error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Server error',
            error: error.message
          })
        };
      }
    }

    // Handle auth routes (register, login)
    if (path.startsWith('/api/auth/')) {
      const authRes = await handleAuthRoutes(path, method, supabase, event, requestId);
      if (authRes) return authRes;
    }

    // Handle inquiries routes (guest create/get/reply, admin list/detail/reply)
    if (path === '/api/inquiries' || path.startsWith('/api/inquiries/')) {
      const inquiryRes = await handleInquiriesRoutes(path, method, supabase, event, requestId);
      if (inquiryRes) return inquiryRes;
    }

    // Handle admin routes
    if (path.startsWith('/api/admin/')) {
      return await handleAdminRoutes(path, method, supabase, event, requestId);
    }

    // GET /api/cancel-booking?token=xxx — Validate token and return booking info
    if ((path === '/api/cancel-booking' || path === '/cancel-booking') && method === 'GET') {
      const token = (event.queryStringParameters?.token || '').trim();
      if (!token) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Μη έγκυρος σύνδεσμος' })
        };
      }
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, unit:units(*, property:properties(*))')
        .eq('cancellation_token', token)
        .single();
      if (!booking) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Μη έγκυρος σύνδεσμος' })
        };
      }
      if (booking.status === 'CANCELLED') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Η κράτηση έχει ήδη ακυρωθεί' })
        };
      }
      if (booking.token_expires_at && new Date(booking.token_expires_at) < new Date()) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Ο σύνδεσμος έχει λήξει' })
        };
      }
      const unit = booking.unit || {};
      const property = unit.property || {};
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            id: booking.id,
            bookingNumber: booking.booking_number,
            guestName: booking.guest_name,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            nights: booking.nights,
            guests: booking.guests,
            totalPrice: Number(booking.total_price),
            unitName: unit.name || 'N/A',
            propertyName: property.name || 'N/A',
          }
        })
      };
    }

    // POST /api/cancel-booking — Execute cancellation
    if ((path === '/api/cancel-booking' || path === '/cancel-booking') && method === 'POST') {
      let body: { token?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Μη έγκυρος σύνδεσμος' })
        };
      }
      const token = (body.token || '').trim();
      if (!token) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Μη έγκυρος σύνδεσμος' })
        };
      }
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status, token_expires_at')
        .eq('cancellation_token', token)
        .single();
      if (!booking) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Μη έγκυρος σύνδεσμος' })
        };
      }
      if (booking.status === 'CANCELLED') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Η κράτηση έχει ήδη ακυρωθεί' })
        };
      }
      if (booking.token_expires_at && new Date(booking.token_expires_at) < new Date()) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Ο σύνδεσμος έχει λήξει' })
        };
      }
      const { data: updated, error } = await supabase
        .from('bookings')
        .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString(), is_cancelled: true })
        .eq('id', booking.id)
        .select('*, unit:units(*, property:properties(*))')
        .single();
      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Σφάλμα κατά την ακύρωση' })
        };
      }
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && updated?.guest_email) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(apiKey);
          const from = `${process.env.FROM_NAME || 'LEONIDIONHOUSES'} <${process.env.FROM_EMAIL || 'noreply@leonidion-houses.com'}>`;
          const unit = (updated as any)?.unit;
          const property = unit?.property;
          const checkInStr = updated.check_in_date ? new Date(updated.check_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
          const checkOutStr = updated.check_out_date ? new Date(updated.check_out_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
          await resend.emails.send({
            from,
            to: updated.guest_email,
            subject: 'Booking Cancelled - ' + (updated.booking_number || ''),
            html: `<h1>Booking Cancelled</h1><p>Dear ${updated.guest_name || 'Guest'},</p><p>Your booking <strong>${updated.booking_number || ''}</strong> for ${property?.name || unit?.name || 'N/A'} (${checkInStr} - ${checkOutStr}) has been cancelled successfully.</p><p>The reserved dates have been released. If you wish to book again, please visit our website.</p><p>Best regards,<br/>LEONIDIONHOUSES</p>`,
          });
        } catch (emailErr: any) {
          console.error('[API] cancel-booking email failed:', emailErr?.message);
        }
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: updated,
          message: 'Η κράτησή σας ακυρώθηκε επιτυχώς.'
        })
      };
    }

    // ── Payments routes ─────────────────────────────────────────────
    if (path.startsWith('/api/payments/')) {
      // GET /api/payments/settings
      if (path === '/api/payments/settings' && method === 'GET') {
        try {
          const { data, error } = await supabase.from('payment_settings').select('*').eq('is_active', true).single();
          const settings = error || !data
            ? { depositPercentage: 25, balanceChargeDaysBefore: 21, fullPaymentThresholdDays: 21, refundDepositOnCancel: false, currency: 'EUR' }
            : {
                depositPercentage: Number(data.deposit_percentage) || 25,
                balanceChargeDaysBefore: Number(data.balance_charge_days_before) || 21,
                fullPaymentThresholdDays: Number(data.full_payment_threshold_days) || 21,
                refundDepositOnCancel: Boolean(data.refund_deposit_on_cancel),
                currency: data.currency || 'EUR',
              };
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, data: settings })
          };
        } catch {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: true,
              data: { depositPercentage: 25, balanceChargeDaysBefore: 21, fullPaymentThresholdDays: 21, refundDepositOnCancel: false, currency: 'EUR' }
            })
          };
        }
      }

      // GET /api/payments/history/:bookingId
      const historyMatch = path.match(/^\/api\/payments\/history\/([^/]+)$/);
      if (historyMatch && method === 'GET') {
        const bookingId = historyMatch[1];
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false });
        if (error) {
          return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: error.message }) };
        }
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, data: data || [] })
        };
      }

      // POST /api/payments/refund (auth)
      if (path === '/api/payments/refund' && method === 'POST') {
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
          return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
        }
        let userId: string;
        try {
          const jwt = await import('jsonwebtoken');
          const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
          userId = payload.userId;
        } catch {
          return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Invalid token' }) };
        }
        let body: { bookingId?: string; reason?: string } = {};
        try {
          body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
        } catch {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) };
        }
        const { bookingId, reason } = body;
        if (!bookingId) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'bookingId is required' }) };
        }
        const { data: payments } = await supabase.from('payments').select('*').eq('booking_id', bookingId).eq('status', 'COMPLETED').order('created_at', { ascending: false });
        if (!payments || payments.length === 0) {
          return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'No completed payments found' }) };
        }
        const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
        if (!booking) {
          return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Booking not found' }) };
        }
        if (booking.user_id && booking.user_id !== userId) {
          return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
        }
        const { data: settingsRow } = await supabase.from('payment_settings').select('*').eq('is_active', true).single();
        const refundDepositOnCancel = settingsRow ? Boolean(settingsRow.refund_deposit_on_cancel) : false;
        if (!refundDepositOnCancel) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Refund policy is disabled' }) };
        }
        const depositPayment = payments.find((p: any) => p.payment_type === 'DEPOSIT');
        if (!depositPayment || !depositPayment.stripe_payment_intent_id) {
          return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'No deposit payment found for refund' }) };
        }
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
          const refund = await stripe.refunds.create({
            payment_intent: depositPayment.stripe_payment_intent_id,
            reason: 'requested_by_customer',
            metadata: { bookingId, paymentId: depositPayment.id, reason: reason || 'Customer requested refund' },
          });
          await supabase.from('payments').update({
            status: 'REFUNDED',
            refund_amount: depositPayment.amount,
            is_refundable: false,
          }).eq('id', depositPayment.id);
          await supabase.from('bookings').update({
            status: 'CANCELLED',
            payment_status: 'REFUNDED',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || 'Customer requested cancellation with refund',
          }).eq('id', bookingId);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, data: { refundId: refund.id, amount: Number(depositPayment.amount), status: refund.status } })
          };
        } catch (err: any) {
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: err?.message || 'Refund failed' })
          };
        }
      }

      // POST /api/payments/create-intent-from-offer (no auth)
      if (path === '/api/payments/create-intent-from-offer' && method === 'POST') {
        console.log('[API] create-intent-from-offer called');
        let body: { offerToken?: string; guestName?: string; guestEmail?: string; guestPhone?: string } = {};
        try {
          body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
        } catch {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) };
        }
        const { offerToken, guestName, guestEmail, guestPhone } = body;
        if (!offerToken || !guestName || !guestEmail || guestName.length < 2) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'offerToken, guestName (min 2 chars), guestEmail required' }) };
        }
        const { data: offer } = await supabase.from('custom_checkout_offers').select('*').eq('token', offerToken).is('used_at', null).single();
        if (!offer) {
          console.error('[API] Offer not found or used:', offerToken);
          return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Offer not found or already used' }) };
        }
        console.log('[API] Offer found, unit:', offer.unit_id, 'creating PI...');
        const amountEur = Number(offer.custom_total_eur) || 0;
        const cents = Math.round(amountEur * 100);
        if (cents < 50) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Payment amount too small' }) };
        }
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
          const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
          let customerId = customers.data[0]?.id;
          if (!customerId) {
            const c = await stripe.customers.create({ email: guestEmail, name: guestName, phone: guestPhone || undefined });
            customerId = c.id;
          }
          const pi = await stripe.paymentIntents.create({
            amount: cents,
            currency: 'eur',
            customer: customerId,
            metadata: { offerToken, type: 'custom_offer' },
            payment_method_types: ['card'],
          });
          const { error: pendingErr } = await supabase.from('pending_offer_checkouts').insert({
            offer_token: offerToken,
            guest_name: guestName,
            guest_email: guestEmail,
            guest_phone: guestPhone || null,
            stripe_payment_intent_id: pi.id,
          });
          if (pendingErr) {
            console.error('[API] pending_offer_checkouts insert FAILED:', pendingErr);
            return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Failed to register checkout — contact support' }) };
          }
          console.log('[API] create-intent-from-offer OK — PI', pi.id, 'pending record saved for webhook');
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, data: { clientSecret: pi.client_secret, paymentIntentId: pi.id, amount: amountEur, paymentType: 'FULL' } })
          };
        } catch (err: any) {
          return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: err?.message || 'Payment setup failed' }) };
        }
      }

      // POST /api/payments/complete-offer-payment — client-side fallback when webhook doesn't fire
      if (path === '/api/payments/complete-offer-payment' && method === 'POST') {
        const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001';
        let body: { paymentIntentId?: string } = {};
        try {
          body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
        } catch {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) };
        }
        const { paymentIntentId } = body;
        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'paymentIntentId required' }) };
        }
        console.log('[API] complete-offer-payment called for PI', paymentIntentId);
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (pi.status !== 'succeeded' && pi.status !== 'processing') {
            return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: `Payment not completed (status: ${pi.status})` }) };
          }
          const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : (pi.latest_charge as any)?.id;

          // Idempotent: if payment already exists for this PI, return success
          const { data: existingPayment } = await supabase.from('payments').select('booking_id').eq('stripe_payment_intent_id', paymentIntentId).eq('status', 'COMPLETED').single();
          if (existingPayment?.booking_id) {
            const { data: existingBooking } = await supabase.from('bookings').select('id, booking_number').eq('id', existingPayment.booking_id).single();
            console.log('[API] complete-offer-payment: booking already exists', existingBooking?.booking_number);
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ success: true, data: { bookingId: existingPayment.booking_id, bookingNumber: existingBooking?.booking_number, alreadyComplete: true } })
            };
          }

          const { error: guestErr } = await supabase.from('users').upsert(
            { id: GUEST_USER_ID, email: 'guest-system@leonidion-houses.com', first_name: 'Guest', last_name: 'User', password: 'no-login-placeholder', role: 'CUSTOMER', status: 'INACTIVE' },
            { onConflict: 'id' }
          );
          if (guestErr) console.warn('[API] Guest user upsert:', guestErr.message);

          const { data: pending } = await supabase.from('pending_offer_checkouts').select('*').eq('stripe_payment_intent_id', paymentIntentId).single();
          if (!pending) {
            return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'No pending offer found — payment may already be processed' }) };
          }

          const { data: offer } = await supabase.from('custom_checkout_offers').select('*').eq('token', pending.offer_token).single();
          if (!offer || offer.used_at) {
            return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Offer not found or already used' }) };
          }

          const { nanoid } = await import('nanoid');
          const bookingNumber = `BK${nanoid(8).toUpperCase()}`;
          const parseOfferDate = (s: string) => {
            const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0));
            return new Date(s);
          };
          const checkIn = parseOfferDate((offer.check_in_date || '').toString().slice(0, 10));
          const checkOut = parseOfferDate((offer.check_out_date || '').toString().slice(0, 10));
          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          const customTotal = Number(offer.custom_total_eur) || 0;
          const cancellationToken = randomBytes(32).toString('hex');

          const { data: booking, error: bookErr } = await supabase.from('bookings').insert({
            booking_number: bookingNumber,
            unit_id: offer.unit_id,
            user_id: null,
            check_in_date: checkIn.toISOString(),
            check_out_date: checkOut.toISOString(),
            nights,
            base_price: Math.round((customTotal / nights) * 100) / 100,
            total_nights: nights,
            subtotal: customTotal,
            cleaning_fee: 0,
            taxes: 0,
            discount_amount: 0,
            deposit_amount: customTotal,
            balance_amount: 0,
            remaining_amount: 0,
            total_price: customTotal,
            guests: offer.guests,
            guest_name: pending.guest_name,
            guest_email: pending.guest_email,
            guest_phone: pending.guest_phone,
            payment_status: 'PENDING',
            payment_type: 'FULL',
            deposit_paid: false,
            balance_paid: false,
            status: 'PENDING',
            cancellation_token: cancellationToken,
          }).select().single();

          if (bookErr || !booking) {
            console.error('[API] complete-offer-payment booking insert failed:', bookErr);
            return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Booking creation failed' }) };
          }

          const { error: payErr } = await supabase.from('payments').insert({
            booking_id: booking.id,
            user_id: GUEST_USER_ID,
            amount: customTotal,
            currency: 'EUR',
            payment_type: 'FULL',
            stripe_payment_intent_id: paymentIntentId,
            stripe_charge_id: chargeId || null,
            status: 'COMPLETED',
            processed_at: new Date().toISOString(),
            description: `Full payment (custom offer) for ${bookingNumber}`,
          });
          if (payErr) {
            console.error('[API] complete-offer-payment payments insert failed:', payErr);
            return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Payment record failed' }) };
          }

          await supabase.from('bookings').update({
            deposit_paid: true,
            balance_paid: true,
            payment_status: 'PAID_FULL',
            status: 'CONFIRMED',
            total_paid: customTotal,
            remaining_amount: 0,
          }).eq('id', booking.id);

          await supabase.from('custom_checkout_offers').update({ used_at: new Date().toISOString() }).eq('token', pending.offer_token);
          await supabase.from('pending_offer_checkouts').delete().eq('id', pending.id);

          const frontendUrl = process.env.FRONTEND_URL || 'https://www.leonidion-houses.com';
          const apiKey = process.env.RESEND_API_KEY;
          const from = `${process.env.FROM_NAME || 'LEONIDIONHOUSES'} <${process.env.FROM_EMAIL || 'noreply@leonidion-houses.com'}>`;
          const viewUrl = `${frontendUrl}/booking/${booking.id}?email=${encodeURIComponent(booking.guest_email || '')}`;
          const cancelUrl = cancellationToken ? `${frontendUrl}/cancel-booking?token=${encodeURIComponent(cancellationToken)}` : null;
          const checkInStr = checkIn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const checkOutStr = checkOut.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

          if (apiKey) {
            const { Resend } = await import('resend');
            const resend = new Resend(apiKey);
            const { data: fullBooking } = await supabase.from('bookings').select('*, unit:units(*, property:properties(*))').eq('id', booking.id).single();
            const unit = (fullBooking as any)?.unit;
            const property = unit?.property;
            await resend.emails.send({
              from,
              to: booking.guest_email,
              subject: 'Payment Receipt - ' + bookingNumber,
              html: `<h1>Payment Receipt</h1><p>Dear ${booking.guest_name},</p><p>Your payment of €${customTotal.toFixed(2)} has been processed. Booking ${bookingNumber} confirmed.</p><p><a href="${viewUrl}" style="background:#0677A1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Booking</a></p><p>Best regards,<br/>LEONIDIONHOUSES</p>`,
            });
            await resend.emails.send({
              from,
              to: booking.guest_email,
              subject: 'Booking Confirmation',
              html: `<h1>Booking Confirmation</h1><p>Dear ${booking.guest_name},</p><p>Thank you for your booking.</p><ul><li><strong>Booking:</strong> ${bookingNumber}</li><li><strong>Room:</strong> ${property?.name || 'N/A'}</li><li><strong>Arrival:</strong> ${checkInStr}</li><li><strong>Departure:</strong> ${checkOutStr}</li><li><strong>Total:</strong> €${customTotal.toFixed(2)}</li></ul><p><a href="${viewUrl}" style="background:#0677A1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Booking</a></p>${cancelUrl ? `<p>Need to cancel? <a href="${cancelUrl}" style="color:#0677A1;">Cancel your booking</a></p>` : ''}<p>Best regards,<br/>LEONIDIONHOUSES</p>`,
            });
          }

          console.log('[API] complete-offer-payment OK — booking', bookingNumber, booking.id);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, data: { bookingId: booking.id, bookingNumber } })
          };
        } catch (err: any) {
          console.error('[API] complete-offer-payment error:', err);
          return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: err?.message || 'Failed to complete offer payment' }) };
        }
      }

      // POST /api/payments/create-intent (auth) - for logged-in users
      if (path === '/api/payments/create-intent' && method === 'POST') {
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
          return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
        }
        let userId: string;
        try {
          const jwt = await import('jsonwebtoken');
          const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
          userId = payload.userId;
        } catch {
          return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Invalid token' }) };
        }
        let body: { bookingId?: string; paymentType?: string } = {};
        try {
          body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
        } catch {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) };
        }
        const { bookingId, paymentType } = body;
        if (!bookingId) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'bookingId is required' }) };
        }
        const { data: booking } = await supabase.from('bookings').select('*, unit:units(*, property:properties(*))').eq('id', bookingId).single();
        if (!booking) {
          return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Booking not found' }) };
        }
        if (booking.user_id && booking.user_id !== userId) {
          return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
        }
        const { data: settingsRow } = await supabase.from('payment_settings').select('*').eq('is_active', true).single();
        const settings = settingsRow
          ? { depositPercentage: Number(settingsRow.deposit_percentage) || 25, balanceChargeDaysBefore: Number(settingsRow.balance_charge_days_before) || 21, fullPaymentThresholdDays: Number(settingsRow.full_payment_threshold_days) || 21, currency: settingsRow.currency || 'EUR' }
          : { depositPercentage: 25, balanceChargeDaysBefore: 21, fullPaymentThresholdDays: 21, currency: 'EUR' };
        const daysToCheckIn = Math.ceil((new Date(booking.check_in_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const effectiveType = paymentType || (daysToCheckIn <= settings.fullPaymentThresholdDays ? 'FULL' : 'DEPOSIT');
        let amountEur = 0;
        if (effectiveType === 'FULL') amountEur = Number(booking.total_price) || 0;
        else if (effectiveType === 'DEPOSIT') amountEur = Number(booking.deposit_amount) || Number(booking.total_price) * (settings.depositPercentage / 100);
        else amountEur = Number(booking.remaining_amount) || Number(booking.balance_amount) || 0;
        const cents = Math.round(amountEur * 100);
        if (cents < 50) {
          return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Payment amount too small' }) };
        }
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
          const existingCustomers = await stripe.customers.list({ email: booking.guest_email, limit: 1 });
          const customerId = existingCustomers.data.length ? existingCustomers.data[0].id : (await stripe.customers.create({ email: booking.guest_email, name: booking.guest_name, phone: booking.guest_phone, metadata: { source: 'booking_platform' } })).id;
          const intentParams: any = {
            amount: cents,
            currency: (settings.currency || 'eur').toLowerCase(),
            customer: customerId,
            metadata: { bookingId, paymentType: effectiveType, bookingNumber: booking.booking_number },
            payment_method_types: ['card'],
          };
          if (effectiveType === 'DEPOSIT') intentParams.setup_future_usage = 'off_session';
          const paymentIntent = await stripe.paymentIntents.create(intentParams);
          const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001';
          await supabase.from('payments').insert({
            booking_id: bookingId,
            user_id: booking.user_id || GUEST_USER_ID,
            amount: amountEur,
            currency: settings.currency || 'EUR',
            payment_type: effectiveType,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_customer_id: customerId,
            status: 'PENDING',
            description: `${effectiveType} payment for booking ${booking.booking_number}`,
          });
          await supabase.from('bookings').update({ stripe_customer_id: customerId }).eq('id', bookingId);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, data: { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, amount: amountEur, paymentType: effectiveType } })
          };
        } catch (err: any) {
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: err?.message || 'Failed to create payment intent' })
          };
        }
      }
    }

    // Default response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'API is working',
        path: path,
        method: method,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error(`❌ [${requestId}] Function error:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message,
        requestId,
        environment
      })
    };
  }
};

// Auth routes handler (register, login)
async function handleAuthRoutes(path: string, method: string, supabase: any, event: any, requestId: string): Promise<any> {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
    const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

    // POST /api/auth/register
    if (path === '/api/auth/register' && method === 'POST') {
      let body: { email?: string; firstName?: string; lastName?: string; password?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
        };
      }
      const { email, firstName, lastName, password } = body;
      if (!email || !firstName || !lastName || !password) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Missing required fields: email, firstName, lastName, password' })
        };
      }
      if (String(password).length < 8) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Password must be at least 8 characters long' })
        };
      }
      const emailLower = String(email).toLowerCase();
      const { data: existingUser } = await supabase.from('users').select('id').eq('email', emailLower).single();
      if (existingUser) {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'User with this email already exists' })
        };
      }
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(String(password), 10);
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email: emailLower,
          first_name: String(firstName).trim(),
          last_name: String(lastName).trim(),
          password: hashedPassword
        })
        .select()
        .single();
      if (error) {
        console.error(`❌ [${requestId}] Register DB error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: `Failed to create user: ${error.message}` })
        };
      }
      if (!user) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Failed to create user: No data returned' })
        };
      }
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          }
        })
      };
    }

    // POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
      let body: { email?: string; password?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
        };
      }
      const { email, password } = body;
      if (!email || !password) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Email and password are required' })
        };
      }
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', String(email).toLowerCase())
        .single();
      if (error || !user) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid email or password' })
        };
      }
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(String(password), user.password);
      if (!valid) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid email or password' })
        };
      }
      const jwt = await import('jsonwebtoken');
      const payload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as any);
      const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY } as any);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('sessions').insert({
        user_id: user.id,
        token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt
      });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              role: user.role
            },
            accessToken,
            refreshToken
          }
        })
      };
    }

    // GET /api/auth/me - require Bearer token
    if (path === '/api/auth/me' && method === 'GET') {
      const authHeader = event.headers?.authorization || event.headers?.Authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Unauthorized' })
        };
      }
      try {
        const jwt = await import('jsonwebtoken');
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
        const { data: user, error } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, phone, role, is_email_verified, created_at')
          .eq('id', payload.userId)
          .single();
        if (error || !user) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'User not found' })
          };
        }
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              phone: user.phone ?? '',
              role: user.role,
              isEmailVerified: user.is_email_verified,
              createdAt: user.created_at
            }
          })
        };
      } catch {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid or expired token' })
        };
      }
    }

    // PUT /api/auth/profile - require Bearer token
    if (path === '/api/auth/profile' && method === 'PUT') {
      const authHeader = event.headers?.authorization || event.headers?.Authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Unauthorized' })
        };
      }
      let body: { firstName?: string; lastName?: string; phone?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
        };
      }
      try {
        const jwt = await import('jsonwebtoken');
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
        const updateData: Record<string, unknown> = {};
        if (body.firstName !== undefined) updateData.first_name = body.firstName;
        if (body.lastName !== undefined) updateData.last_name = body.lastName;
        if (body.phone !== undefined) updateData.phone = body.phone || null;
        if (Object.keys(updateData).length === 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'No fields to update' })
          };
        }
        const { data: user, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', payload.userId)
          .select('id, email, first_name, last_name, phone, role, is_email_verified, created_at')
          .single();
        if (error || !user) {
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: error?.message || 'Failed to update profile' })
          };
        }
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              phone: user.phone ?? '',
              role: user.role,
              isEmailVerified: user.is_email_verified,
              createdAt: user.created_at
            }
          })
        };
      } catch (err: any) {
        if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'Invalid or expired token' })
          };
        }
        throw err;
      }
    }

    return null;
  } catch (err: any) {
    console.error(`❌ [${requestId}] Auth error:`, err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err?.message || 'Server error' })
    };
  }
}

// Inquiries routes handler (guest create/get/reply, admin list/detail/reply)
async function handleInquiriesRoutes(path: string, method: string, supabase: any, event: any, requestId: string): Promise<any> {
  try {
    // POST /api/inquiries - guest create inquiry (no auth)
    if (path === '/api/inquiries' && method === 'POST') {
      let body: { propertyId?: string; guestName?: string; guestEmail?: string; checkinDate?: string; checkoutDate?: string; guests?: number; message?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON' })
        };
      }
      const { propertyId, guestName, guestEmail, checkinDate, checkoutDate, guests, message } = body;
      if (!propertyId || !guestName || !guestEmail || !checkinDate || !checkoutDate || !guests || !message || message.length < 5) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Missing or invalid fields (propertyId, guestName, guestEmail, checkinDate, checkoutDate, guests, message min 5 chars)' })
        };
      }
      const { data: inquiry, error } = await supabase
        .from('inquiries')
        .insert({
          property_id: propertyId,
          guest_name: guestName,
          guest_email: guestEmail,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          guests,
          status: 'NEW',
        })
        .select()
        .single();
      if (error || !inquiry) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Failed to create inquiry' })
        };
      }
      await supabase.from('inquiry_messages').insert({
        inquiry_id: inquiry.id,
        sender_type: 'guest',
        message,
      });
      await supabase.from('inquiries').update({ last_guest_message_at: new Date().toISOString() }).eq('id', inquiry.id);
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@leonidion-houses.com';
      const { data: property } = await supabase.from('properties').select('name').eq('id', propertyId).single();
      const propertyName = property?.name || 'Property';
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const Resend = (await import('resend')).Resend;
        const resend = new Resend(apiKey);
        const from = `${process.env.FROM_NAME || 'LEONIDIONHOUSES'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`;
        const dashboardUrl = `${process.env.FRONTEND_URL || 'https://www.leonidion-houses.com'}/admin/inquiries`;
        const html = `
          <h1>New Inquiry Received</h1>
          <p>A new inquiry has been submitted for <strong>${propertyName}</strong>.</p>
          <h2>Guest Details</h2>
          <ul>
            <li><strong>Name:</strong> ${guestName}</li>
            <li><strong>Email:</strong> ${guestEmail}</li>
            <li><strong>Check-in:</strong> ${new Date(checkinDate).toLocaleDateString()}</li>
            <li><strong>Check-out:</strong> ${new Date(checkoutDate).toLocaleDateString()}</li>
            <li><strong>Guests:</strong> ${guests}</li>
          </ul>
          <a href="${dashboardUrl}" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Inquiries</a>
          <p>Best regards,<br/>LEONIDIONHOUSES</p>
        `;
        await resend.emails.send({ from, to: [adminEmail], subject: `New inquiry from ${guestName} - ${propertyName}`, html }).catch((err: any) => console.error('[INQUIRY] Email failed:', err));
      }
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { inquiryId: inquiry.id } })
      };
    }

    // GET /api/inquiries/:id - guest view conversation (email param)
    const guestInquiryMatch = path.match(/^\/api\/inquiries\/([^/]+)$/);
    if (guestInquiryMatch && method === 'GET') {
      const id = guestInquiryMatch[1];
      if (id === 'admin') return null as any;
      const email = event.queryStringParameters?.email?.trim();
      const { data: inquiry, error } = await supabase
        .from('inquiries')
        .select('*, property:properties(name, location)')
        .eq('id', id)
        .single();
      if (error || !inquiry) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Inquiry not found' })
        };
      }
      if (email && inquiry.guest_email?.toLowerCase() !== email.toLowerCase()) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Unauthorized' })
        };
      }
      const { data: messages } = await supabase
        .from('inquiry_messages')
        .select('*')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: { inquiry, messages: messages || [] }
        })
      };
    }

    // POST /api/inquiries/:id/guest-reply
    const guestReplyMatch = path.match(/^\/api\/inquiries\/([^/]+)\/guest-reply$/);
    if (guestReplyMatch && method === 'POST') {
      const id = guestReplyMatch[1];
      let body: { guestEmail?: string; message?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON' })
        };
      }
      const guestEmail = typeof body.guestEmail === 'string' ? body.guestEmail.trim() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!guestEmail || !message) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'guestEmail and message are required' })
        };
      }
      const { data: inquiry } = await supabase.from('inquiries').select('*').eq('id', id).single();
      if (!inquiry) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Inquiry not found' })
        };
      }
      if (inquiry.guest_email?.toLowerCase() !== guestEmail.toLowerCase()) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Unauthorized' })
        };
      }
      await supabase.from('inquiry_messages').insert({
        inquiry_id: id,
        sender_type: 'guest',
        message,
      });
      await supabase.from('inquiries').update({ status: 'GUEST_REPLIED', last_guest_message_at: new Date().toISOString() }).eq('id', id);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    // GET /api/inquiries/admin/list
    if (path === '/api/inquiries/admin/list' && method === 'GET') {
      const qs = event.queryStringParameters || {};
      const status = qs.status;
      const page = parseInt(qs.page || '1', 10);
      const pageSize = parseInt(qs.pageSize || '10', 10);

      let query = supabase
        .from('inquiries')
        .select('*, property:properties(name, location)', { count: 'exact' });

      if (status && status !== 'ALL') query = query.eq('status', status);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: error.message })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            inquiries: data || [],
            total: count ?? 0,
            page,
            pageSize
          }
        })
      };
    }

    // GET /api/inquiries/admin/:id
    const adminDetailMatch = path.match(/^\/api\/inquiries\/admin\/([^/]+)$/);
    if (adminDetailMatch && method === 'GET') {
      const id = adminDetailMatch[1];
      const { data: inquiry, error } = await supabase
        .from('inquiries')
        .select('*, property:properties(name, location)')
        .eq('id', id)
        .single();

      if (error || !inquiry) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Inquiry not found' })
        };
      }

      // Mark as viewed by admin (for unread badge)
      await supabase
        .from('inquiries')
        .update({ admin_last_viewed_at: new Date().toISOString() })
        .eq('id', id);

      const { data: messages } = await supabase
        .from('inquiry_messages')
        .select('*')
        .eq('inquiry_id', id)
        .order('created_at', { ascending: true });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            inquiry,
            messages: messages || []
          }
        })
      };
    }

    // POST /api/inquiries/admin/:id/custom-offer
    const customOfferMatch = path.match(/^\/api\/inquiries\/admin\/([^/]+)\/custom-offer$/);
    if (customOfferMatch && method === 'POST') {
      const inquiryId = customOfferMatch[1];
      let body: { unitId?: string; checkInDate?: string; checkOutDate?: string; guests?: number; customTotalEur?: number } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      } catch {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) };
      }
      const { unitId, checkInDate, checkOutDate, guests = 2, customTotalEur } = body;
      if (!unitId || !checkInDate || !checkOutDate || !customTotalEur || customTotalEur < 1) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'unitId, checkInDate, checkOutDate, customTotalEur (min 1) required' }) };
      }
      const { data: inquiry } = await supabase.from('inquiries').select('property_id').eq('id', inquiryId).single();
      if (!inquiry) return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Inquiry not found' }) };
      const { data: unit } = await supabase.from('units').select('id, property_id').eq('id', unitId).eq('is_active', true).single();
      if (!unit || unit.property_id !== inquiry.property_id) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Unit not found or does not belong to inquiry property' }) };
      }
      const BLOCKING = ['CONFIRMED', 'COMPLETED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'];
      const { data: conflicting } = await supabase.from('bookings').select('id')
        .eq('unit_id', unitId).in('status', BLOCKING)
        .lt('check_in_date', checkOutDate).gt('check_out_date', checkInDate);
      if (conflicting && conflicting.length > 0) {
        return { statusCode: 409, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Dates already booked' }) };
      }
      const { randomBytes } = await import('crypto');
      const token = randomBytes(16).toString('hex');
      const toNoonUtc = (s: string) => {
        const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0)).toISOString();
        return new Date(s).toISOString();
      };
      const { data: offer, error: offerErr } = await supabase.from('custom_checkout_offers').insert({
        token, inquiry_id: inquiryId, unit_id: unitId, property_id: inquiry.property_id,
        check_in_date: toNoonUtc(checkInDate), check_out_date: toNoonUtc(checkOutDate),
        guests: guests || 2, custom_total_eur: customTotalEur,
      }).select().single();
      if (offerErr || !offer) {
        return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Failed to create offer' }) };
      }
      const baseUrl = process.env.FRONTEND_URL || 'https://www.leonidion-houses.com';
      const checkoutUrl = `${baseUrl}/checkout?offer=${token}`;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: { token: offer.token, checkoutUrl, checkIn: offer.check_in_date, checkOut: offer.check_out_date, guests: offer.guests, customTotalEur: offer.custom_total_eur } })
      };
    }

    // POST /api/inquiries/admin/:id/reply
    const adminReplyMatch = path.match(/^\/api\/inquiries\/admin\/([^/]+)\/reply$/);
    if (adminReplyMatch && method === 'POST') {
      const id = adminReplyMatch[1];
      let body: { message?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON' })
        };
      }
      const { message } = body;
      if (!message) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'message is required' })
        };
      }

      const { data: inquiry } = await supabase.from('inquiries').select('*').eq('id', id).single();
      if (!inquiry) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Inquiry not found' })
        };
      }

      await supabase.from('inquiry_messages').insert({
        inquiry_id: id,
        sender_type: 'host',
        message
      });

      await supabase.from('inquiries').update({ status: 'ANSWERED' }).eq('id', id);

      // Send reply email to guest (same as Express server)
      const { data: property } = await supabase.from('properties').select('name').eq('id', inquiry.property_id).single();
      const propertyName = property?.name || 'Property';
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const Resend = (await import('resend')).Resend;
        const resend = new Resend(apiKey);
        const from = `${process.env.FROM_NAME || 'LEONIDIONHOUSES'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`;
        const inquiryUrl = `${process.env.FRONTEND_URL || 'https://www.leonidion-houses.com'}/inquiry/${id}?email=${encodeURIComponent(inquiry.guest_email)}`;
        const html = `
          <h1>Reply to Your Inquiry</h1>
          <p>Dear ${inquiry.guest_name},</p>
          <p>You have received a reply regarding your inquiry for <strong>${propertyName}</strong>.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0;">${String(message).replace(/\n/g, '<br/>')}</p>
          </div>
          <a href="${inquiryUrl}" style="background-color: #0677A1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Inquiry</a>
          <p>Best regards,<br/>The LEONIDIONHOUSES Team</p>
        `;
        await resend.emails.send({
          from,
          to: [inquiry.guest_email],
          subject: `Reply to your inquiry - ${propertyName}`,
          html
        }).catch((err: any) => console.error('[INQUIRY] Reply email failed:', err));
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    return null; // Not an inquiries route we handle
  } catch (err: any) {
    console.error(`❌ [${requestId}] Inquiries error:`, err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err?.message || 'Server error' })
    };
  }
}

// Admin routes handler
async function handleAdminRoutes(path: string, method: string, supabase: any, event: any, requestId: string) {
  console.log(`🔧 [${requestId}] ${method} ${path}`);

  try {
    // POST /api/admin/login
    if (path === '/api/admin/login' && method === 'POST') {
      let body: { email?: string; password?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
        };
      }
      const { email, password } = body;
      if (!email || !password) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Email and password are required' })
        };
      }
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, password')
        .eq('email', String(email).toLowerCase())
        .single();
      if (error || !user) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid credentials' })
        };
      }
      if (user.role !== 'ADMIN') {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Admin access required' })
        };
      }
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(String(password), user.password);
      if (!valid) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid credentials' })
        };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        })
      };
    }

    // GET /api/admin/stats
    if (path === '/api/admin/stats' && method === 'GET') {
      const [bookingsResult, usersResult, propertiesResult, inquiriesRpcResult] = await Promise.all([
        supabase.from('bookings').select('status, unit_id, check_in_date, check_out_date, total_paid'),
        supabase.from('users').select('id, status', { count: 'exact' }),
        supabase.from('properties').select(`
          id,
          name,
          units:units(id)
        `),
        supabase.rpc('count_unread_inquiries')
      ]);

      const bookings = bookingsResult.data || [];
      const users = usersResult.data || [];
      const properties = propertiesResult.data || [];
      const totalUsers = usersResult.count ?? users.length;

      const confirmedBookings = bookings.filter((b: any) => b.status === 'CONFIRMED');
      const totalRevenue = bookings.reduce((sum: any, b: any) => sum + (parseFloat(b.total_paid) || parseFloat(b.total_price) || 0), 0);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const daysInMonth = monthEnd.getDate();
      const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

      const occupancyByProperty = properties.map((property: any) => {
        const units = property.units || [];
        const totalUnits = units.length;
        const bookedDatesByUnit = new Map<string, Set<string>>();
        units.forEach((u: any) => bookedDatesByUnit.set(u.id, new Set()));

        confirmedBookings.forEach((booking: any) => {
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
      });

      let unreadInquiriesCount = 0;
      if (!inquiriesRpcResult.error && typeof inquiriesRpcResult.data === 'number') {
        unreadInquiriesCount = inquiriesRpcResult.data;
      } else {
        const fallback = await supabase.from('inquiries').select('*', { count: 'exact', head: true }).in('status', ['NEW', 'GUEST_REPLIED']);
        unreadInquiriesCount = fallback.count ?? 0;
      }

      const stats = {
        totalBookings: bookings.length,
        confirmedBookings: confirmedBookings.length,
        pendingBookings: bookings.filter((b: any) => b.status === 'PENDING').length,
        cancelledBookings: bookings.filter((b: any) => b.status === 'CANCELLED').length,
        totalRevenue,
        totalUsers,
        propertiesCount: properties.length,
        occupancyByProperty,
        activeUsers: (users as any[]).filter((u: any) => u?.status === 'ACTIVE').length || totalUsers,
        unreadInquiriesCount
      };

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: stats
        })
      };
    }

    // GET /api/admin/prices-and-period
    if (path === '/api/admin/prices-and-period' && method === 'GET') {
      try {
        const { getCurrentPeriod, getUpcomingPeriods } = await import('../../server/services/price-table.service');
        const current = getCurrentPeriod();
        const upcoming = getUpcomingPeriods();
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: {
              currentPeriod: current ? { label: current.period.label, roomPrices: current.roomPrices } : null,
              upcomingPeriods: upcoming || []
            }
          })
        };
      } catch (err: any) {
        console.warn(`⚠️ [${requestId}] prices-and-period:`, err?.message || err);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: { currentPeriod: null, upcomingPeriods: [] }
          })
        };
      }
    }

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      const qs = event.queryStringParameters || {};
      const page = parseInt(qs.page || '1', 10);
      const pageSize = parseInt(qs.pageSize || '10', 10);
      const status = qs.status;
      const search = (qs.search || '').trim();
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      let query = supabase.from('users').select('*', { count: 'exact' });
      if (status && status !== 'ALL') query = query.eq('status', status);
      if (search) {
        const escaped = search.replace(/'/g, "''");
        const pattern = `%${escaped}%`;
        query = query.or(`email.ilike.'${pattern}',first_name.ilike.'${pattern}',last_name.ilike.'${pattern}'`);
      }
      const { data: allUsers, count: totalCount, error } = await query.order('created_at', { ascending: false }).range(start, end);

      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: error.message })
        };
      }

      const users = allUsers || [];
      const totalItems = totalCount ?? users.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const transformed = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name ?? u.firstName ?? '',
        lastName: u.last_name ?? u.lastName ?? '',
        phone: u.phone ?? '',
        status: u.status ?? 'ACTIVE',
        isEmailVerified: u.is_email_verified ?? u.isEmailVerified ?? false,
        createdAt: u.created_at ?? u.createdAt ?? null,
        _count: { bookings: u._count?.bookings ?? 0 }
      }));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: transformed,
          totalPages,
          currentPage: page,
          totalItems
        })
      };
    }

    // GET /api/admin/properties
    if (path === '/api/admin/properties' && method === 'GET') {
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`
          *,
          units:units(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: error.message })
        };
      }

      // Transform data to match expected interface
      const transformedProperties = properties?.map((property: any) => ({
        ...property,
        main_image: property.main_image,
        gallery_images: property.gallery_images,
        is_active: property.is_active,
        units: property.units?.map((unit: any) => ({
          ...unit,
          propertyId: unit.property_id,
          maxGuests: unit.max_guests,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          beds: unit.beds,
          basePrice: unit.base_price
        })) || []
      })) || [];

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: transformedProperties
        })
      };
    }

    // GET /api/admin/units
    if (path === '/api/admin/units' && method === 'GET') {
      const { data: units, error } = await supabase
        .from('units')
        .select(`
          *,
          property:properties(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: error.message })
        };
      }

      // Transform the data to match the expected interface
      const transformedUnits = units?.map((unit: any) => {
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

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: transformedUnits
        })
      };
    }

    // PUT /api/admin/units/:id
    if (path.startsWith('/api/admin/units/') && method === 'PUT') {
      const id = path.split('/').pop();
      console.log(`🔍 [${requestId}] PUT /api/admin/units/:id — id=${id}, isBase64Encoded=${event.isBase64Encoded}, bodyLength=${(event.body || '').length}`);

      let body: any = {};
      try {
        const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '{}');
        body = JSON.parse(rawBody);
        console.log(`✅ [${requestId}] Parsed body: propertyId=${body.propertyId}, name=${body.name}, imagesCount=${body.images?.length ?? 0}`);
      } catch (parseErr: any) {
        console.error(`❌ [${requestId}] Body parse error:`, parseErr?.message);
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON body', detail: parseErr?.message })
        };
      }
      
      // Transform the data for database
      const updateData: any = {
        property_id: body.propertyId,
        name: body.name,
        description: body.description || '',
        max_guests: body.maxGuests,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        base_price: body.basePrice,
        cleaning_fee: body.cleaningFee || 0,
        min_stay_days: body.minStayDays || 1,
        images: body.images || [] // Send as array, not JSON string
      };
      
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
        console.error(`❌ [${requestId}] Update error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: error.message 
          })
        };
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
        images: unit.images ? (typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images) : [],
        minStayDays: unit.min_stay_days,
        isActive: unit.is_active
      };

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: transformedUnit
        })
      };
    }

    // GET /api/admin/bookings
    if (path === '/api/admin/bookings' && method === 'GET') {
      const qs = event.queryStringParameters || {};
      const page = parseInt(qs.page || '1', 10);
      const pageSize = parseInt(qs.pageSize || '20', 10);
      const status = qs.status;
      const search = qs.search;
      const userId = qs.userId;

      let query = supabase
        .from('bookings')
        .select(`
          *,
          unit:units(id, name, property_id, property:properties(id, name)),
          user:users(id, email, first_name, last_name)
        `, { count: 'exact' });

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`booking_number.ilike.%${search}%,guest_name.ilike.%${search}%,guest_email.ilike.%${search}%`);
      }

      const { data: rows, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: error.message })
        };
      }

      const bookings = (rows || []).map((b: any) => ({
        id: b.id,
        bookingNumber: b.booking_number,
        unit: {
          id: b.unit?.id,
          name: b.unit?.name || 'Unknown Unit',
          property: {
            id: b.unit?.property_id || b.unit?.property?.id,
            name: b.unit?.property?.name || 'Unknown Property'
          }
        },
        user: b.user ? {
          id: b.user.id,
          email: b.user.email,
          firstName: b.user.first_name,
          lastName: b.user.last_name
        } : null,
        guestName: b.guest_name,
        guestEmail: b.guest_email,
        guestPhone: b.guest_phone,
        checkInDate: b.check_in_date,
        checkOutDate: b.check_out_date,
        nights: b.nights,
        guests: b.guests,
        totalPrice: parseFloat(b.total_price) || 0,
        totalPaid: parseFloat(b.total_paid) || 0,
        remainingAmount: parseFloat(b.remaining_amount) ?? (parseFloat(b.total_price) || 0) - (parseFloat(b.total_paid) || 0),
        depositAmount: parseFloat(b.deposit_amount) || 0,
        paymentType: b.payment_type || 'FULL',
        scheduledChargeDate: b.scheduled_charge_date || null,
        status: b.status,
        paymentStatus: b.payment_status,
        createdAt: b.created_at
      }));

      const totalItems = count ?? bookings.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          bookings,
          totalPages,
          currentPage: page,
          totalItems
        })
      };
    }

    // PUT /api/admin/bookings/:id/status
    if (path.match(/^\/api\/admin\/bookings\/[^/]+\/status$/) && method === 'PUT') {
      const id = path.split('/')[4];
      let body: { status?: string } = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
      } catch {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON' })
        };
      }
      const { status } = body;
      if (!status) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'status is required' })
        };
      }
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);
      if (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    // GET /api/admin/pricing
    if (path === '/api/admin/pricing' && method === 'GET') {
      const [couponsRes, seasonalRes] = await Promise.all([
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        supabase.from('seasonal_pricing').select('*').order('created_at', { ascending: false })
      ]);
      const coupons = (couponsRes.data || []).map((c: any) => ({
        ...c,
        discountValue: c.discount_value ?? 0,
        discountType: c.discount_type,
        validFrom: c.valid_from,
        validUntil: c.valid_until,
        minBookingAmount: c.min_booking_amount,
        maxUses: c.max_uses,
        usedCount: c.used_count ?? 0,
        isActive: c.is_active
      }));
      const seasonalPricing = (seasonalRes.data || []).map((p: any) => ({
        ...p,
        pricePerNight: p.price_per_night ?? 0,
        startDate: p.start_date,
        endDate: p.end_date,
        minStayDays: p.min_stay_days
      }));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupons, seasonalPricing })
      };
    }

    // GET /api/admin/coupons
    if (path === '/api/admin/coupons' && method === 'GET') {
      console.log(`🔍 [${requestId}] Fetching coupons from Supabase...`);
      
      const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      console.log(`✅ [${requestId}] Coupons query result:`, { coupons, error, count: coupons?.length || 0 });

      if (error) {
        console.error(`❌ [${requestId}] Coupons query error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: error.message })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: coupons || []
        })
      };
    }

    // GET /api/admin/settings/tax
    if (path === '/api/admin/settings/tax' && method === 'GET') {
      try {
        const { data: taxSettings, error } = await supabase
          .from('tax_settings')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taxRate: 15, additionalFees: 0, description: null })
          };
        }

        const taxRate = taxSettings ? Math.round(parseFloat(taxSettings.tax_rate || 0) * 100) : 15;
        const additionalFees = taxSettings ? parseFloat(taxSettings.additional_fees || 0) : 0;
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taxRate, additionalFees, description: taxSettings?.description || null })
        };
      } catch (e) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taxRate: 15, additionalFees: 0, description: null })
        };
      }
    }

    // PUT /api/admin/settings/tax
    if (path === '/api/admin/settings/tax' && method === 'PUT') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { taxRate = 15, additionalFees = 0, description } = body;
        const taxRateDecimal = (Number(taxRate) || 0) / 100;

        const { data: existing } = await supabase.from('tax_settings').select('id').eq('is_active', true).single();

        if (existing) {
          const { error } = await supabase
            .from('tax_settings')
            .update({
              tax_rate: taxRateDecimal,
              additional_fees: additionalFees || 0,
              description: description || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (error) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ success: false, message: 'Failed to save tax settings' })
            };
          }
        } else {
          const { error } = await supabase.from('tax_settings').insert({
            tax_rate: taxRateDecimal,
            additional_fees: additionalFees || 0,
            description: description || null,
            is_active: true
          });

          if (error) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ success: false, message: 'Failed to save tax settings' })
            };
          }
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, taxRate, additionalFees: additionalFees || 0, description: description || null })
        };
      } catch (e: any) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: 'Failed to save settings' })
        };
      }
    }

    // GET /api/admin/settings/payment
    if (path === '/api/admin/settings/payment' && method === 'GET') {
      try {
        const { data, error } = await supabase
          .from('payment_settings')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: true,
              data: {
                deposit_percentage: 25,
                balance_charge_days_before: 21,
                full_payment_threshold_days: 21,
                refund_deposit_on_cancel: false,
                currency: 'EUR'
              }
            })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: data || {
              deposit_percentage: 25,
              balance_charge_days_before: 21,
              full_payment_threshold_days: 21,
              refund_deposit_on_cancel: false,
              currency: 'EUR'
            }
          })
        };
      } catch (e) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: {
              deposit_percentage: 25,
              balance_charge_days_before: 21,
              full_payment_threshold_days: 21,
              refund_deposit_on_cancel: false,
              currency: 'EUR'
            }
          })
        };
      }
    }

    // PUT /api/admin/settings/payment
    if (path === '/api/admin/settings/payment' && method === 'PUT') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { depositPercentage, balanceChargeDaysBefore, fullPaymentThresholdDays, refundDepositOnCancel } = body;

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (depositPercentage !== undefined) updates.deposit_percentage = depositPercentage;
        if (balanceChargeDaysBefore !== undefined) updates.balance_charge_days_before = balanceChargeDaysBefore;
        if (fullPaymentThresholdDays !== undefined) updates.full_payment_threshold_days = fullPaymentThresholdDays;
        if (refundDepositOnCancel !== undefined) updates.refund_deposit_on_cancel = refundDepositOnCancel;

        const { data: existing } = await supabase.from('payment_settings').select('id').eq('is_active', true).single();

        if (existing) {
          const { error } = await supabase.from('payment_settings').update(updates).eq('id', existing.id);
          if (error) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ success: false, message: 'Failed to save payment settings' })
            };
          }
        } else {
          const { error } = await supabase.from('payment_settings').insert({
            deposit_percentage: depositPercentage ?? 25,
            balance_charge_days_before: balanceChargeDaysBefore ?? 21,
            full_payment_threshold_days: fullPaymentThresholdDays ?? 21,
            refund_deposit_on_cancel: refundDepositOnCancel ?? false,
            currency: 'EUR',
            is_active: true
          });
          if (error) {
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ success: false, message: 'Failed to save payment settings' })
            };
          }
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      } catch (e: any) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: 'Failed to save payment settings' })
        };
      }
    }

    // POST /api/admin/properties
    if (path === '/api/admin/properties' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      console.log(`📝 [${requestId}] Property creation payload:`, JSON.stringify(body, null, 2));
      
      // Generate slug if missing
      if (!body.slug) {
        const baseSlug = body.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substr(0, 50);
        
        body.slug = baseSlug || `property-${Date.now()}`;
        console.log(`✅ [${requestId}] Generated slug: ${body.slug}`);
      }
      
      // Add default main_image if not provided
      if (!body.main_image) {
        body.main_image = '';
      }
      
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          name: body.name,
          slug: body.slug,
          description: body.description || '',
          location: body.location || '',
          city: body.city,
          country: body.country,
          main_image: body.main_image,
          gallery_images: body.gallery_images || [],
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error(`❌ [${requestId}] Supabase error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: error.message,
            requestId,
            payload: body
          })
        };
      }

      console.log(`✅ [${requestId}] Property created successfully`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data, requestId })
      };
    }

    // PUT /api/admin/properties/:id
    if (path.startsWith('/api/admin/properties/') && path !== '/api/admin/properties' && method === 'PUT') {
      const id = path.split('/').pop();
      if (!id) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Missing property ID' })
        };
      }
      console.log(`🔍 [${requestId}] PUT /api/admin/properties/:id — id=${id}, isBase64Encoded=${event.isBase64Encoded}, bodyLength=${(event.body || '').length}`);
      let body: any = {};
      try {
        const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '{}');
        body = JSON.parse(rawBody);
        console.log(`✅ [${requestId}] Parsed body: name=${body.name}, main_image=${body.main_image ? 'yes' : 'no'}`);
      } catch (parseErr: any) {
        console.error(`❌ [${requestId}] Body parse error:`, parseErr?.message);
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid JSON body', detail: parseErr?.message })
        };
      }
      const updateData: any = {
        name: body.name,
        description: body.description ?? '',
        location: body.location ?? '',
        city: body.city,
        country: body.country
      };
      if (body.main_image != null) {
        updateData.main_image = body.main_image;
      }
      const { data: property, error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error(`❌ [${requestId}] Property update error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: error.message })
        };
      }
      if (!property) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Property not found' })
        };
      }
      console.log(`✅ [${requestId}] Property updated successfully`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: property, requestId })
      };
    }

    // POST /api/admin/upload-image
    if (path === '/api/admin/upload-image' && method === 'POST') {
      console.log(`🖼️ [${requestId}] === IMAGE UPLOAD START ===`);
      console.log(`🖼️ [${requestId}] isBase64Encoded=${event.isBase64Encoded}, bodyLength=${(event.body || '').length}`);
      try {
        let rawBody: string;
        try {
          rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '{}');
        } catch (e: any) {
          console.error(`❌ [${requestId}] Body decode error:`, e?.message);
          throw e;
        }
        const body = JSON.parse(rawBody);
        console.log(`🖼️ [${requestId}] Parsed: hasBase64=${!!body.base64Data}, base64Len=${body.base64Data?.length ?? 0}, filename=${body.filename}`);
        console.log(`📝 [${requestId}] Upload payload:`, JSON.stringify(body, null, 2));
        
        const { base64Data, filename } = body;
        
        if (!base64Data) {
          console.error(`❌ [${requestId}] Missing base64Data`);
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: false, 
              error: 'Missing base64Data',
              requestId 
            })
          };
        }
        
        // Generate filename if not provided
        const finalFilename = filename || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        console.log(`🖼️ [${requestId}] Processing upload: ${finalFilename}`);
        
        // Convert base64 to buffer
        const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Content, 'base64');
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(finalFilename, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        console.log(`🔍 [${requestId}] Supabase upload response:`, { data, error });

        if (error) {
          console.error(`❌ [${requestId}] Upload error:`, error);
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: false, 
              error: error.message,
              requestId 
            })
          };
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(finalFilename);
          
        console.log(`✅ [${requestId}] Upload successful: ${publicUrl}`);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            imageUrl: publicUrl,
            filename: finalFilename,
            requestId
          })
        };
        
      } catch (error: any) {
        console.error(`❌ [${requestId}] Upload error:`, error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            requestId 
          })
        };
      }
    }

    // Default admin route response
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Admin route not found',
        path: path
      })
    };

  } catch (error: any) {
    console.error('❌ Admin route error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Admin server error',
        error: error.message
      })
    };
  }
}

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

      // Transform properties to match frontend expectations
      const aggregatedProperties = properties.map((property) => {
        const propertyUnits = units?.filter((u) => u.property_id === property.id) || [];
        const minPrice = propertyUnits.length > 0 
          ? Math.min(...propertyUnits.map((u) => u.base_price))
          : 0;

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
          units: propertyUnits.map((unit: any) => ({
            ...unit,
            images: unit.images ? (typeof unit.images === 'string' ? JSON.parse(unit.images) : unit.images) : [],
            propertyId: unit.property_id,
            maxGuests: unit.max_guests,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            basePrice: unit.base_price,
            cleaningFee: unit.cleaning_fee,
            minStayDays: unit.min_stay_days,
            isActive: unit.is_active
          })),
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

      // Transform data to match frontend expectations
      const transformedProperty = {
        ...property,
        gallery_images: property.gallery_images || [],
        units: (units || []).map((unit: any) => {
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
              console.log(`⚠️ [${requestId}] Failed to parse images for unit:`, unit.id, error);
              parsedImages = [];
            }
          }

          return {
            ...unit,
            images: parsedImages,
            propertyId: unit.property_id,
            maxGuests: unit.max_guests,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            basePrice: Number(unit.base_price) || 0,
            cleaningFee: Number(unit.cleaning_fee) || 0,
            minStayDays: unit.min_stay_days || 1,
            isActive: unit.is_active
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

      // Transform data to match frontend expectations
      const transformedProperty = {
        ...property,
        gallery_images: property.gallery_images || [],
        units: (units || []).map((unit: any) => {
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
              console.log(`⚠️ [${requestId}] Failed to parse images for unit:`, unit.id, error);
              parsedImages = [];
            }
          }

          return {
            ...unit,
            images: parsedImages,
            propertyId: unit.property_id,
            maxGuests: unit.max_guests,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            basePrice: Number(unit.base_price) || 0,
            cleaningFee: Number(unit.cleaning_fee) || 0,
            minStayDays: unit.min_stay_days || 1,
            isActive: unit.is_active
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

    // Handle admin routes
    if (path.startsWith('/api/admin/')) {
      return await handleAdminRoutes(path, method, supabase, event, requestId);
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

// Admin routes handler
async function handleAdminRoutes(path: string, method: string, supabase: any, event: any, requestId: string) {
  console.log(`🔧 [${requestId}] ${method} ${path}`);

  try {
    // GET /api/admin/stats
    if (path === '/api/admin/stats' && method === 'GET') {
      const [bookingsResult, usersResult, propertiesResult] = await Promise.all([
        supabase.from('bookings').select('status'),
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('properties').select('id', { count: 'exact' })
      ]);

      const bookings = bookingsResult.data || [];
      const stats = {
        totalBookings: bookings.length,
        confirmedBookings: bookings.filter((b: any) => b.status === 'CONFIRMED').length,
        pendingBookings: bookings.filter((b: any) => b.status === 'PENDING').length,
        cancelledBookings: bookings.filter((b: any) => b.status === 'CANCELLED').length,
        totalRevenue: bookings.reduce((sum: any, b: any) => sum + (b.total_price || 0), 0),
        totalUsers: usersResult.count || 0,
        propertiesCount: propertiesResult.count || 0,
        occupancyByProperty: [],
        activeUsers: usersResult.count || 0
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

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
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
          data: users || []
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
      const body = JSON.parse(event.body || '{}');
      
      console.log(`🔍 [${requestId}] Updating unit: ${id}`);
      console.log(`🔍 [${requestId}] Update data:`, body);
      
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
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
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
          data: bookings || []
        })
      };
    }

    // GET /api/admin/pricing
    if (path === '/api/admin/pricing' && method === 'GET') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            currency: 'EUR',
            taxRate: 0.24,
            depositPercentage: 25
          }
        })
      };
    }

    // GET /api/admin/coupons
    if (path === '/api/admin/coupons' && method === 'GET') {
      const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
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
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            taxRate: 0.24,
            currency: 'EUR'
          }
        })
      };
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

    // POST /api/admin/upload-image
    if (path === '/api/admin/upload-image' && method === 'POST') {
      console.log(`🖼️ [${requestId}] === IMAGE UPLOAD START ===`);
      try {
        const body = JSON.parse(event.body || '{}');
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

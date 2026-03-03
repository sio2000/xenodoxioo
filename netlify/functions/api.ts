// Main API function - simple Supabase connection without express
export const handler = async (event: any, context: any) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  const environment = process.env.NODE_ENV || 'production';
  const supabaseUrl = process.env.SUPABASE_URL || 'UNKNOWN';
  const timestamp = new Date().toISOString();
  
  console.log(`=== PRODUCTION FORENSIC AUDIT ===`);
  console.log(`🆔 [${requestId}] Request ID: ${requestId}`);
  console.log(`🕐 [${requestId}] Timestamp: ${timestamp}`);
  console.log(`🌍 [${requestId}] Environment: ${environment}`);
  console.log(`🗄️ [${requestId}] Supabase URL: ${supabaseUrl}`);
  console.log(`📝 [${requestId}] ${event.httpMethod || 'GET'} ${event.path || event.rawPath || ''}`);
  console.log(`🔍 [${requestId}] User-Agent: ${event.headers?.['user-agent'] || 'UNKNOWN'}`);
  console.log(`🔍 [${requestId}] Source IP: ${event.headers?.['x-forwarded-for'] || event.headers?.['x-real-ip'] || 'UNKNOWN'}`);
  
  try {
    // Get the path from the event
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || 'GET';
    
    console.log(`📝 [${requestId}] ${method} ${path}`);
    console.log(`🔍 [${requestId}] Full event payload:`, JSON.stringify(event, null, 2));

    // Environment variables forensic check
    console.log(`🔍 [${requestId}] === ENVIRONMENT VARIABLES AUDIT ===`);
    console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`);
    console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}`);
    console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'NOT_SET'}`);
    console.log(`  - NETLIFY: ${process.env.NETLIFY ? 'TRUE' : 'FALSE'}`);
    console.log(`  - SITE_URL: ${process.env.URL || 'NOT_SET'}`);
    console.log(`🔍 [${requestId}] Full event payload:`, JSON.stringify({
      httpMethod: event.httpMethod,
      path: event.path,
      rawPath: event.rawPath,
      headers: event.headers,
      queryStringParameters: event.queryStringParameters,
      body: event.body,
      isBase64Encoded: event.isBase64Encoded
  }, null, 2));

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`❌ [${requestId}] CRITICAL: Missing Supabase configuration`);
      console.error(`❌ [${requestId}] This will cause ALL database operations to fail`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'CRITICAL: Missing Supabase configuration',
          error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
          requestId,
          environment,
          timestamp,
          forensic: {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            environment
          }
        })
      };
    }

    // Import Supabase dynamically
    console.log(`🔍 [${requestId}] Importing Supabase client...`);
    const { createClient } = await import('@supabase/supabase-js');
    
    console.log(`🔍 [${requestId}] Creating Supabase client...`);
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(`✅ [${requestId}] Connected to Supabase at ${supabaseUrl}`);
    console.log(`🔍 [${requestId}] Client created successfully - testing connection...`);
    
    // Test connection with a simple query
    try {
      const { error: testError } = await supabase.from('properties').select('id').limit(1);
      if (testError) {
        console.error(`❌ [${requestId}] Supabase connection test failed:`, testError);
      } else {
        console.log(`✅ [${requestId}] Supabase connection test PASSED`);
      }
    } catch (testErr) {
      console.error(`❌ [${requestId}] Supabase connection test EXCEPTION:`, testErr);
    }

    // Route handling
    if (path === '/api/properties' || path === '/properties') {
      console.log(`🏠 [${requestId}] === PROPERTIES FETCH FORENSIC AUDIT ===`);
      
      // Fetch properties with units
      console.log(`🔍 [${requestId}] Fetching properties from Supabase...`);
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log(`🔍 [${requestId}] Properties query result:`, {
        success: !error,
        error: error || 'NO_ERROR',
        count: properties ? properties.length : 0,
        sampleProperty: properties && properties.length > 0 ? {
          id: properties[0].id,
          name: properties[0].name,
          hasMainImage: !!properties[0].main_image,
          mainImageType: typeof properties[0].main_image,
          hasGalleryImages: !!properties[0].gallery_images,
          galleryImagesType: typeof properties[0].gallery_images
        } : 'NO_PROPERTIES'
      });

      if (error) {
        console.error('❌ [PROPERTIES] Supabase error:', JSON.stringify(error, null, 2));
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Database error',
            error: error.message,
            requestId,
            forensic: {
              operation: 'fetch_properties',
              databaseError: error
            }
          })
        };
      }

      if (!properties || properties.length === 0) {
        console.log('ℹ️ [PROPERTIES] No properties found');
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: [],
            requestId,
            forensic: {
              operation: 'fetch_properties',
              result: 'no_properties_found'
            }
          })
        };
      }

      // Get units for each property
      console.log(`🔍 [${requestId}] Fetching units for ${properties.length} properties...`);
      const propertyIds = properties.map((p) => p.id);
      
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .in('property_id', propertyIds);

      console.log(`🔍 [${requestId}] Units query result:`, {
        success: !unitsError,
        error: unitsError || 'NO_ERROR',
        count: units ? units.length : 0,
        sampleUnit: units && units.length > 0 ? {
          id: units[0].id,
          name: units[0].name,
          propertyId: units[0].property_id,
          basePrice: units[0].base_price,
          basePriceType: typeof units[0].base_price,
          hasValidPrice: units[0].base_price !== null && units[0].base_price !== undefined
        } : 'NO_UNITS'
      });

      if (unitsError) {
        console.error('❌ [PROPERTIES] Units query error:', JSON.stringify(unitsError, null, 2));
      }

      console.log(`✅ [${requestId}] Found ${properties?.length || 0} properties and ${units?.length || 0} units`);

      // Transform properties to match frontend expectations
      console.log(`🔄 [${requestId}] Transforming properties data...`);
      const aggregatedProperties = properties.map((property, index) => {
        console.log(`🔄 [${requestId}] Processing property ${index + 1}/${properties.length}: ${property.name}`);
        
        const propertyUnits = units?.filter((u) => u.property_id === property.id) || [];
        console.log(`🔍 [${requestId}] Property ${property.name} has ${propertyUnits.length} units`);
        
        // Calculate min price with validation
        let minPrice = 0;
        if (propertyUnits.length > 0) {
          const validPrices = propertyUnits
            .map((u) => u.base_price)
            .filter((price) => price !== null && price !== undefined && !isNaN(price));
          
          console.log(`🔍 [${requestId}] Price analysis for ${property.name}:`, {
            unitPrices: propertyUnits.map(u => ({ name: u.name, price: u.base_price, type: typeof u.base_price })),
            validPrices,
            validPricesCount: validPrices.length
          });
          
          if (validPrices.length > 0) {
            minPrice = Math.min(...validPrices);
            console.log(`✅ [${requestId}] Calculated min price for ${property.name}: ${minPrice}`);
          } else {
            console.log(`⚠️ [${requestId}] No valid prices found for ${property.name}, using 0`);
          }
        } else {
          console.log(`⚠️ [${requestId}] No units found for ${property.name}, using price 0`);
        }

        // Parse mainImage and galleryImages for property
        let parsedMainImage = property.main_image;
        let parsedGalleryImages = [];
        
        console.log(`🖼️ [${requestId}] Processing images for ${property.name}:`, {
          mainImage: property.main_image,
          mainImageType: typeof property.main_image,
          galleryImages: property.gallery_images,
          galleryImagesType: typeof property.gallery_images
        });
        
        // Only attempt JSON.parse if the field looks like JSON (starts with [ or {)
        if (property.main_image && (property.main_image.startsWith('[') || property.main_image.startsWith('{'))) {
          try {
            parsedMainImage = JSON.parse(property.main_image);
            console.log(`✅ [${requestId}] Parsed main_image for ${property.name}`);
          } catch (error) {
            console.log(`⚠️ [${requestId}] Failed to parse mainImage for property ${property.id}:`, error);
            parsedMainImage = property.main_image;
          }
        }

        if (property.gallery_images) {
          if (property.gallery_images) {
          try {
            if (typeof property.gallery_images === 'string') {
              // Only parse if it looks like JSON
              if (property.gallery_images.startsWith('[') || property.gallery_images.startsWith('{')) {
                parsedGalleryImages = JSON.parse(property.gallery_images);
                console.log(`✅ [${requestId}] Parsed gallery_images for ${property.name}`);
              } else {
                parsedGalleryImages = property.gallery_images;
                console.log(`🔍 [${requestId}] Using gallery_images as string for ${property.name}`);
              }
            } else if (Array.isArray(property.gallery_images)) {
              parsedGalleryImages = property.gallery_images;
              console.log(`✅ [${requestId}] Using gallery_images as array for ${property.name}`);
            }
          } catch (error) {
            console.log(`⚠️ [${requestId}] Failed to parse galleryImages for property ${property.id}:`, error);
            parsedGalleryImages = [];
          }
        }
        }

        const parsedUnits = propertyUnits.map((unit: any, unitIndex: number) => {
          console.log(`🔄 [${requestId}] Processing unit ${unitIndex + 1}/${propertyUnits.length}: ${unit.name}`);
          
          let parsedImages = [];
          if (unit.images) {
            try {
              if (typeof unit.images === 'string') {
                parsedImages = JSON.parse(unit.images);
              } else if (Array.isArray(unit.images)) {
                parsedImages = unit.images;
              }
              console.log(`✅ [${requestId}] Parsed ${parsedImages.length} images for unit ${unit.name}`);
            } catch (error) {
              console.log(`⚠️ [${requestId}] Failed to parse images for unit ${unit.id}:`, error);
              parsedImages = [];
            }
          }

          const transformedUnit = {
            ...unit,
            images: parsedImages,
            propertyId: unit.property_id,
            maxGuests: unit.max_guests,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            basePrice: unit.base_price || 0, // CRITICAL: Ensure never undefined
            cleaningFee: unit.cleaning_fee || 0,
            minStayDays: unit.min_stay_days,
            isActive: unit.is_active
          };
          
          console.log(`🔍 [${requestId}] Transformed unit ${unit.name}:`, {
            basePrice: transformedUnit.basePrice,
            basePriceType: typeof transformedUnit.basePrice,
            hasValidPrice: transformedUnit.basePrice > 0
          });
          
          return transformedUnit;
        });

        const transformedProperty = {
          id: property.id,
          name: property.name,
          slug: property.slug,
          location: property.location,
          city: property.city,
          country: property.country,
          description: property.description,
          mainImage: parsedMainImage,
          galleryImages: parsedGalleryImages,
          isActive: property.is_active,
          createdAt: property.created_at,
          updatedAt: property.updated_at,
          units: parsedUnits,
          unitsCount: propertyUnits.length,
          startingFrom: minPrice, // CRITICAL: Ensure never undefined
          _count: {
            units: propertyUnits.length,
          },
          _min: {
            basePrice: minPrice, // CRITICAL: Ensure never undefined
          },
        };
        
        console.log(`✅ [${requestId}] Transformed property ${property.name}:`, {
          unitsCount: transformedProperty.unitsCount,
          startingFrom: transformedProperty.startingFrom,
          startingFromType: typeof transformedProperty.startingFrom,
          hasValidPrice: transformedProperty.startingFrom > 0
        });
        
        return transformedProperty;
      });

      console.log(`✅ [${requestId}] Returning ${aggregatedProperties.length} complete properties`);
      console.log(`🔍 [${requestId}] Final price validation:`, {
        propertiesWithZeroPrice: aggregatedProperties.filter(p => p.startingFrom === 0).length,
        propertiesWithValidPrice: aggregatedProperties.filter(p => p.startingFrom > 0).length,
        priceRange: {
          min: Math.min(...aggregatedProperties.map(p => p.startingFrom)),
          max: Math.max(...aggregatedProperties.map(p => p.startingFrom))
        }
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: aggregatedProperties.map(property => ({
            ...property,
            units: property.units || [] // Put units at property level for frontend
          })),
          requestId,
          forensic: {
            operation: 'fetch_properties',
            propertiesCount: aggregatedProperties.length,
            validPriceCount: aggregatedProperties.filter(p => p.startingFrom > 0).length
          }
        })
      };
    }

    // Handle individual property detail requests
    if (path.startsWith('/api/properties/id/') || path.startsWith('/properties/id/')) {
      const propertyId = path.split('/').pop();
      console.log(` Fetching property detail for ID: ${propertyId}`);
      
      if (!propertyId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Property ID is required'
          })
        };
      }

      // Fetch property by ID
      const { data: property, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('is_active', true)
        .single();

      if (error || !property) {
        console.error(' Property not found:', error);
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Property not found'
          })
        };
      }

      // Get units for this property
      const { data: units } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('base_price', { ascending: true });

      console.log(` Found property: ${property.name} with ${units?.length || 0} units`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            ...property,
            units: units || []
          }
        })
      };
    }

    // Handle image uploads
    if (path.startsWith('/uploads/')) {
      return await handleImageServe(path, supabase, requestId);
    }

    // Handle admin routes
    if (path.startsWith('/api/admin/')) {
      return await handleAdminRoutes(path, method, supabase, event, requestId);
    }

    // Default response for other routes
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
    console.error(`❌ [${requestId}] Function error:`, JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message,
        stack: error.stack,
        requestId,
        environment
      })
    };
  }
};

// Admin routes handler
async function handleAdminRoutes(path: string, method: string, supabase: any, event: any, requestId: string) {
  console.log(`🔧 [${requestId}] === ADMIN ROUTE START ===`);
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

    // GET /api/admin/properties
    if (path === '/api/admin/properties' && method === 'GET') {
      const { data: properties, error } = await supabase
        .from('properties')
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
        body: JSON.stringify(properties || [])
      };
    }

    // POST /api/admin/properties
    if (path === '/api/admin/properties' && method === 'POST') {
      console.log(`🔍 [${requestId}] === PROPERTY CREATION FORENSIC AUDIT ===`);
      try {
        const body = JSON.parse(event.body || '{}');
        console.log(`📝 [${requestId}] Raw property creation payload:`, JSON.stringify(body, null, 2));
        console.log(`🔍 [${requestId}] Payload analysis:`, {
          hasName: !!body.name,
          hasSlug: !!body.slug,
          name: body.name,
          slug: body.slug,
          hasMainImage: !!body.main_image,
          hasGalleryImages: !!body.gallery_images,
          galleryImagesType: typeof body.gallery_images,
          bodyKeys: Object.keys(body)
        });
        
        // CRITICAL: Generate slug if missing or invalid
        if (!body.slug || body.slug.trim() === '') {
          console.log(`⚠️ [${requestId}] MISSING SLUG - Generating from name: "${body.name}"`);
          
          if (!body.name || body.name.trim() === '') {
            console.error(`❌ [${requestId}] CRITICAL: Both name and slug are missing`);
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                success: false, 
                error: 'Property name is required for slug generation',
                requestId,
                forensic: {
                  hasName: !!body.name,
                  hasSlug: !!body.slug,
                  payload: body
                }
              })
            };
          }
          
          // Generate slug from name with Greek character support
          const baseSlug = body.name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[αά]/g, 'a')
            .replace(/[β]/g, 'b')
            .replace(/[γ]/g, 'g')
            .replace(/[δ]/g, 'd')
            .replace(/[εέ]/g, 'e')
            .replace(/[ζ]/g, 'z')
            .replace(/[ηή]/g, 'i')
            .replace(/[θ]/g, 'th')
            .replace(/[ιίϊΐ]/g, 'i')
            .replace(/[κ]/g, 'k')
            .replace(/[λ]/g, 'l')
            .replace(/[μ]/g, 'm')
            .replace(/[ν]/g, 'n')
            .replace(/[ξ]/g, 'x')
            .replace(/[οό]/g, 'o')
            .replace(/[π]/g, 'p')
            .replace(/[ρ]/g, 'r')
            .replace(/[σς]/g, 's')
            .replace(/[τ]/g, 't')
            .replace(/[υύϋΰ]/g, 'y')
            .replace(/[φ]/g, 'f')
            .replace(/[χ]/g, 'ch')
            .replace(/[ψ]/g, 'ps')
            .replace(/[ωώ]/g, 'o')
            .replace(/[^a-z0-9\-]/g, '') // Remove special chars
            .replace(/\-+/g, '-') // Replace multiple hyphens
            .substr(0, 50); // Limit length
          
          body.slug = baseSlug || `property-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          console.log(`✅ [${requestId}] Generated slug: "${body.slug}" from name: "${body.name}"`);
        } else {
          console.log(`✅ [${requestId}] Using provided slug: "${body.slug}"`);
        }
        
        // Validate slug before database insert
        if (!body.slug || body.slug.trim() === '') {
          console.error(`❌ [${requestId}] CRITICAL: Slug validation failed - empty slug`);
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: false, 
              error: 'Slug validation failed - empty slug',
              requestId,
              forensic: {
                originalSlug: body.slug,
                name: body.name
              }
            })
          };
        }
        
        console.log(`🔍 [${requestId}] Final property data before insert:`, JSON.stringify({
          name: body.name,
          slug: body.slug,
          description: body.description,
          location: body.location,
          city: body.city,
          country: body.country,
          main_image: body.main_image,
          gallery_images: body.gallery_images,
          is_active: body.is_active
        }, null, 2));
        
        console.log(`🔍 [${requestId}] Executing Supabase insert...`);
        const { data, error } = await supabase
          .from('properties')
          .insert([{
            name: body.name,
            slug: body.slug.trim(), // Ensure no whitespace
            description: body.description || '',
            location: body.location || '',
            city: body.city || '',
            country: body.country || '',
            main_image: body.main_image || '',
            gallery_images: body.gallery_images || '[]',
            is_active: body.is_active !== undefined ? body.is_active : true
          }])
          .select()
          .single();

        console.log(`🔍 [${requestId}] Supabase insert response:`, { 
          success: !error,
          data: data ? 'PROPERTY_DATA_RECEIVED' : 'NULL_DATA',
          error: error ? error : 'NO_ERROR',
          dataKeys: data ? Object.keys(data) : 'NO_KEYS'
        });

        if (error) {
          console.error(`❌ [${requestId}] Supabase insert ERROR:`, JSON.stringify(error, null, 2));
          console.error(`❌ [${requestId}] Error details:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: false, 
              error: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              requestId,
              forensic: {
                payload: body,
                slugUsed: body.slug,
                databaseError: error
              }
            })
          };
        }

        if (!data) {
          console.error(`❌ [${requestId}] CRITICAL: Insert succeeded but returned NULL data`);
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: false, 
              error: 'Property inserted but no data returned',
              requestId,
              forensic: {
                payload: body,
                slugUsed: body.slug
              }
            })
          };
        }

        console.log(`✅ [${requestId}] Property created SUCCESSFULLY:`, JSON.stringify(data, null, 2));
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: true, 
            data: data, 
            requestId,
            forensic: {
              propertyId: data.id,
              slugUsed: data.slug,
              createdAt: data.created_at
            }
          })
        };
      } catch (error: any) {
        console.error(`❌ [${requestId}] Property creation EXCEPTION:`, JSON.stringify(error, null, 2));
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            requestId,
            forensic: {
              errorMessage: error.message,
              errorStack: error.stack,
              errorName: error.name
            }
          })
        };
      }
    }

    // GET /api/admin/units
    if (path === '/api/admin/units' && method === 'GET') {
      const { data: units, error } = await supabase
        .from('units')
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
        body: JSON.stringify(units || [])
      };
    }

    // GET /api/admin/pricing
    if (path === '/api/admin/pricing' && method === 'GET') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonalPricing: [],
          coupons: []
        })
      };
    }

    // GET /api/admin/bookings
    if (path === '/api/admin/bookings' && method === 'GET') {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          unit:units(id,name,property:properties(id,name)),
          user:users(id,email,first_name,last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

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
          bookings: bookings || [],
      try {
        // Handle base64 upload
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
          console.error(`❌ [${requestId}] Upload error:`, JSON.stringify(error, null, 2));
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
        console.error(`❌ [${requestId}] Upload error:`, JSON.stringify(error, null, 2));
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

// Image serving handler - COMPLETE REWRITE FOR SUPABASE STORAGE
async function handleImageServe(path: string, supabase: any, requestId: string) {
  console.log(`🖼️ [${requestId}] === IMAGE SERVING FORENSIC AUDIT ===`);
  console.log(`🖼️ [${requestId}] Requested path: ${path}`);
  console.log(`🖼️ [${requestId}] Full URL analysis:`, {
    originalPath: path,
    pathLength: path.length,
    startsWithUploads: path.startsWith('/uploads/'),
    pathSegments: path.split('/')
  });
  
  try {
    const filename = path.replace('/uploads/', '');
    console.log(`🖼️ [${requestId}] Extracted filename: "${filename}"`);
    console.log(`🖼️ [${requestId}] Filename analysis:`, {
      filename,
      filenameLength: filename.length,
      hasExtension: filename.includes('.'),
      extension: filename.split('.').pop(),
      isJpg: filename.toLowerCase().endsWith('.jpg'),
      isPng: filename.toLowerCase().endsWith('.png')
    });
    
    if (!filename || filename.trim() === '') {
      console.error(`❌ [${requestId}] Invalid filename - empty or null`);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Invalid filename',
          requestId,
          forensic: {
            originalPath: path,
            extractedFilename: filename
          }
        })
      };
    }
    
    console.log(`🖼️ [${requestId}] === SUPABASE STORAGE CHECK ===`);
    console.log(`🖼️ [${requestId}] Checking Supabase storage bucket: uploads`);
    console.log(`🖼️ [${requestId}] Looking for file: ${filename}`);
    
    // Check if file exists in Supabase Storage first
    try {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('uploads')
        .list('', {
          search: filename,
          limit: 1
        });
      
      console.log(`🖼️ [${requestId}] Supabase storage list result:`, {
        fileData: fileData || 'NO_DATA',
        fileError: fileError || 'NO_ERROR',
        fileCount: fileData ? fileData.length : 0,
        foundFile: fileData && fileData.length > 0 ? fileData[0].name : 'NONE'
      });
      
      if (fileError) {
        console.error(`❌ [${requestId}] Supabase storage list error:`, fileError);
      }
      
      if (fileData && fileData.length > 0) {
        console.log(`✅ [${requestId}] File found in Supabase storage: ${fileData[0].name}`);
        
        // Generate public URL for the file
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filename, {
            transform: {
              width: 800,
              height: 600,
              quality: 85
            }
          });
        
        console.log(`✅ [${requestId}] Generated Supabase public URL: ${publicUrl}`);
        
        // Verify the URL is accessible by making a quick check
        try {
          const response = await fetch(publicUrl, { method: 'HEAD' });
          console.log(`🖼️ [${requestId}] URL accessibility check:`, {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get('content-type')
          });
          
          if (response.ok) {
            console.log(`✅ [${requestId}] Redirecting to working Supabase URL: ${publicUrl}`);
            return {
              statusCode: 302,
              headers: {
                'Location': publicUrl,
                'Cache-Control': 'public, max-age=3600',
                'X-Request-ID': requestId,
                'X-Image-Source': 'supabase-storage'
              }
            };
          }
        } catch (fetchError) {
          console.error(`❌ [${requestId}] URL accessibility check failed:`, fetchError);
        }
      } else {
        console.log(`⚠️ [${requestId}] File NOT found in Supabase storage`);
      }
    } catch (storageError) {
      console.error(`❌ [${requestId}] Supabase storage check EXCEPTION:`, storageError);
    }
    
    // FALLBACK: Try to serve from legacy /uploads/ directory (for compatibility)
    console.log(`🖼️ [${requestId}] === LEGACY FALLBACK ATTEMPT ===`);
    console.log(`⚠️ [${requestId}] This should NOT happen in production - files should be in Supabase Storage`);
    
    // Generate a placeholder URL as final fallback
    const placeholderUrl = `https://picsum.photos/800/600?random=${Date.now()}`;
    console.log(`⚠️ [${requestId}] Using placeholder fallback: ${placeholderUrl}`);
    console.log(`🖼️ [${requestId}] === IMAGE SERVE SUMMARY ===`);
    console.log(`❌ [${requestId}] FAILED to serve image from any source`);
    console.log(`🖼️ [${requestId}] Root cause: Image not found in Supabase Storage`);
    console.log(`🖼️ [${requestId}] Required action: Upload images to Supabase Storage bucket 'uploads'`);
    
    return {
      statusCode: 302,
      headers: {
        'Location': placeholderUrl,
        'Cache-Control': 'public, max-age=300', // Shorter cache for placeholders
        'X-Request-ID': requestId,
        'X-Image-Source': 'placeholder-fallback',
        'X-Error-Reason': 'file-not-found-in-supabase-storage'
      }
    };
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Image serve CRITICAL ERROR:`, JSON.stringify(error, null, 2));
    console.error(`❌ [${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Final fallback - always return something
    const emergencyPlaceholder = `https://picsum.photos/400/300?error=${Date.now()}`;
    return {
      statusCode: 302,
      headers: {
        'Location': emergencyPlaceholder,
        'Cache-Control': 'no-cache',
        'X-Request-ID': requestId,
        'X-Image-Source': 'emergency-fallback',
        'X-Error-Reason': 'critical-server-error'
      }
    };
  }
}

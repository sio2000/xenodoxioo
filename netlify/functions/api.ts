// Main API function - simple Supabase connection without express
export const handler = async (event: any, context: any) => {
  console.log('=== MAIN API FUNCTION CALLED ===');
  
  try {
    // Get the path from the event
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || 'GET';
    
    console.log(`📝 ${method} ${path}`);

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Missing Supabase configuration',
          error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
        })
      };
    }

    // Import Supabase dynamically
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('✅ Connected to Supabase');

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
        console.log('ℹ️ No properties found');
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

        // Parse mainImage and galleryImages for property
        let parsedMainImage = property.main_image;
        let parsedGalleryImages = [];
        
        // Only attempt JSON.parse if the field looks like JSON (starts with [ or {)
        if (property.main_image && (property.main_image.startsWith('[') || property.main_image.startsWith('{'))) {
          try {
            parsedMainImage = JSON.parse(property.main_image);
          } catch (error) {
            console.log("⚠️ Failed to parse mainImage for property:", property.id, error);
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
              } else {
                parsedGalleryImages = property.gallery_images;
              }
            } else if (Array.isArray(property.gallery_images)) {
              parsedGalleryImages = property.gallery_images;
            }
          } catch (error) {
            console.log("⚠️ Failed to parse galleryImages for property:", property.id, error);
            parsedGalleryImages = [];
          }
        }
        }

        const parsedUnits = propertyUnits.map((unit: any) => {
          let parsedImages = [];
          if (unit.images) {
            try {
              if (typeof unit.images === 'string') {
                parsedImages = JSON.parse(unit.images);
              } else if (Array.isArray(unit.images)) {
                parsedImages = unit.images;
              }
            } catch (error) {
              console.log("⚠️ Failed to parse images for unit:", unit.id, error);
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
            basePrice: unit.base_price,
            cleaningFee: unit.cleaning_fee,
            minStayDays: unit.min_stay_days,
            isActive: unit.is_active
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
          mainImage: parsedMainImage,
          galleryImages: parsedGalleryImages,
          isActive: property.is_active,
          createdAt: property.created_at,
          updatedAt: property.updated_at,
          units: parsedUnits,
          unitsCount: propertyUnits.length,
          startingFrom: minPrice,
          _count: {
            units: propertyUnits.length,
          },
          _min: {
            basePrice: minPrice,
          },
        };
      });

      console.log(` Returning ${aggregatedProperties.length} complete properties`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: aggregatedProperties.map(property => ({
            ...property,
            units: property.units || [] // Put units at property level for frontend
          }))
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
      return await handleImageServe(path, supabase);
    }

    // Handle admin routes
    if (path.startsWith('/api/admin/')) {
      return await handleAdminRoutes(path, method, supabase, event);
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
    console.error('❌ Function error:', error);
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
};

// Admin routes handler
async function handleAdminRoutes(path: string, method: string, supabase: any, event: any) {
  console.log(`🔧 [ADMIN] ${method} ${path}`);

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
          totalPages: 1
        })
      };
    }

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

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
          users: users || []
        })
      };
    }

    // POST /api/admin/upload-image
    if (path === '/api/admin/upload-image' && method === 'POST') {
      // For now, return a placeholder URL
      // In production, you'd upload to Supabase storage or similar
      const placeholderUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          imageUrl: placeholderUrl
        })
      };
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

// Image serving handler
async function handleImageServe(path: string, supabase: any) {
  console.log(`🖼️ [IMAGE] Serving: ${path}`);
  
  try {
    const filename = path.replace('/uploads/', '');
    
    // Check if this is a real uploaded file in the uploads directory
    const fs = await import('fs');
    const pathModule = await import('path');
    
    const uploadsDir = pathModule.join(process.cwd(), 'uploads');
    const filePath = pathModule.join(uploadsDir, filename);
    
    // Check if file exists locally
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      const ext = filename.split('.').pop()?.toLowerCase();
      
      const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                        ext === 'png' ? 'image/png' :
                        ext === 'gif' ? 'image/gif' :
                        ext === 'webp' ? 'image/webp' :
                        'image/jpeg';
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600'
        },
        body: fileContent.toString('base64'),
        isBase64Encoded: true
      };
    }
    
    // Fallback to placeholder if file not found
    const placeholderUrl = `https://picsum.photos/400/300?random=${filename}`;
    
    return {
      statusCode: 302,
      headers: {
        'Location': placeholderUrl,
        'Cache-Control': 'public, max-age=3600'
      }
    };
    
  } catch (error: any) {
    console.error('❌ Image serve error:', error);
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Image not found',
        error: error.message
      })
    };
  }
}

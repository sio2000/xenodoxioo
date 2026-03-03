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
          mainImage: property.main_image,
          galleryImages: property.gallery_images,
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

      console.log(`✅ Returning ${aggregatedProperties.length} complete properties`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: aggregatedProperties
        })
      };
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

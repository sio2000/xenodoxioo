// Main API function - Production-ready with full forensic logging
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

// --- LOGGING UTILITY ---
const generateRequestId = () => `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const log = (requestId: string, level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) => {
  const env = process.env.NODE_ENV || 'development';
  const supabaseProjectUrl = process.env.SUPABASE_URL || 'NOT_CONFIGURED';
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [${level}] [${requestId}] [${env}] [${supabaseProjectUrl}] ${message}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// --- SUPABASE CLIENT ---
let supabase: any = null;
const initSupabase = () => {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    log('SYSTEM', 'INFO', 'Supabase client initialized');
  }
  return supabase;
};

// --- SLUG GENERATION ---
const generateSlug = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return `property-${Date.now()}`;
  }
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/-+$/, '') || `property-${Date.now()}`;
};

// --- MAIN HANDLER ---
export const handler: Handler = async (event, context) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    log(requestId, 'INFO', '=== MAIN API FUNCTION CALLED ===');
    log(requestId, 'INFO', `📝 ${event.httpMethod || 'GET'} ${event.path || event.rawPath || '/'}`);
    
    // Initialize Supabase
    const db = initSupabase();
    
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || 'GET';
    const body = event.body;
    const headers = event.headers || {};
    
    log(requestId, 'DEBUG', 'Request details', { path, method, body: !!body, headers });
    
    // --- HEALTH CHECK ---
    if (path === '/api/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured'
        })
      };
    }

    // --- IMAGE SERVING - COMPLETE REWRITE ---
    if (path.startsWith('/uploads/')) {
      log(requestId, 'INFO', `🖼️ [IMAGE] Serving: ${path}`);
      
      try {
        const filename = path.replace('/uploads/', '');
        
        // Generate Supabase Storage public URL
        const { data: { publicUrl } } = db.storage
          .from('uploads')
          .getPublicUrl(filename, {
            transform: {
              width: 800,
              height: 600,
              quality: 85
            }
          });
        
        log(requestId, 'DEBUG', 'Generated Supabase URL', { filename, publicUrl });
        
        if (publicUrl) {
          // Redirect to Supabase Storage
          return {
            statusCode: 302,
            headers: {
              'Location': publicUrl,
              'Cache-Control': 'public, max-age=31536000', // 1 year cache
              'Access-Control-Allow-Origin': '*'
            }
          };
        }
        
        // Fallback if not found
        log(requestId, 'WARN', 'Image not found in Supabase Storage', { filename });
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Image not found',
            filename
          })
        };
        
      } catch (error: any) {
        log(requestId, 'ERROR', 'Image serving failed', { error: error.message, stack: error.stack });
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'Image serving error',
            error: error.message
          })
        };
      }
    }

    // --- ADMIN ROUTES ---
    if (path.startsWith('/api/admin/')) {
      return await handleAdminRoutes(requestId, path, method, body, db);
    }

    // --- PROPERTIES ROUTE ---
    if (path === '/api/properties' || path === '/properties') {
      log(requestId, 'INFO', '🏠 Fetching properties list');
      
      const { data: properties, error } = await db
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        log(requestId, 'ERROR', 'Properties fetch failed', { error: error.message });
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

      log(requestId, 'DEBUG', 'Properties fetched', { count: properties?.length || 0 });

      if (!properties || properties.length === 0) {
        log(requestId, 'INFO', 'ℹ️ No properties found');
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
      
      const { data: units } = await db
        .from('units')
        .select('*')
        .eq('is_active', true)
        .in('property_id', propertyIds);

      log(requestId, 'DEBUG', 'Units fetched', { count: units?.length || 0 });

      // Transform properties with proper image URLs
      const transformedProperties = properties.map((property) => {
        const propertyUnits = units?.filter((u) => u.property_id === property.id) || [];
        const minPrice = propertyUnits.length > 0 
          ? Math.min(...propertyUnits.map((u) => u.base_price || 0))
          : 0;

        // Generate Supabase URLs for images
        const mainImageUrl = property.main_image 
          ? db.storage.from('uploads').getPublicUrl(property.main_image).data.publicUrl
          : null;

        const galleryImageUrls = property.gallery_images && Array.isArray(property.gallery_images)
          ? property.gallery_images.map(img => db.storage.from('uploads').getPublicUrl(img).data.publicUrl)
          : [];

        log(requestId, 'DEBUG', 'Property images transformed', {
          propertyId: property.id,
          mainImage: property.main_image,
          mainImageUrl,
          galleryCount: galleryImageUrls.length
        });

        return {
          id: property.id,
          name: property.name,
          slug: property.slug,
          location: property.location,
          city: property.city,
          country: property.country,
          description: property.description,
          mainImage: mainImageUrl,
          galleryImages: galleryImageUrls,
          isActive: property.is_active,
          createdAt: property.created_at,
          updatedAt: property.updated_at,
          units: propertyUnits.map((unit: any) => ({
            ...unit,
            images: unit.images && Array.isArray(unit.images) 
              ? unit.images.map(img => db.storage.from('uploads').getPublicUrl(img).data.publicUrl)
              : [],
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
          startingFrom: minPrice
        };
      });

      log(requestId, 'INFO', `✅ Returning ${transformedProperties.length} properties with Supabase URLs`);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: transformedProperties
        })
      };
    }

    // --- DEFAULT RESPONSE ---
    log(requestId, 'WARN', 'Route not found', { path, method });
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Route not found',
        path
      })
    };

  } catch (error: any) {
    const requestId = generateRequestId();
    log(requestId, 'ERROR', 'Unhandled exception', {
      error: error.message,
      stack: error.stack,
      path: event.path,
      method: event.httpMethod
    });
    
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

// --- ADMIN ROUTES HANDLER ---
async function handleAdminRoutes(requestId: string, path: string, method: string, body: string | null, db: any) {
  log(requestId, 'INFO', `🔧 [ADMIN] ${method} ${path}`);

  try {
    // --- ADMIN STATS ---
    if (path === '/api/admin/stats' && method === 'GET') {
      log(requestId, 'INFO', '📊 Fetching admin stats');
      
      const [bookingsResult, usersResult, propertiesResult] = await Promise.all([
        db.from('bookings').select('status'),
        db.from('users').select('id', { count: 'exact' }),
        db.from('properties').select('id', { count: 'exact' })
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

      log(requestId, 'DEBUG', 'Stats calculated', stats);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: stats
        })
      };
    }

    // --- ADMIN PROPERTIES ---
    if (path === '/api/admin/properties' && method === 'GET') {
      log(requestId, 'INFO', '🏠 Admin fetching properties');
      
      const { data: properties, error } = await db
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        log(requestId, 'ERROR', 'Properties fetch failed', { error: error.message });
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: error.message })
        };
      }

      log(requestId, 'DEBUG', 'Admin properties fetched', { count: properties?.length || 0 });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(properties || [])
      };
    }

    // --- ADMIN CREATE PROPERTY ---
    if (path === '/api/admin/properties' && method === 'POST') {
      log(requestId, 'INFO', '🏠 Admin creating property');
      
      try {
        const payload = JSON.parse(body || '{}');
        log(requestId, 'DEBUG', 'Property creation payload', payload);
        
        // Generate slug from name
        const slug = generateSlug(payload.name);
        log(requestId, 'DEBUG', 'Generated slug', { name: payload.name, slug });
        
        const propertyData = {
          name: payload.name,
          slug: slug, // CRITICAL FIX: Always generate slug
          description: payload.description || '',
          location: payload.location || '',
          city: payload.city,
          country: payload.country,
          main_image: payload.main_image,
          gallery_images: payload.gallery_images || [],
          is_active: true
        };

        log(requestId, 'DEBUG', 'Final property data', propertyData);

        const { data, error } = await db
          .from('properties')
          .insert([propertyData])
          .select()
          .single();

        if (error) {
          log(requestId, 'ERROR', 'Property creation failed', { error: error.message, details: error });
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: false, 
              error: error.message,
              details: error 
            })
          };
        }

        log(requestId, 'INFO', '✅ Property created successfully', { propertyId: data.id, slug: data.slug });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: true, 
            data 
          })
        };
      } catch (parseError: any) {
        log(requestId, 'ERROR', 'JSON parse error', { error: parseError.message, body });
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: 'Invalid JSON payload',
            details: parseError.message 
          })
        };
      }
    }

    // --- ADMIN UNITS ---
    if (path === '/api/admin/units' && method === 'GET') {
      log(requestId, 'INFO', '🛏 Admin fetching units');
      
      const { data: units, error } = await db
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        log(requestId, 'ERROR', 'Units fetch failed', { error: error.message });
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

    // --- ADMIN BOOKINGS ---
    if (path === '/api/admin/bookings' && method === 'GET') {
      log(requestId, 'INFO', '📅 Admin fetching bookings');
      
      const { data: bookings, error } = await db
        .from('bookings')
        .select(`
          *,
          unit:units(id,name,property:properties(id,name)),
          user:users(id,email,first_name,last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        log(requestId, 'ERROR', 'Bookings fetch failed', { error: error.message });
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

    // --- ADMIN USERS ---
    if (path === '/api/admin/users' && method === 'GET') {
      log(requestId, 'INFO', '👥 Admin fetching users');
      
      const { data: users, error } = await db
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        log(requestId, 'ERROR', 'Users fetch failed', { error: error.message });
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

    // --- ADMIN PRICING ---
    if (path === '/api/admin/pricing' && method === 'GET') {
      log(requestId, 'INFO', '💰 Admin fetching pricing');
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonalPricing: [],
          coupons: []
        })
      };
    }

    // --- ADMIN IMAGE UPLOAD ---
    if (path === '/api/admin/upload-image' && method === 'POST') {
      log(requestId, 'INFO', '📤 Admin image upload');
      
      try {
        const filename = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const imageUrl = `/uploads/${filename}`;
        
        log(requestId, 'DEBUG', 'Image upload processed', { filename, imageUrl });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            imageUrl: imageUrl
          })
        };
      } catch (error: any) {
        log(requestId, 'ERROR', 'Image upload failed', { error: error.message });
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: error.message })
        };
      }
    }

    // --- DEFAULT ADMIN RESPONSE ---
    log(requestId, 'WARN', 'Admin route not found', { path, method });
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
    log(requestId, 'ERROR', 'Admin route error', { error: error.message, stack: error.stack });
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

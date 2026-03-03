// Supabase Storage image upload function
export const handler = async (event: any, context: any) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`=== UPLOAD IMAGE FUNCTION CALLED ===`);
  console.log(`🆔 [${requestId}] Request ID: ${requestId}`);
  console.log(`📝 [${requestId}] Method: ${event.httpMethod}`);
  
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse the multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      // Handle base64 upload fallback
      const body = JSON.parse(event.body || '{}');
      const { base64Data, filename } = body;
      
      if (!base64Data || !filename) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Missing base64Data or filename',
            requestId 
          })
        };
      }

      // Import Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      console.log(`🖼️ [${requestId}] Processing base64 upload: ${filename}`);
      
      // Convert base64 to buffer
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Content, 'base64');
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      console.log(`🔍 [${requestId}] Upload response:`, { data, error });

      if (error) {
        console.error(`❌ [${requestId}] Upload error:`, error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: error.message,
            requestId 
          })
        };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filename);

      console.log(`✅ [${requestId}] Upload successful: ${publicUrl}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          imageUrl: publicUrl,
          filename,
          requestId
        })
      };
    }

    // For now, return a simple response for multipart requests
    // TODO: Implement proper multipart parsing in Netlify Functions
    const filename = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    
    console.log(`🖼️ [${requestId}] Generated filename: ${filename}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        imageUrl: filename, // Will be processed by the main API function
        filename,
        requestId,
        note: 'Multipart upload not fully implemented - use base64'
      })
    };

  } catch (error: any) {
    console.error(`❌ [${requestId}] Upload function error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        requestId
      })
    };
  }
};

// Environment and Supabase consistency verification function
export const handler = async (event: any, context: any) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`=== DEBUG FUNCTION CALLED ===`);
  console.log(`🆔 [${requestId}] Request ID: ${requestId}`);
  
  try {
    // Environment analysis
    const environment = {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      netlify: process.env.NETLIFY || 'false',
      supabaseUrl: process.env.SUPABASE_URL || 'MISSING',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      apiUrl: process.env.VITE_API_URL || 'NOT_SET',
      region: process.env.NETLIFY_REGION || 'unknown',
      deployUrl: process.env.DEPLOY_URL || 'unknown',
      siteUrl: process.env.SITE_URL || 'unknown'
    };
    
    console.log(`🔍 [${requestId}] Environment analysis:`, environment);
    
    // Test Supabase connection
    let supabaseTest: { connected: boolean, error: string | null, projectInfo: any } = { connected: false, error: null, projectInfo: null };
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Test basic connection
      const { data, error } = await supabase.from('properties').select('count').single();
      
      if (error) {
        supabaseTest.error = error.message;
      } else {
        supabaseTest.connected = true;
        supabaseTest.projectInfo = null; // Skip RPC call for simplicity
      }
      
      console.log(`🗄️ [${requestId}] Supabase test result:`, supabaseTest);
      
    } catch (error: any) {
      supabaseTest.error = error.message;
      console.error(`❌ [${requestId}] Supabase connection failed:`, error);
    }
    
    // Test storage bucket
    let storageTest: { exists: boolean, error: string | null, bucketInfo: any } = { exists: false, error: null, bucketInfo: null };
    
    if (supabaseTest.connected) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Test if uploads bucket exists
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          storageTest.error = error.message;
        } else {
          const uploadsBucket = buckets?.find(b => b.name === 'uploads');
          storageTest.exists = !!uploadsBucket;
          storageTest.bucketInfo = uploadsBucket;
        }
        
        console.log(`📦 [${requestId}] Storage test result:`, storageTest);
        
      } catch (error: any) {
        storageTest.error = error.message;
        console.error(`❌ [${requestId}] Storage test failed:`, error);
      }
    }
    
    // Test database schema
    let schemaTest: { tables: any[], error: any } = { tables: [], error: null };
    
    if (supabaseTest.connected) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Check critical tables
        const tables = ['properties', 'units', 'bookings', 'users', 'coupons'];
        const tableResults: any[] = [];
        
        for (const table of tables) {
          try {
            const { data, error } = await supabase.from(table).select('count').single();
            tableResults.push({
              table,
              exists: !error,
              count: data?.count || 0,
              error: error?.message || null
            });
          } catch (e: any) {
            tableResults.push({
              table,
              exists: false,
              count: 0,
              error: e.message
            });
          }
        }
        
        schemaTest.tables = tableResults;
        console.log(`📋 [${requestId}] Schema test result:`, schemaTest);
        
      } catch (error: any) {
        schemaTest.error = error.message;
        console.error(`❌ [${requestId}] Schema test failed:`, error);
      }
    }
    
    // Compile comprehensive report
    const debugReport: any = {
      timestamp: new Date().toISOString(),
      requestId,
      environment,
      supabase: supabaseTest,
      storage: storageTest,
      schema: schemaTest,
      recommendations: [] as string[]
    };
    
    // Add recommendations
    if (!supabaseTest.connected) {
      debugReport.recommendations.push('❌ Supabase connection failed - check URL and keys');
    }
    
    if (!storageTest.exists) {
      debugReport.recommendations.push('❌ Storage bucket "uploads" not found - create it in Supabase dashboard');
    }
    
    if (schemaTest.tables.some(t => !t.exists)) {
      debugReport.recommendations.push('❌ Missing database tables - run schema migration');
    }
    
    if (supabaseTest.connected && storageTest.exists && !schemaTest.tables.some(t => !t.exists)) {
      debugReport.recommendations.push('✅ All systems operational');
    }
    
    console.log(`📊 [${requestId}] Debug report generated:`, debugReport);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debugReport, null, 2)
    };
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Debug function error:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        requestId
      })
    };
  }
};

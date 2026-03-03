const http = require('http');

// Test what the frontend receives
async function testFrontendData() {
  console.log('🔍 TESTING FRONTEND DATA FLOW');
  
  try {
    // Test what properties route returns
    console.log('\n🏠 Properties route response:');
    const properties = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/admin/properties',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log('Type:', typeof properties);
    console.log('Is Array:', Array.isArray(properties));
    console.log('Length:', properties?.length || 'N/A');
    console.log('Sample:', properties?.[0] ? {
      id: properties[0].id,
      name: properties[0].name,
      main_image: properties[0].main_image
    } : 'No data');
    
    // Test what stats route returns
    console.log('\n📊 Stats route response:');
    const stats = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/admin/stats',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log('Type:', typeof stats);
    console.log('Has data:', !!stats?.data);
    console.log('Data keys:', stats?.data ? Object.keys(stats.data) : 'No data');
    
    // Test pricing route
    console.log('\n🎫 Pricing route response:');
    const pricing = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/admin/pricing',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log('Type:', typeof pricing);
    console.log('Has coupons:', !!pricing?.coupons);
    console.log('Coupons length:', pricing?.coupons?.length || 0);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testFrontendData();

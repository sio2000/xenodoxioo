const http = require('http');

// Test function for each route
async function testRoute(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode < 400,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            success: res.statusCode < 400,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 TESTING ADMIN ROUTES');
  
  try {
    // Test stats
    console.log('\n📊 Testing /api/admin/stats...');
    const stats = await testRoute('GET', '/api/admin/stats');
    console.log(`Status: ${stats.status}, Success: ${stats.success}`);
    
    // Test properties
    console.log('\n🏠 Testing /api/admin/properties...');
    const properties = await testRoute('GET', '/api/admin/properties');
    console.log(`Status: ${properties.status}, Success: ${properties.success}, Count: ${properties.data?.length || 0}`);
    
    // Test create property
    console.log('\n➕ Testing property creation...');
    const newProperty = {
      name: 'Test Villa ' + Date.now(),
      description: 'Beautiful test villa',
      location: 'Test Location',
      city: 'Athens',
      country: 'Greece',
      slug: 'test-villa-' + Date.now(),
      main_image: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Property',
      gallery_images: [],
      is_active: true
    };
    const created = await testRoute('POST', '/api/admin/properties', newProperty);
    console.log(`Status: ${created.status}, Success: ${created.success}`);
    
    // Test units
    console.log('\n🏢 Testing /api/admin/units...');
    const units = await testRoute('GET', '/api/admin/units');
    console.log(`Status: ${units.status}, Success: ${units.success}, Count: ${units.data?.length || 0}`);
    
    // Test create unit
    if (properties.data && properties.data.length > 0) {
      console.log('\n➕ Testing unit creation...');
      const newUnit = {
        property_id: properties.data[0].id,
        name: 'Test Unit ' + Date.now(),
        slug: 'test-unit-' + Date.now(),
        description: 'Test unit description',
        max_guests: 4,
        bedrooms: 2,
        bathrooms: 1,
        beds: 2,
        base_price: 150,
        cleaning_fee: 50,
        min_stay_days: 1,
        is_active: true
      };
      const createdUnit = await testRoute('POST', '/api/admin/units', newUnit);
      console.log(`Status: ${createdUnit.status}, Success: ${createdUnit.success}`);
    }
    
    // Test coupons
    console.log('\n🎫 Testing /api/admin/pricing...');
    const pricing = await testRoute('GET', '/api/admin/pricing');
    console.log(`Status: ${pricing.status}, Success: ${pricing.success}`);
    console.log(`Coupons: ${pricing.data?.coupons?.length || 0}, Seasonal: ${pricing.data?.seasonalPricing?.length || 0}`);
    
    // Test create coupon
    console.log('\n➕ Testing coupon creation...');
    const newCoupon = {
      code: 'TEST' + Date.now().toString().slice(-4),
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_booking_amount: 100,
      max_uses: 10,
      valid_from: '2026-03-02',
      valid_until: '2026-12-31',
      is_active: true
    };
    const createdCoupon = await testRoute('POST', '/api/admin/coupons', newCoupon);
    console.log(`Status: ${createdCoupon.status}, Success: ${createdCoupon.success}`);
    
    console.log('\n🎉 ALL TESTS COMPLETED!');
    
  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
  }
}

runTests();

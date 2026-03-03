
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkStorage() {
  const prisma = new PrismaClient();
  
  try {
    console.log('--- IMAGE STORAGE ANALYSIS ---');
    
    // Get image URLs from properties
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        mainImage: true,
        galleryImages: true
      },
      take: 5
    });
    
    console.log('Property images:');
    properties.forEach(prop => {
      console.log(`  ${prop.name} (${prop.id}):`);
      console.log(`    Main: ${prop.mainImage}`);
      
      // Analyze main image
      if (prop.mainImage) {
        const isHttps = prop.mainImage.startsWith('https://');
        const isSupabase = prop.mainImage.includes('supabase.co');
        const isLocalhost = prop.mainImage.includes('localhost');
        const isUploads = prop.mainImage.includes('/uploads/');
        
        console.log(`    Analysis: HTTPS=${isHttps}, Supabase=${isSupabase}, Localhost=${isLocalhost}, Uploads=${isUploads}`);
        
        if (!isHttps || !isSupabase || isLocalhost || isUploads) {
          console.log(`    ❌ INVALID IMAGE URL DETECTED`);
        } else {
          console.log(`    ✅ Valid Supabase URL`);
        }
      }
      
      // Check gallery images
      if (prop.galleryImages) {
        try {
          const gallery = JSON.parse(prop.galleryImages);
          if (gallery.length > 0) {
            console.log(`    Gallery sample: ${gallery[0]}`);
          }
        } catch (e) {
          console.log(`    Gallery parse error`);
        }
      }
    });
    
    // Get image URLs from units
    const units = await prisma.unit.findMany({
      select: {
        id: true,
        name: true,
        images: true
      },
      take: 3
    });
    
    console.log('\nUnit images:');
    units.forEach(unit => {
      console.log(`  ${unit.name} (${unit.id}):`);
      if (unit.images) {
        try {
          const images = JSON.parse(unit.images);
          if (images.length > 0) {
            console.log(`    Sample: ${images[0]}`);
            
            const isHttps = images[0].startsWith('https://');
            const isSupabase = images[0].includes('supabase.co');
            const isLocalhost = images[0].includes('localhost');
            const isUploads = images[0].includes('/uploads/');
            
            console.log(`    Analysis: HTTPS=${isHttps}, Supabase=${isSupabase}, Localhost=${isLocalhost}, Uploads=${isUploads}`);
          }
        } catch (e) {
          console.log(`    Images parse error`);
        }
      }
    });
    
  } catch (error) {
    console.log('Storage check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStorage();

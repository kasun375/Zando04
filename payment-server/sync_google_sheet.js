// =====================================================
// ZANDO — Sync Google Sheets directly to Firestore
// =====================================================

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey:            'AIzaSyCAMt4rLwtm5htZhPZnWdT-bjyzGxnstPM',
  authDomain:        'zando-b574e.firebaseapp.com',
  projectId:         'zando-b574e',
  storageBucket:     'zando-b574e.appspot.com',
  messagingSenderId: '20423532374',
  appId:             '1:20423532374:web:213ad3f80bc841a9d880f7',
  measurementId:     'G-SM7F64PL0V'
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

function convertToDirectLink(url) {
  if (!url) return '';
  const lhMatch = url.match(/lh3\.googleusercontent\.com\/(?:u\/\d+\/)?d\/([^/?#&]+)/);
  if (lhMatch) return `https://lh3.googleusercontent.com/d/${lhMatch[1]}`;
  const driveMatch1 = url.match(/drive\.google\.com\/file\/d\/([^/?#&]+)/);
  if (driveMatch1) return `https://lh3.googleusercontent.com/d/${driveMatch1[1]}`;
  const driveMatch2 = url.match(/drive\.google\.com\/(?:uc|open|thumbnail)\?.*id=([^&?#]+)/);
  if (driveMatch2) return `https://lh3.googleusercontent.com/d/${driveMatch2[1]}`;
  return url;
}

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

async function runSync() {
  console.log('🔄 Starting Google Sheets sync to Firestore...');
  const defaultProductSheetId = '1yk_RTBEhvyr-2AUqBCCrMOhuz_-yuOMl9xYEcnKgOUY';

  // 1. Fetch Products CSV
  const productsUrl = `https://docs.google.com/spreadsheets/d/${defaultProductSheetId}/export?format=csv`;
  console.log('Fetching products from:', productsUrl);
  const productsRes = await fetch(productsUrl);
  if (!productsRes.ok) throw new Error(`Failed to fetch products sheet: ${productsRes.statusText}`);
  const productsText = await productsRes.text();
  const productRows = parseCSV(productsText);
  if (productRows.length > 0) productRows.shift(); // Remove header

  // 2. Fetch Banners CSV
  const bannersUrl = `https://docs.google.com/spreadsheets/d/${defaultProductSheetId}/export?format=csv&gid=1274288907`;
  console.log('Fetching banners from:', bannersUrl);
  const bannersRes = await fetch(bannersUrl);
  if (!bannersRes.ok) throw new Error(`Failed to fetch banners sheet: ${bannersRes.statusText}`);
  const bannersText = await bannersRes.text();
  const bannerRows = parseCSV(bannersText);
  if (bannerRows.length > 0) bannerRows.shift(); // Remove header

  // 3. Clear existing products
  console.log('Clearing existing Firestore products...');
  const productsCol = collection(db, 'products');
  const productsSnap = await getDocs(productsCol);
  const prodBatch = writeBatch(db);
  productsSnap.docs.forEach(d => {
    prodBatch.delete(doc(db, 'products', d.id));
  });
  await prodBatch.commit();

  // 4. Clear existing banners
  console.log('Clearing existing Firestore banners...');
  const bannersCol = collection(db, 'banners');
  const bannersSnap = await getDocs(bannersCol);
  const banBatch = writeBatch(db);
  bannersSnap.docs.forEach(d => {
    banBatch.delete(doc(db, 'banners', d.id));
  });
  await banBatch.commit();

  // 5. Add new products
  const finalProducts = productRows.map(row => {
    if (row.length < 5) return null;
    const name = (row[0] || '').trim();
    if (!name) return null;

    const priceRaw = (row[2] || '0').toString().replace(/[^0-9.]/g, '').trim();
    const priceNum = parseFloat(priceRaw) || 0.0;

    const rawImageUrl = (row[3] || '').trim();
    const imageUrls = rawImageUrl.split(',').map(u => u.trim()).filter(Boolean);
    const mainImageUrl = imageUrls[0] ? convertToDirectLink(imageUrls[0]) : '';
    let galleryImages = [];
    if (imageUrls.length > 1) {
      galleryImages = imageUrls.slice(1).map(convertToDirectLink);
    }
    if (row.length > 7) {
      const rawGallery = (row[7] || '').trim();
      if (rawGallery) {
        galleryImages = rawGallery.split(',').map(u => convertToDirectLink(u.trim())).filter(Boolean);
      }
    }

    return {
      name,
      description: (row[1] || '').trim(),
      price: priceNum,
      imageUrl: mainImageUrl,
      category: (row[4] || '').trim(),
      shop: row.length > 6 ? (row[6] || '').trim() : '',
      isFeatured: (row[5] || '').trim().toLowerCase() === 'true',
      galleryImages,
      rating: 4.5,
      reviewsCount: 12,
    };
  }).filter(Boolean);

  console.log(`Uploading ${finalProducts.length} products to Firestore...`);
  for (const prod of finalProducts) {
    await addDoc(productsCol, prod);
    console.log(`  + Product: "${prod.name}" | Price: LKR ${prod.price} | Category: ${prod.category}`);
  }

  // 6. Add new banners
  const finalBanners = bannerRows.map(row => {
    if (row.length < 1) return null;
    const url = (row[0] || '').trim();
    if (!url) return null;
    const title = row.length > 1 ? (row[1] || '').trim() : '';
    return {
      imageUrl: convertToDirectLink(url),
      title: title || null,
    };
  }).filter(Boolean);

  console.log(`Uploading ${finalBanners.length} banners to Firestore...`);
  for (const ban of finalBanners) {
    await addDoc(bannersCol, ban);
    console.log(`  + Banner: ${ban.title || 'Untitled'} | URL: ${ban.imageUrl}`);
  }

  console.log('\n✅ Sync complete! All products and banners successfully pulled from Google Sheets into Firestore with LKR prices.\n');
  process.exit(0);
}

runSync().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});

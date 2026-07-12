// =====================================================
// ZANDO WEB — js/products.js
// Firestore product fetching, search, filtering
// =====================================================

import {
  collection, getDocs, deleteDoc, doc, onSnapshot, writeBatch, addDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { setState, getState } from './state.js';
import { convertToDirectLink } from './utils.js';

// Live listener unsubscribe
let _unsubscribe = null;

// Initialize live product listener
export function initProducts(onChange) {
  if (_unsubscribe) _unsubscribe();

  const q = collection(window._db, 'products');
  _unsubscribe = onSnapshot(q, (snap) => {
    const products = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      imageUrl: convertToDirectLink(d.data().imageUrl || ''),
      galleryImages: (d.data().galleryImages || []).map(convertToDirectLink),
    }));

    const MOBILE_CATEGORIES = [
      'Mobile Phones',
      'Electronics',
      'Home Appliances',
      'Fashion',
      'Cake Shop',
      'Pooja Banda',
      'Chocolets',
      'Flower Shop',
      'Grocery Items'
    ];
    const categories = [...new Set([...MOBILE_CATEGORIES, ...products.map(p => p.category).filter(Boolean)])];
    const shops = [...new Set(products.map(p => p.shop).filter(Boolean))];

    setState({ products, categories, shops, filteredProducts: products });
    applyFilters();
    if (onChange) onChange(products);
  }, (err) => {
    console.error('Products listener error:', err);
  });
}

// Load banners from Firestore
export async function loadBanners() {
  try {
    const snap = await getDocs(collection(window._db, 'banners'));
    const banners = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      imageUrl: convertToDirectLink(d.data().imageUrl || '')
    }));
    setState({ banners });
    return banners;
  } catch (e) {
    console.error('loadBanners error:', e);
    return [];
  }
}

export function applyFilters() {
  const { products, searchQuery, selectedCategory } = getState();
  let filtered = [...products];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.shop?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }

  if (selectedCategory) {
    filtered = filtered.filter(p =>
      p.category === selectedCategory || p.shop === selectedCategory
    );
  }

  setState({ filteredProducts: filtered });
  return filtered;
}

// Set search query
export function setSearchQuery(query) {
  setState({ searchQuery: query });
  return applyFilters();
}

// Set category filter
export function setCategory(cat) {
  setState({ selectedCategory: cat });
  return applyFilters();
}

// Clear all filters
export function clearFilters() {
  setState({ searchQuery: '', selectedCategory: '' });
  return applyFilters();
}

// Delete product (admin)
export async function deleteProduct(productId) {
  await deleteDoc(doc(window._db, 'products', productId));
}

// Parse simple RFC 4180-compliant CSV string
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

// Sync from Google Sheets (populates Firestore collections)
export async function syncFromGoogleSheets() {
  const defaultProductSheetId = '1yk_RTBEhvyr-2AUqBCCrMOhuz_-yuOMl9xYEcnKgOUY';
  
  // 1. Fetch Products CSV
  const productsUrl = `https://docs.google.com/spreadsheets/d/${defaultProductSheetId}/export?format=csv`;
  const productsRes = await fetch(productsUrl);
  if (!productsRes.ok) throw new Error(`Failed to fetch products sheet: ${productsRes.statusText}`);
  const productsText = await productsRes.text();
  const productRows = parseCSV(productsText);
  
  if (productRows.length > 0) productRows.shift(); // Remove header row
  
  // 2. Fetch Banners CSV
  const bannersUrl = `https://docs.google.com/spreadsheets/d/${defaultProductSheetId}/export?format=csv&gid=1274288907`;
  const bannersRes = await fetch(bannersUrl);
  if (!bannersRes.ok) throw new Error(`Failed to fetch banners sheet: ${bannersRes.statusText}`);
  const bannersText = await bannersRes.text();
  const bannerRows = parseCSV(bannersText);
  
  if (bannerRows.length > 0) bannerRows.shift(); // Remove header row

  // 3. Clear existing products in Firestore
  const productsCol = collection(window._db, 'products');
  const productsSnap = await getDocs(productsCol);
  const prodBatch = writeBatch(window._db);
  productsSnap.docs.forEach(d => {
    prodBatch.delete(doc(window._db, 'products', d.id));
  });
  await prodBatch.commit();

  // 4. Clear existing banners in Firestore
  const bannersCol = collection(window._db, 'banners');
  const bannersSnap = await getDocs(bannersCol);
  const banBatch = writeBatch(window._db);
  bannersSnap.docs.forEach(d => {
    banBatch.delete(doc(window._db, 'banners', d.id));
  });
  await banBatch.commit();

  // 5. Add new products
  const finalProducts = productRows.map(row => {
    if (row.length < 5) return null;
    const name = (row[0] || '').trim();
    if (!name) return null;
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
      price: parseFloat((row[2] || '0').trim()) || 0.0,
      imageUrl: mainImageUrl,
      category: (row[4] || '').trim(),
      shop: row.length > 6 ? (row[6] || '').trim() : '',
      isFeatured: (row[5] || '').trim().toLowerCase() === 'true',
      galleryImages,
      rating: 4.5,
      reviewsCount: 12,
    };
  }).filter(Boolean);

  for (const prod of finalProducts) {
    await addDoc(productsCol, prod);
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

  for (const ban of finalBanners) {
    await addDoc(bannersCol, ban);
  }

  // Refresh local banners state
  await loadBanners();
}

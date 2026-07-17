// =====================================================
// ZANDO WEB — pages/home.js
// Home page — header, carousel, categories, product grid
// =====================================================

import { getState, setState, subscribe, getCartCount } from '../js/state.js';
import { setSearchQuery, setCategory, clearFilters } from '../js/products.js';
import { addToCart } from '../js/state.js';
import { toggleWishlist } from '../js/auth.js';
import { showToast, formatCurrency, renderStars, debounce, imgFallback } from '../js/utils.js';
import { navigate } from '../js/router.js';

// Carousel state
let _carouselIndex = 0;
let _carouselTimer = null;
let _carouselTotal = 0;

// Fallback banners
// Fallback banners
const FALLBACK_BANNERS = [
  {
    isMockup: true,
    title: 'Carrosel Slider'
  },
  {
    imageUrl: 'assets/images/Splash_Screen.jpg',
    title: 'Welcome to Zando',
    subtitle: 'Shop everything you need'
  },
  {
    imageUrl: 'assets/images/welcome_bg.jpg',
    title: 'Premium Collection',
    subtitle: 'Exclusive fashion and accessories'
  }
];

export function renderHome(appEl) {
  const { currentUser, userModel, filteredProducts, shops, categories, banners, selectedCategory } = getState();
  const displayBanners = banners.length > 0 ? banners : FALLBACK_BANNERS;
  _carouselTotal = displayBanners.length;

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderHeader()}
      <div class="page-content">
        <div class="page-content-inner">
          <main class="main-area" style="padding: 1.5rem 0 0 0; width: 100%;">
            ${renderTrackOrdersCard()}
            ${renderCarousel(displayBanners)}
            ${renderProductGrid()}
          </main>
        </div>
      </div>
    </div>
  `;

  // Wire up interactions
  bindHeader();
  bindCarousel(displayBanners);
  bindProductGrid();
  updateCartBadge();
  updateNotificationBadge();

  // Reactive subscription to state changes for the categories dropdown
  subscribe('categories', () => updateDropdownMenu());
  subscribe('shops', () => updateDropdownMenu());
  subscribe('banners', (newBanners) => {
    const heroContainer = document.querySelector('.home-hero');
    if (!heroContainer) return;
    const displayBanners = newBanners.length > 0 ? newBanners : FALLBACK_BANNERS;
    _carouselTotal = displayBanners.length;
    const parent = heroContainer.parentElement;
    const temp = document.createElement('div');
    temp.innerHTML = renderCarousel(displayBanners);
    const newHero = temp.firstElementChild;
    parent.replaceChild(newHero, heroContainer);
    bindCarousel(displayBanners);
  });
}

// ---- Header ----
function renderHeader() {
  const { currentUser, shops, categories, selectedCategory } = getState();
  const allCategories = [...new Set([...categories, ...shops])];

  const dropdownItems = `
    <div class="dropdown-item ${!selectedCategory ? 'active' : ''}" data-drop-cat="">
      <span class="material-icons-round" style="font-size:1.1rem;">grid_view</span> All Products
    </div>
    ${allCategories.map(c => `
      <div class="dropdown-item ${selectedCategory === c ? 'active' : ''}" data-drop-cat="${c}">
        <span class="material-icons-round" style="font-size:1.1rem;">chevron_right</span> ${c}
      </div>
    `).join('')}
  `;

  return `
    <header class="site-header">
      <div class="header-top">
        <div class="header-logo" id="home-logo-btn">
          <img src="assets/images/zando_logo.png" alt="ZANDO" class="header-logo-img" style="height: 36px; max-width: 100%; object-fit: contain;" />
        </div>

        <div class="header-search" id="header-search-wrap">
          <div class="header-search-inner">
            <input
              type="text"
              id="header-search-input"
              class="header-search-input"
              placeholder="SEARCH PRODUCTS..."
              autocomplete="off"
            />
            <button class="header-search-btn" id="search-btn" aria-label="Search">
              <span class="material-icons-round">search</span>
            </button>
          </div>
          <div class="search-overlay" id="search-overlay" style="display:none;"></div>
        </div>

        <div class="header-actions">
          ${currentUser ? `
            <button class="icon-btn" id="notification-btn" aria-label="Notifications">
              <span class="material-icons-round">notifications</span>
              <span class="btn-badge" style="display:none;">0</span>
            </button>
          ` : ''}
          <button class="icon-btn" id="cart-header-btn" aria-label="Cart">
            <span class="material-icons-round">shopping_cart</span>
            <span class="btn-badge" id="cart-badge" style="display:none;">0</span>
          </button>
          <button class="icon-btn" id="orders-header-btn" aria-label="Track Orders">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
              <rect x="2" y="9" width="12" height="9" rx="1" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1"/>
              <path d="M14 11H18.5L21 13.5V18H14V11Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1"/>
              <path d="M15 12.5H17.5L19 14H15V12.5Z" fill="#2E062B"/>
              <path d="M8 3C6.343 3 5 4.343 5 6C5 8.5 8 11.5 8 11.5C8 11.5 11 8.5 11 6C11 4.343 9.657 3 8 3Z" fill="#FFFFFF"/>
              <circle cx="8" cy="6" r="1.2" fill="#2E062B"/>
              <circle cx="5.5" cy="18.5" r="2" fill="#2E062B" stroke="#FFFFFF" stroke-width="1"/>
              <circle cx="16.5" cy="18.5" r="2" fill="#2E062B" stroke="#FFFFFF" stroke-width="1"/>
            </svg>
          </button>
          <button class="icon-btn" id="profile-header-btn" aria-label="${currentUser ? 'Profile' : 'Sign In'}">
            <span class="material-icons-round">person</span>
          </button>
        </div>
      </div>

      <nav class="category-nav">
        <div class="category-nav-inner" style="position: relative;">
          <div class="all-categories-btn-wrapper" id="all-categories-btn-wrapper" style="position: relative; display: inline-block;">
            <button class="all-categories-btn" id="all-categories-btn">
              <span class="material-icons-round">menu</span>
              All Categories
            </button>
            <div class="categories-dropdown" id="categories-dropdown">
              ${dropdownItems}
            </div>
          </div>
        </div>
      </nav>
    </header>
  `;
}

function updateDropdownMenu() {
  const dropdown = document.getElementById('categories-dropdown');
  if (!dropdown) return;

  const { categories, shops, selectedCategory } = getState();
  const allCategories = [...new Set([...categories, ...shops])];

  dropdown.innerHTML = `
    <div class="dropdown-item ${!selectedCategory ? 'active' : ''}" data-drop-cat="">
      <span class="material-icons-round" style="font-size:1.1rem;">grid_view</span> All Products
    </div>
    ${allCategories.map(c => `
      <div class="dropdown-item ${selectedCategory === c ? 'active' : ''}" data-drop-cat="${c}">
        <span class="material-icons-round" style="font-size:1.1rem;">chevron_right</span> ${c}
      </div>
    `).join('')}
  `;
}

// ---- Sidebar ----
function renderSidebar() {
  const { shops, categories, selectedCategory } = getState();
  const all = [...new Set([...categories, ...shops])];
  return `
    <aside class="sidebar" id="main-sidebar">
      <div class="sidebar-section-title">Categories</div>
      <div class="sidebar-item ${!selectedCategory ? 'active' : ''}" data-sidebar-cat="">
        <span class="material-icons-round">grid_view</span> All Products
      </div>
      ${all.map(c => `
        <div class="sidebar-item ${selectedCategory === c ? 'active' : ''}" data-sidebar-cat="${c}">
          <span class="material-icons-round">chevron_right</span> ${c}
        </div>
      `).join('')}
    </aside>
  `;
}

// ---- Track Orders card ----
function renderTrackOrdersCard() {
  const { currentUser } = getState();
  if (!currentUser) return '';
  return `
    <div class="track-orders-card" id="track-orders-card">
      <div class="track-orders-icon">
        <span class="material-icons-round">local_shipping</span>
      </div>
      <div class="track-orders-text">
        <div class="track-orders-title">Track My Oders</div>
        <div class="track-orders-sub">View active shipments &amp; history</div>
      </div>
      <div class="track-orders-arrow">
        <span class="material-icons-round">chevron_right</span>
      </div>
    </div>
  `;
}

// ---- Carousel ----
function renderCarousel(banners) {
  if (!banners.length) return '';
  const slides = banners.map(b => {
    if (b.isMockup) {
      return `
        <div class="carousel-slide mockup-slide">
          <div class="carousel-mockup-content">
          </div>
        </div>
      `;
    }
    return `
      <div class="carousel-slide">
        <img src="${b.imageUrl || ''}" alt="${b.title || 'Banner'}" loading="lazy" />
      </div>
    `;
  }).join('');

  const dots = banners.map((_, i) =>
    `<div class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`
  ).join('');

  return `
    <div class="home-hero">
      <div class="carousel" id="main-carousel">
        <div class="carousel-track" id="carousel-track">${slides}</div>
        <button class="carousel-arrow prev" id="carousel-prev" aria-label="Previous">
          <span class="material-icons-round">chevron_left</span>
        </button>
        <button class="carousel-arrow next" id="carousel-next" aria-label="Next">
          <span class="material-icons-round">chevron_right</span>
        </button>
        <div class="carousel-dots" id="carousel-dots">${dots}</div>
      </div>
      <!-- Google AdSense Ad -->
      <div class="adsense-ad-container" style="margin: 1.5rem auto 0 auto; text-align: center; max-width: 100%; overflow: hidden;">
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-1267014580635785"
             data-ad-slot="default"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>
    </div>
  `;
}

// ---- Product Grid ----
function renderProductGrid() {
  const { filteredProducts, products } = getState();

  // If we haven't loaded any products at all, show skeletons
  if (products.length === 0) {
    return `
      <div>
        <div class="products-grid" id="products-grid">
          ${renderSkeletonGrid(10)}
        </div>
      </div>
    `;
  }

  // If we have loaded products but the filtered list is empty, show empty state
  if (filteredProducts.length === 0) {
    return `
      <div>
        <div class="products-grid" id="products-grid">
          <div class="empty-state" style="grid-column:1/-1;">
            <span class="material-icons-round">search_off</span>
            <h4>No products found</h4>
            <p>Try a different search or browse a category</p>
          </div>
        </div>
      </div>
    `;
  }

  const cards = filteredProducts.map(renderProductCard).join('');
  return `
    <div>
      <div class="products-grid" id="products-grid">
        ${cards}
      </div>
    </div>
  `;
}

function renderProductCard(product) {
  if (product.id.startsWith('dummy') || !product.name) {
    return `
      <div class="product-card mockup-product-card" data-product-id="${product.id}" id="product-card-${product.id}">
        <div class="product-card-placeholder">Products</div>
      </div>
    `;
  }

  const { userModel } = getState();
  const inWishlist = userModel?.wishlist?.includes(product.id);
  const stars = product.rating > 0 ? `
    <div class="product-card-rating">
      <span class="stars">${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5 - Math.round(product.rating))}</span>
      <span>${Number(product.rating || 0).toFixed(1)} (${product.reviewsCount || 0})</span>
    </div>
  ` : '';

  const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

  return `
    <div class="product-card" data-product-id="${product.id}" id="product-card-${product.id}">
      <div class="product-card-image-wrap">
        ${product.imageUrl
          ? `<img src="${product.imageUrl}" alt="${product.name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23B1A7B4%22/%3E%3C/svg%3E'" />`
          : `<div class="product-card-placeholder">Products</div>`
        }
        ${product.isFeatured ? '<span class="product-card-badge">Featured</span>' : ''}
        <button class="product-card-wishlist ${inWishlist ? 'active' : ''}" data-wishlist-id="${product.id}" aria-label="Wishlist">
          <span class="material-icons-round">${inWishlist ? 'favorite' : 'favorite_border'}</span>
        </button>
      </div>
      <div class="product-card-body">
        ${product.shop ? `<div class="product-card-shop">${product.shop}</div>` : ''}
        <div class="product-card-name">${product.name}</div>
        ${stars}
        <div class="product-card-footer">
          <div class="product-card-price">${formatCurrency(product.price)}</div>
          <button class="product-card-add-btn" data-add-id="${product.id}" aria-label="Add to cart">
            <span class="material-icons-round">add</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSkeletonGrid(count) {
  return Array.from({ length: count }, () => `
    <div class="product-card mockup-product-card">
      <div class="product-card-placeholder">Products</div>
    </div>
  `).join('');
}

// ---- Bindings ----
function bindHeader() {
  // Logo → home
  document.getElementById('home-logo-btn')?.addEventListener('click', () => {
    clearFilters();
    navigate('home');
  });

  // Search
  const searchInput = document.getElementById('header-search-input');
  const searchOverlay = document.getElementById('search-overlay');

  searchInput?.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim();
    const results = setSearchQuery(q);
    updateProductGrid();

    if (q.length > 0 && results.length > 0) {
      showSearchOverlay(results.slice(0, 6), searchOverlay);
    } else {
      searchOverlay.style.display = 'none';
    }
  }, 300));

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') searchOverlay.style.display = 'none';
  });

  document.getElementById('search-btn')?.addEventListener('click', () => {
    const q = searchInput?.value.trim() || '';
    setSearchQuery(q);
    updateProductGrid();
    searchOverlay.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('header-search-wrap');
    if (wrap && !wrap.contains(e.target)) {
      searchOverlay.style.display = 'none';
    }
  }, { capture: true });

  // Notifications
  document.getElementById('notification-btn')?.addEventListener('click', () => navigate('notifications'));

  // Cart
  document.getElementById('cart-header-btn')?.addEventListener('click', () => navigate('cart'));

  // Orders
  document.getElementById('orders-header-btn')?.addEventListener('click', () => {
    const { currentUser } = getState();
    navigate(currentUser ? 'orders' : 'login');
  });

  // Profile
  document.getElementById('profile-header-btn')?.addEventListener('click', () => {
    const { currentUser } = getState();
    navigate(currentUser ? 'profile' : 'login');
  });

  // Categories Dropdown Menu
  const dropdown = document.getElementById('categories-dropdown');
  const allCatWrapper = document.getElementById('all-categories-btn-wrapper');
  
  document.getElementById('all-categories-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('show');
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (dropdown && allCatWrapper && !allCatWrapper.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Handle category selections inside dropdown
  dropdown?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-drop-cat]');
    if (!item) return;
    
    const cat = item.dataset.dropCat;
    setCategory(cat);
    updateProductGrid();
    
    // Update active class in dropdown items
    dropdown.querySelectorAll('[data-drop-cat]').forEach(el => {
      el.classList.toggle('active', el.dataset.dropCat === cat);
    });
    
    dropdown.classList.remove('show');
  });
}

function bindSidebar() {
  document.getElementById('main-sidebar')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-sidebar-cat]');
    if (item === null) return;
    const cat = item.dataset.sidebarCat;
    setCategory(cat);
    updateProductGrid();
    updateActiveCategoryLinks(cat);
    // Update sidebar active states
    document.querySelectorAll('[data-sidebar-cat]').forEach(el => {
      el.classList.toggle('active', el.dataset.sidebarCat === cat);
    });
  });
}

function bindCarousel(banners) {
  if (!banners.length) return;
  if (_carouselTimer) clearInterval(_carouselTimer);
  _carouselIndex = 0;

  updateCarousel();
  _carouselTimer = setInterval(() => {
    _carouselIndex = (_carouselIndex + 1) % _carouselTotal;
    updateCarousel();
  }, 4000);

  document.getElementById('carousel-prev')?.addEventListener('click', () => {
    _carouselIndex = (_carouselIndex - 1 + _carouselTotal) % _carouselTotal;
    updateCarousel();
    resetTimer();
  });

  document.getElementById('carousel-next')?.addEventListener('click', () => {
    _carouselIndex = (_carouselIndex + 1) % _carouselTotal;
    updateCarousel();
    resetTimer();
  });

  document.getElementById('carousel-dots')?.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-idx]');
    if (!dot) return;
    _carouselIndex = parseInt(dot.dataset.idx);
    updateCarousel();
    resetTimer();
  });

  // Initialize AdSense unit
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (err) {
    console.warn('AdSense push failed (ad blocker or script not loaded):', err);
  }
}

function resetTimer() {
  if (_carouselTimer) clearInterval(_carouselTimer);
  _carouselTimer = setInterval(() => {
    _carouselIndex = (_carouselIndex + 1) % _carouselTotal;
    updateCarousel();
  }, 4000);
}

function updateCarousel() {
  const track = document.getElementById('carousel-track');
  if (track) track.style.transform = `translateX(-${_carouselIndex * 100}%)`;

  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === _carouselIndex);
  });
}

function bindProductGrid() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.addEventListener('click', async (e) => {
    // Add to cart
    const addBtn = e.target.closest('[data-add-id]');
    if (addBtn) {
      e.stopPropagation();
      const productId = addBtn.dataset.addId;
      const product = getState().products.find(p => p.id === productId);
      if (!product) return;
      addToCart(product);
      updateCartBadge();
      showToast(`${product.name} added to cart!`, 'success', 2000);
      return;
    }

    // Wishlist
    const wishBtn = e.target.closest('[data-wishlist-id]');
    if (wishBtn) {
      e.stopPropagation();
      const { currentUser } = getState();
      if (!currentUser) { showToast('Sign in to save to wishlist', 'info'); return; }
      const productId = wishBtn.dataset.wishlistId;
      await toggleWishlist(productId);
      const { userModel } = getState();
      wishBtn.classList.toggle('active', userModel?.wishlist?.includes(productId));
      wishBtn.querySelector('.material-icons-round').textContent =
        userModel?.wishlist?.includes(productId) ? 'favorite' : 'favorite_border';
      return;
    }

    // Navigate to product detail
    const card = e.target.closest('[data-product-id]');
    if (card) {
      const productId = card.dataset.productId;
      const product = getState().products.find(p => p.id === productId);
      if (product) {
        setState({ currentProduct: product });
        navigate('product');
      }
    }
  });

  // Track Orders Card
  document.getElementById('track-orders-card')?.addEventListener('click', () => navigate('orders'));
}

// Update products grid without full re-render
function updateProductGrid() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const { filteredProducts, products } = getState();
  const items = filteredProducts;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <span class="material-icons-round">search_off</span>
        <h4>No products found</h4>
        <p>Try a different search or browse a category</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(renderProductCard).join('');
}

function updateActiveCategoryLinks(cat) {
  document.querySelectorAll('[data-cat]').forEach(el => {
    el.classList.toggle('active', el.dataset.cat === cat);
  });
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const count = getCartCount();
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function updateNotificationBadge() {
  const { notificationUnreadCount } = getState();
  const badge = document.querySelector('#notification-btn .btn-badge');
  if (badge) {
    badge.textContent = notificationUnreadCount;
    badge.style.display = notificationUnreadCount > 0 ? 'flex' : 'none';
  }
}

function showSearchOverlay(products, overlayEl) {
  overlayEl.style.display = 'block';
  overlayEl.innerHTML = products.map(p => `
    <div class="search-result-item" data-result-id="${p.id}">
      <img class="search-result-img" src="${p.imageUrl || ''}" alt="${p.name}"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23B1A7B4%22/%3E%3C/svg%3E'" />
      <div class="search-result-info">
        <div class="search-result-name">${p.name}</div>
        <div class="search-result-shop">${p.shop || p.category}</div>
      </div>
      <div class="search-result-price">${formatCurrency(p.price)}</div>
    </div>
  `).join('');

  overlayEl.querySelectorAll('[data-result-id]').forEach(item => {
    item.addEventListener('click', () => {
      const product = getState().products.find(p => p.id === item.dataset.resultId);
      if (product) {
        setState({ currentProduct: product });
        overlayEl.style.display = 'none';
        navigate('product');
      }
    });
  });
}

function showCategoryDrawer() {
  const { shops, categories, selectedCategory } = getState();
  const all = [...new Set([...categories, ...shops])];

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.innerHTML = `
    <div class="drawer-header">
      <span class="drawer-title">All Categories</span>
      <span class="material-icons-round drawer-close" id="drawer-close-btn">close</span>
    </div>
    <div class="sidebar-item ${!selectedCategory ? 'active' : ''}" data-drawer-cat="">
      <span class="material-icons-round">grid_view</span> All Products
    </div>
    ${all.map(c => `
      <div class="sidebar-item ${selectedCategory === c ? 'active' : ''}" data-drawer-cat="${c}">
        <span class="material-icons-round">chevron_right</span> ${c}
      </div>
    `).join('')}
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  const close = () => { overlay.remove(); drawer.remove(); };
  overlay.addEventListener('click', close);
  document.getElementById('drawer-close-btn')?.addEventListener('click', close);

  drawer.querySelectorAll('[data-drawer-cat]').forEach(item => {
    item.addEventListener('click', () => {
      const cat = item.dataset.drawerCat;
      setCategory(cat);
      updateProductGrid();
      updateActiveCategoryLinks(cat);
      close();
    });
  });
}

// Export for external re-renders
export { updateCartBadge, updateNotificationBadge, updateProductGrid as _refreshGrid };

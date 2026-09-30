// =====================================================
// ZANDO WEB — pages/home.js
// Home page — header, carousel, featured products, popular categories, suggestions, promo banner, footer
// =====================================================

import { getState, setState, subscribe, getCartCount } from '../js/state.js';
import { setSearchQuery, setCategory, clearFilters } from '../js/products.js';
import { addToCart } from '../js/state.js';
import { toggleWishlist } from '../js/auth.js';
import { showToast, formatCurrency, renderStars, debounce, renderFooter } from '../js/utils.js';
import { navigate } from '../js/router.js';

// Carousel state
let _carouselIndex = 0;
let _carouselTimer = null;
let _carouselTotal = 0;
let _sugCarouselIndex = 0;

// Auto Scroll & Infinite Scroll state
let _autoScrollTimer = null;
let _isAutoScrollActive = false;
let _loadedProductCount = 21;
let _isAppendingProducts = false;

// Fallback banners
const FALLBACK_BANNERS = [
  {
    imageUrl: 'assets/images/Splash_Screen.jpg',
    title: 'Welcome to Zando',
    subtitle: 'Shop everything you need — Fast &amp; Reliable Delivery',
    ctaText: 'Explore Now'
  },
  {
    imageUrl: 'assets/images/welcome_bg.jpg',
    title: 'Premium Collection',
    subtitle: 'Exclusive fashion, electronics &amp; accessories',
    ctaText: 'Shop Deals'
  },
  {
    isMockup: true,
    title: 'Special Mega Sale',
    subtitle: 'Up to 50% OFF on top categories today!',
    ctaText: 'Claim Discount'
  }
];

export function renderHome(appEl) {
  const { currentUser, userModel, filteredProducts, shops, categories, banners, selectedCategory } = getState();
  const displayBanners = banners.length > 0 ? banners : FALLBACK_BANNERS;
  _carouselTotal = displayBanners.length;
  _loadedProductCount = 21;
  _isAppendingProducts = false;

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderHeader()}
      <div class="page-content">
        <div class="page-content-inner">
          <main class="main-area" style="padding: 0; width: 100%;">
            ${renderAllCategoriesBar()}
            ${renderCarousel(displayBanners)}
            ${renderFeaturedProductsSection()}
            ${renderPopularCategoriesSection()}
            ${renderSuggestionsSection()}
            ${renderSellWithZandoBanner()}
          </main>
        </div>
      </div>
      ${renderFooter()}
      ${renderBottomNav('home')}
    </div>
  `;

  // Wire up interactions
  bindHeader();
  bindCarousel(displayBanners);
  bindProductGrid();
  bindPopularCategories();
  bindAutoAndInfiniteScroll();
  updateCartBadge();
  updateNotificationBadge();
  bindBottomNav();

  // Reactive subscription to state changes for the categories dropdown
  subscribe('categories', () => updateDropdownMenu());
  subscribe('shops', () => updateDropdownMenu());
  subscribe('banners', (newBanners) => {
    const heroWrapper = document.querySelector('.hero-section-wrapper');
    if (!heroWrapper) return;
    const displayBanners = newBanners.length > 0 ? newBanners : FALLBACK_BANNERS;
    _carouselTotal = displayBanners.length;
    const parent = heroWrapper.parentElement;
    const temp = document.createElement('div');
    temp.innerHTML = renderCarousel(displayBanners);
    const newHeroWrapper = temp.querySelector('.hero-section-wrapper');
    if (newHeroWrapper) {
      parent.replaceChild(newHeroWrapper, heroWrapper);
    }
    bindCarousel(displayBanners);
  });
}

// ---- Header ----
function renderHeader() {
  const { currentUser } = getState();

  return `
    <header class="site-header" style="background: #280026; position: sticky; top: 0; z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
      <div class="header-top-container container-fluid" style="padding: 0.75rem 1.5rem;">
        <!-- Desktop Layout (≥769px) -->
        <div class="d-none d-md-flex align-items-center justify-content-between gap-3">
          <!-- Logo -->
          <div id="home-logo-btn" style="cursor: pointer; flex-shrink: 0;" class="d-flex align-items-center">
            <img src="assets/images/zando_logo.png" alt="ZANDO" style="height: 38px; object-fit: contain;" />
          </div>

          <!-- Search Bar (White input + Yellow square search button) -->
          <div id="header-search-wrap" style="flex: 1; max-width: 600px; position: relative;">
            <div style="display: flex; align-items: center; background: #ffffff; border-radius: 6px; overflow: hidden; height: 38px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
              <input
                type="text"
                id="header-search-input"
                class="header-search-input"
                placeholder="SEARCH PRODUCTS..."
                autocomplete="off"
                style="flex: 1; border: none; padding: 0 1rem; color: #333; font-size: 0.85rem; outline: none; background: transparent;"
              />
              <button id="search-btn" class="header-search-btn" aria-label="Search" style="background: #FFFF00; color: #000; border: none; width: 44px; height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">
                <span class="material-icons-round" style="font-size: 1.3rem; color: #000;">search</span>
              </button>
            </div>
            <div class="search-overlay" id="search-overlay" style="display:none; position: absolute; top: calc(100% + 4px); left: 0; width: 100%; background: #fff; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); z-index: 1000; max-height: 400px; overflow-y: auto;"></div>
          </div>

          <!-- Header Actions -->
          <div class="d-flex align-items-center gap-3">
            ${currentUser ? `
              <button class="icon-btn header-icon-btn" id="notification-btn" title="Notifications" aria-label="Notifications" style="background: transparent; color: #fff; border: none; padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                <span class="material-icons-round" style="font-size: 1.4rem;">notifications</span>
                <span class="btn-badge" style="display:none; position: absolute; top: -2px; right: -4px; background: #FFFF00; color: #000; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px;">0</span>
              </button>
            ` : ''}
            <button class="icon-btn header-icon-btn" id="cart-header-btn" title="Shopping Cart" aria-label="Cart" style="background: transparent; color: #fff; border: none; padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;">
              <span class="material-icons-round" style="font-size: 1.4rem;">shopping_cart</span>
              <span class="btn-badge" id="cart-badge" style="display:none; position: absolute; top: -2px; right: -4px; background: #FFFF00; color: #000; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px;">0</span>
            </button>
            <button class="icon-btn header-icon-btn" id="orders-header-btn" title="Track Orders" aria-label="Track Orders" style="background: transparent; color: #fff; border: none; padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span class="material-icons-round" style="font-size: 1.4rem;">local_shipping</span>
            </button>
            <button class="icon-btn header-icon-btn" id="profile-header-btn" title="${currentUser ? 'My Profile' : 'Sign In'}" aria-label="${currentUser ? 'Profile' : 'Sign In'}" style="background: transparent; color: #fff; border: none; padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span class="material-icons-round" style="font-size: 1.4rem;">person</span>
            </button>
          </div>
        </div>

        <!-- Mobile Layout matching Mobile App UI (≤768px) -->
        <div class="d-flex d-md-none flex-column gap-2" style="padding: 0.2rem 0;">
          <!-- Row 1: Logo & Notifications -->
          <div class="d-flex align-items-center justify-content-between w-100">
            <div id="home-logo-btn-mobile" style="cursor: pointer;" class="d-flex align-items-center">
              <img src="assets/images/zando_logo.png" alt="ZANDO" style="height: 34px; object-fit: contain;" />
            </div>
            ${currentUser ? `
              <button class="icon-btn header-icon-btn" id="notification-btn-mobile" title="Notifications" aria-label="Notifications" style="background: transparent; color: #fff; border: none; padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                <span class="material-icons-round" style="font-size: 1.4rem;">notifications_none</span>
                <span class="btn-badge" style="display:none; position: absolute; top: -2px; right: -4px; background: #FFFF00; color: #000; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px;">0</span>
              </button>
            ` : ''}
          </div>

          <!-- Row 2: Search Input Box with Yellow Button -->
          <div id="header-search-wrap-mobile" style="width: 100%; position: relative;">
            <div style="display: flex; align-items: center; background: #ffffff; border-radius: 6px; overflow: hidden; height: 38px; width: 100%;">
              <input
                type="text"
                id="header-search-input-mobile"
                class="header-search-input"
                placeholder="SEARCH PRODUCTS..."
                autocomplete="off"
                style="flex: 1; border: none; padding: 0 0.85rem; color: #333; font-size: 0.8rem; outline: none; background: transparent;"
              />
              <button id="search-btn-mobile" class="header-search-btn" aria-label="Search" style="background: #FFFF00; color: #000; border: none; width: 44px; height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">
                <span class="material-icons-round" style="font-size: 1.2rem; color: #000;">search</span>
              </button>
            </div>
            <div class="search-overlay" id="search-overlay-mobile" style="display:none; position: absolute; top: calc(100% + 4px); left: 0; width: 100%; background: #fff; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); z-index: 1000; max-height: 350px; overflow-y: auto;"></div>
          </div>
        </div>
      </div>
    </header>
  `;
}

// ---- All Categories Bar (Placed OUTSIDE navigation bar — Hidden on Mobile view) ----
function renderAllCategoriesBar() {
  const { categories, shops, selectedCategory } = getState();
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
    <div class="all-categories-outside-section d-none d-md-block" style="padding: 0.85rem 2.5rem; background: #ffffff; border-bottom: 1px solid #eeeeee; width: 100%;">
      <div id="all-categories-btn-wrapper" style="position: relative; display: inline-block;">
        <button id="all-categories-btn" class="all-categories-btn" style="background: #280026; color: #ffffff; border: none; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.6rem 1.4rem; border-radius: 6px; box-shadow: 0 2px 8px rgba(40,0,38,0.25); transition: background 0.2s;">
          <span class="material-icons-round" style="font-size: 1.25rem;">menu</span>
          All Categories
        </button>
        <div class="categories-dropdown" id="categories-dropdown" style="top: 100%; left: 0; margin-top: 6px; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 1100;">
          ${dropdownItems}
        </div>
      </div>
    </div>
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

// ---- Carousel Slider ----
function renderCarousel(banners) {
  if (!banners.length) return '';
  const slides = banners.map((b, i) => {
    const imgUrl = b.imageUrl || (i === 0 ? 'assets/images/Splash_Screen.jpg' : 'assets/images/welcome_bg.jpg');

    return `
      <div class="carousel-slide" style="border: none;">
        <img src="${imgUrl}" alt="Zando Banner" loading="lazy" referrerpolicy="no-referrer"
             style="width: 100%; height: 100%; object-fit: cover; display: block; border: none;"
             onerror="this.onerror=null; this.src='assets/images/Splash_Screen.jpg';" />
      </div>
    `;
  }).join('');

  const dots = banners.map((_, i) =>
    `<div class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`
  ).join('');

  return `
    <div class="hero-carousel-section" style="background: #280026; width: 100%; padding: 0; margin-bottom: 1rem; border: none; border-bottom: none; outline: none; box-shadow: none;">
      <div class="hero-section-wrapper" style="max-width: 100%; margin: 0 auto; padding: 0; width: 100%; border: none; outline: none;">
        <div class="hero-carousel-col" style="border: none; outline: none;">
          <div class="home-hero" style="height: 100%; margin: 0; border: none; outline: none;">
            <div class="carousel" id="main-carousel" style="height: 100%; position: relative; overflow: hidden; border: none; outline: none; box-shadow: none;">
              <div class="carousel-track" id="carousel-track" style="height: 100%; display: flex; transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1); border: none;">${slides}</div>
              <div class="carousel-dots" id="carousel-dots" style="position: absolute; bottom: 0.75rem; right: 1.5rem; display: flex; gap: 8px; z-index: 10;">${dots}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Featured Products Section ----
function renderFeaturedProductsSection() {
  const { filteredProducts, products } = getState();
  const displayItems = filteredProducts.length > 0 ? filteredProducts : products;

  // Render initial 21 cards (3 rows x 7 cols) matching Image 1 design mockup
  const targetCount = Math.max(displayItems.length, 21);
  const cardItems = Array.from({ length: targetCount }, (_, idx) => {
    const item = displayItems[idx % (displayItems.length || 1)];
    return renderProductCard(item, idx);
  }).join('');

  return `
    <section id="featured-products-section" style="max-width: 100%; margin: 0 auto 3.5rem auto; padding: 0 2.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.5rem; font-weight: 800; color: #280026; margin: 0; font-family: var(--font-display);">Featured Products</h2>
      </div>
      <div class="featured-products-grid" id="products-grid">
        ${cardItems}
      </div>
    </section>

    <style>
      .featured-products-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1.25rem 1.1rem;
      }
      @media (min-width: 1600px) {
        .featured-products-grid { grid-template-columns: repeat(7, 1fr); }
      }
      @media (max-width: 1200px) {
        .featured-products-grid { grid-template-columns: repeat(5, 1fr); }
      }
      @media (max-width: 992px) {
        .featured-products-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 768px) {
        #featured-products-section {
          padding: 0 16px !important;
          margin-bottom: 2rem !important;
        }
        .featured-products-grid,
        .products-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 16px 12px !important;
          width: 100% !important;
        }
      }
    </style>
  `;
}

// ---- Popular Categories Section ----
function renderPopularCategoriesSection() {
  return `
    <section style="max-width: 100%; margin: 0 auto 3.5rem auto; padding: 0 2.5rem;">
      <h2 style="font-size: 1.5rem; font-weight: 800; color: #280026; margin: 0 0 1.25rem 0; font-family: var(--font-display);">Popular Categories</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem;" class="popular-cat-grid">
        <!-- Card 1: Flower Shop (Gray #D5D5D8) -->
        <div class="pop-cat-card" data-cat="Flower Shop" style="background: #D5D5D8; border-radius: 16px; padding: 2rem 1.6rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
          <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 0.35rem;">Top Award Winners</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #280026; font-family: var(--font-display);">Flower Shop</div>
        </div>

        <!-- Card 2: Chocolates (Soft Yellow #FFF8D0) -->
        <div class="pop-cat-card" data-cat="Chocolets" style="background: #FFF8D0; border-radius: 16px; padding: 2rem 1.6rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
          <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 0.35rem;">Special Everyday Sale</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #280026; font-family: var(--font-display);">Chocolates</div>
        </div>

        <!-- Card 3: Cosmetics (Soft Lime Green #E8FFD0) -->
        <div class="pop-cat-card" data-cat="Electronics" style="background: #E8FFD0; border-radius: 16px; padding: 2rem 1.6rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
          <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 0.35rem;">Always Stay In Trend</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #280026; font-family: var(--font-display);">Cosmetics</div>
        </div>

        <!-- Card 4: Food / Restaurant (Soft Yellow #FFF8D0 - Spans 2 Cols) -->
        <div class="pop-cat-card pop-cat-wide" data-cat="Grocery Items" style="background: #FFF8D0; border-radius: 16px; padding: 2.2rem 1.6rem; cursor: pointer; grid-column: span 2; transition: transform 0.2s, box-shadow 0.2s;">
          <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 0.35rem;">Good Food, Good Mood</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #280026; font-family: var(--font-display);">Food / Restaurant</div>
        </div>

        <!-- Card 5: Jewellery (Gray #D5D5D8) -->
        <div class="pop-cat-card" data-cat="Fashion" style="background: #D5D5D8; border-radius: 16px; padding: 2rem 1.6rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
          <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 0.35rem;">Sparkle With Every Step</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #280026; font-family: var(--font-display);">Jewellery</div>
        </div>

        <!-- Card 6: Cakes (Soft Cyan #D0F8FF) -->
        <div class="pop-cat-card" data-cat="Cake Shop" style="background: #D0F8FF; border-radius: 16px; padding: 2rem 1.6rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
          <div style="font-size: 0.75rem; color: #666; font-weight: 600; margin-bottom: 0.35rem;">For The Love of Food</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #280026; font-family: var(--font-display);">Cakes</div>
        </div>
      </div>
    </section>

    <style>
      .pop-cat-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      }
      @media (max-width: 768px) {
        .popular-cat-grid {
          grid-template-columns: 1fr !important;
        }
        .pop-cat-wide {
          grid-column: span 1 !important;
        }
      }
    </style>
  `;
}

// ---- Your Suggestions Section (Auto 1-by-1 horizontal slider, 4 cards visible on right side) ----
function renderSuggestionsSection() {
  const { products } = getState();

  const defaultItems = [
    { name: 'Extravaganza Hamper', price: 16750 },
    { name: 'Extravaganza Hamper', price: 16750 },
    { name: 'Extravaganza Hamper', price: 16750 },
    { name: 'Extravaganza Hamper', price: 16750 },
    { name: 'Red Vintage Pattern Bag', price: 12500 },
    { name: 'Leather Strap Watch', price: 14200 },
    { name: 'Wireless Bluetooth Earbuds', price: 9800 },
    { name: 'Classic Denim Jacket', price: 18500 },
    { name: 'Running Sports Shoes', price: 16750 },
    { name: 'Smart Fitness Band', price: 11400 },
    { name: 'Trendy Sunglasses', price: 8900 },
    { name: 'Designer Handbag', price: 21000 }
  ];

  const totalItems = Array.from({ length: 12 }, (_, idx) => {
    return products[idx] ? products[idx] : {
      id: `suggestion-prod-${idx + 1}`,
      name: defaultItems[idx].name,
      price: defaultItems[idx].price,
      imageUrl: '',
      category: 'Suggestions'
    };
  });

  const cardsHtml = totalItems.map((item) => {
    const priceText = `RS. ${Number(item.price || 16750).toLocaleString('en-LK')}`;
    const nameText = item.name || 'Extravaganza Hamper';

    return `
      <div class="sug-card-item" data-product-id="${item.id || ''}">
        <div class="sug-card-img-wrap">
          ${item.imageUrl
            ? `<img src="${item.imageUrl}" alt="${nameText}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:#ffffff;font-size:1rem;font-weight:500;\\'>Products</span>';" />`
            : `<span style="color: #ffffff; font-size: 1rem; font-weight: 500;">Products</span>`
          }
        </div>
        <div style="margin-top: 0.6rem;">
          <div style="font-size: 0.82rem; color: #333333; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nameText}</div>
          <div style="font-size: 0.88rem; font-weight: 900; color: #280026; margin-top: 3px; font-family: var(--font-display);">${priceText}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section style="max-width: 100%; margin: 0 auto 3rem auto; padding: 0 2.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: #280026; margin: 0; font-family: var(--font-display);">Your Suggestions</h2>
        <!-- Prev/Next Controls -->
        <div style="display: flex; gap: 0.6rem; align-items: center;">
          <button id="sug-prev-btn" aria-label="Previous product" style="background: rgba(40,0,38,0.08); color: #280026; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;">
            <span class="material-icons-round" style="font-size: 1.2rem;">chevron_left</span>
          </button>
          <button id="sug-next-btn" aria-label="Next product" style="background: #280026; color: #ffffff; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;">
            <span class="material-icons-round" style="font-size: 1.2rem;">chevron_right</span>
          </button>
        </div>
      </div>

      <!-- Backdrop container with exact #B1A7B4 grey background matching screenshot -->
      <div style="background: #B1A7B4; border-radius: 4px; padding: 1.8rem 1.8rem; overflow: hidden; position: relative; display: flex; flex-direction: column; align-items: flex-end;" id="suggestions-container-wrap">
        <!-- Viewport occupying right 65% of container, leaving left side space open -->
        <div style="width: 65%; max-width: 65%; margin-left: auto; overflow: hidden;" id="sug-cards-viewport">
          <div id="sug-carousel-track" style="display: flex; gap: 1rem; transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1); width: 100%;">
            ${cardsHtml}
          </div>
        </div>

        <div id="sug-dots-container" style="display: flex; justify-content: flex-end; gap: 8px; width: 65%; margin-top: 1.2rem; padding-right: 0.5rem;">
          <div class="sug-dot active" data-sug-dot="0" style="width: 8px; height: 8px; border-radius: 50%; background: #280026; cursor: pointer; transition: all 0.2s;"></div>
          <div class="sug-dot" data-sug-dot="1" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(40,0,38,0.25); cursor: pointer; transition: all 0.2s;"></div>
          <div class="sug-dot" data-sug-dot="2" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(40,0,38,0.25); cursor: pointer; transition: all 0.2s;"></div>
          <div class="sug-dot" data-sug-dot="3" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(40,0,38,0.25); cursor: pointer; transition: all 0.2s;"></div>
        </div>
      </div>
    </section>

    <style>
      .sug-card-item {
        background: #ffffff;
        padding: 0.85rem 0.85rem 1.1rem 0.85rem;
        border-radius: 4px;
        flex: 0 0 calc((100% - 3rem) / 4);
        width: calc((100% - 3rem) / 4);
        flex-shrink: 0;
        box-sizing: border-box;
        cursor: pointer;
        text-align: left;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .sug-card-img-wrap {
        width: 100%;
        aspect-ratio: 3/4;
        background: #A095A3;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .sug-card-item:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
      }
      @media (max-width: 1200px) {
        #sug-cards-viewport, #sug-dots-container {
          width: 80% !important;
          max-width: 80% !important;
        }
      }
      @media (max-width: 768px) {
        #sug-cards-viewport, #sug-dots-container {
          width: 100% !important;
          max-width: 100% !important;
        }
        .sug-card-item {
          flex: 0 0 calc((100% - 1rem) / 2) !important;
          width: calc((100% - 1rem) / 2) !important;
        }
      }
    </style>
  `;
}

// ---- Sell with Zando Promo Banner ----
function renderSellWithZandoBanner() {
  return `
    <section style="background: #5B0068; color: #ffffff; padding: 4rem 2.5rem; width: 100%; margin: 0 0 0 0; text-align: left;">
      <div style="max-width: 100%; margin: 0 auto;">
        <h2 style="font-size: 3.2rem; font-weight: 900; color: #ffffff; letter-spacing: 0.02em; line-height: 1.15; margin: 0 0 1.2rem 0; text-transform: uppercase; font-family: var(--font-display);">
          SELL WITH ZANDO AND<br />GROW YOUR BUSINESS
        </h2>
        <div style="font-size: 2rem; font-weight: 800; color: #ffffff; letter-spacing: 0.05em; font-family: var(--font-display);">
          076 089 12 62
        </div>
      </div>
    </section>

    <style>
      @media (max-width: 768px) {
        section[style*="background: #5B0068"] h2 {
          font-size: 2rem !important;
        }
        section[style*="background: #5B0068"] div {
          font-size: 1.4rem !important;
        }
      }
    </style>
  `;
}

// ---- Single Product Card Renderer (Description OUT of rectangle, directly under) ----
function renderProductCard(product, idx = 0) {
  const defaultNames = [
    'Cat eye glasses for female',
    'Red vintage pattern bag',
    'Leather strap watch',
    'Wireless bluetooth earbuds',
    'Cotton casual t-shirt',
    'Classic denim jacket',
    'Running sports shoes',
    'Smart fitness band',
    'Trendy sunglasses',
    'Canvas travel backpack',
    'Designer handbag',
    'Minimalist wallet',
    'Floral summer dress',
    'Stainless water bottle',
    'Luxury perfume 100ml',
    'Over-ear headphones',
    'Ceramic coffee mug',
    'Unisex hoodie jacket',
    'Portable power bank',
    'Casual sneakers',
    'Leather belt for men'
  ];

  const name = product?.name || defaultNames[idx % defaultNames.length];
  const price = product?.price ? formatCurrency(product.price) : 'Rs. 1,500';
  const imageUrl = product?.imageUrl || '';
  const { userModel } = getState();
  const inWishlist = product?.id && userModel?.wishlist?.includes(product.id);

  return `
    <div class="product-card" data-product-id="${product?.id || ''}">
      <!-- Top Image Rectangle -->
      <div class="product-card-image-wrap">
        ${imageUrl
          ? `<img src="${imageUrl}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'product-card-placeholder\\'>Products</div>';" />`
          : `<div class="product-card-placeholder">Products</div>`
        }
        ${product?.id ? `
          <button class="product-card-wishlist ${inWishlist ? 'active' : ''}" data-wishlist-id="${product.id}" aria-label="Wishlist">
            <span class="material-icons-round" style="font-size: 0.95rem; color: ${inWishlist ? '#DC3545' : '#666'};">${inWishlist ? 'favorite' : 'favorite_border'}</span>
          </button>
        ` : ''}
      </div>
      <!-- Description & Price OUT of rectangle, directly under -->
      <div class="product-card-info">
        <div class="product-card-name">${name}</div>
        <div class="product-card-price">${price}</div>
      </div>
    </div>
  `;
}

// ---- Bindings ----
function bindHeader() {
  const onLogoClick = () => {
    clearFilters();
    navigate('home');
  };
  document.getElementById('home-logo-btn')?.addEventListener('click', onLogoClick);
  document.getElementById('home-logo-btn-mobile')?.addEventListener('click', onLogoClick);

  // Desktop search input & overlay
  const searchInput = document.getElementById('header-search-input');
  const searchOverlay = document.getElementById('search-overlay');

  searchInput?.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim();
    const results = setSearchQuery(q);
    updateProductGrid();

    if (q.length > 0 && results.length > 0 && searchOverlay) {
      showSearchOverlay(results.slice(0, 6), searchOverlay);
    } else if (searchOverlay) {
      searchOverlay.style.display = 'none';
    }
  }, 300));

  document.getElementById('search-btn')?.addEventListener('click', () => {
    const q = searchInput?.value.trim() || '';
    setSearchQuery(q);
    updateProductGrid();
    if (searchOverlay) searchOverlay.style.display = 'none';
  });

  // Mobile search input & overlay
  const searchInputMobile = document.getElementById('header-search-input-mobile');
  const searchOverlayMobile = document.getElementById('search-overlay-mobile');

  searchInputMobile?.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim();
    const results = setSearchQuery(q);
    updateProductGrid();

    if (q.length > 0 && results.length > 0 && searchOverlayMobile) {
      showSearchOverlay(results.slice(0, 6), searchOverlayMobile);
    } else if (searchOverlayMobile) {
      searchOverlayMobile.style.display = 'none';
    }
  }, 300));

  document.getElementById('search-btn-mobile')?.addEventListener('click', () => {
    const q = searchInputMobile?.value.trim() || '';
    setSearchQuery(q);
    updateProductGrid();
    if (searchOverlayMobile) searchOverlayMobile.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('header-search-wrap');
    if (wrap && searchOverlay && !wrap.contains(e.target)) {
      searchOverlay.style.display = 'none';
    }
    const wrapMobile = document.getElementById('header-search-wrap-mobile');
    if (wrapMobile && searchOverlayMobile && !wrapMobile.contains(e.target)) {
      searchOverlayMobile.style.display = 'none';
    }
  }, { capture: true });

  document.getElementById('notification-btn')?.addEventListener('click', () => navigate('notifications'));
  document.getElementById('notification-btn-mobile')?.addEventListener('click', () => navigate('notifications'));
  document.getElementById('cart-header-btn')?.addEventListener('click', () => navigate('cart'));
  document.getElementById('orders-header-btn')?.addEventListener('click', () => {
    const { currentUser } = getState();
    navigate(currentUser ? 'orders' : 'login');
  });
  document.getElementById('profile-header-btn')?.addEventListener('click', () => {
    const { currentUser } = getState();
    navigate(currentUser ? 'profile' : 'login');
  });

  const dropdown = document.getElementById('categories-dropdown');
  const allCatWrapper = document.getElementById('all-categories-btn-wrapper');
  
  document.getElementById('all-categories-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (dropdown && allCatWrapper && !allCatWrapper.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  dropdown?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-drop-cat]');
    if (!item) return;
    const cat = item.dataset.dropCat;
    setCategory(cat);
    updateProductGrid();
    dropdown.classList.remove('show');
  });

  document.getElementById('nav-about-home')?.addEventListener('click', () => navigate('about'));
  document.getElementById('nav-privacy-home')?.addEventListener('click', () => navigate('privacy'));
  document.getElementById('nav-contact-home')?.addEventListener('click', () => navigate('contact'));
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

  document.getElementById('carousel-dots')?.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-idx]');
    if (!dot) return;
    _carouselIndex = parseInt(dot.dataset.idx);
    updateCarousel();
    if (_carouselTimer) clearInterval(_carouselTimer);
    _carouselTimer = setInterval(() => {
      _carouselIndex = (_carouselIndex + 1) % _carouselTotal;
      updateCarousel();
    }, 4000);
  });
}

function updateCarousel() {
  const track = document.getElementById('carousel-track');
  if (track) track.style.transform = `translateX(-${_carouselIndex * 100}%)`;

  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === _carouselIndex);
  });
}

function bindPopularCategories() {
  document.querySelectorAll('.pop-cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.cat;
      if (cat) {
        setCategory(cat);
        updateProductGrid();
        document.getElementById('featured-products-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function bindProductGrid() {
  const containers = [
    document.getElementById('products-grid'),
    document.getElementById('suggestions-grid'),
    document.getElementById('suggestions-container-wrap')
  ];

  containers.forEach(container => {
    if (!container) return;

    container.addEventListener('click', async (e) => {
      // Wishlist button click
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

      // Card click -> Navigate to Product Detail page
      const card = e.target.closest('[data-product-id]');
      if (card) {
        const productId = card.dataset.productId;
        let product = getState().products.find(p => p.id === productId);

        if (!product) {
          const cardName = card.querySelector('.product-card-name')?.textContent ||
                           card.querySelector('div[style*="font-size: 0.82rem"]')?.textContent ||
                           'Extravaganza Hamper';
          const cardPriceText = card.querySelector('.product-card-price')?.textContent ||
                                card.querySelector('div[style*="font-weight: 900"]')?.textContent ||
                                'RS. 16,750';
          const cardPrice = parseInt(cardPriceText.replace(/[^0-9]/g, '')) || 16750;
          product = {
            id: productId || `product-${Date.now()}`,
            name: cardName,
            price: cardPrice,
            description: 'High-quality item selected from Zando catalog.',
            imageUrl: card.querySelector('img')?.src || '',
            category: 'Suggestions',
            rating: 4.8,
            reviewsCount: 12
          };
        }

        setState({ currentProduct: product });
        navigate('product');
      }
    });
  });
}

function updateProductGrid() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const { filteredProducts, products } = getState();
  const items = filteredProducts.length > 0 ? filteredProducts : products;

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
        addToCart(product);
        updateCartBadge();
        setState({ currentProduct: product });
        overlayEl.style.display = 'none';
        showToast(`${product.name} added! Proceeding to checkout...`, 'success', 1500);
        navigate('checkout');
      }
    });
  });
}

export function renderBottomNav(activePage) {
  const { currentUser } = getState();
  const cartCount = getCartCount();
  return `
    <nav class="bottom-nav" id="bottom-nav">
      <button class="bottom-nav-item ${activePage === 'home' ? 'active' : ''}" id="bnav-home" aria-label="Home" title="Home">
        <span class="material-icons-round">home</span>
      </button>
      <button class="bottom-nav-item ${activePage === 'search' ? 'active' : ''}" id="bnav-search" aria-label="Search" title="Search">
        <span class="material-icons-round">search</span>
      </button>
      <button class="bottom-nav-item ${activePage === 'profile' ? 'active' : ''}" id="bnav-profile" aria-label="${currentUser ? 'Profile' : 'Sign In'}" title="Profile">
        <span class="material-icons-round">person</span>
      </button>
      <button class="bottom-nav-item ${activePage === 'cart' ? 'active' : ''}" id="bnav-cart" aria-label="Cart" title="Cart" style="position:relative;">
        <span class="material-icons-round">shopping_cart</span>
        ${cartCount > 0 ? `<span class="bottom-nav-badge">${cartCount}</span>` : ''}
      </button>
      <button class="bottom-nav-item ${activePage === 'categories' ? 'active' : ''}" id="bnav-categories" aria-label="Categories" title="Categories">
        <span class="material-icons-round">grid_view</span>
      </button>
    </nav>
  `;
}

export function bindBottomNav() {
  document.getElementById('bnav-home')?.addEventListener('click', () => {
    clearFilters();
    navigate('home');
  });

  document.getElementById('bnav-search')?.addEventListener('click', () => {
    const searchInput = document.getElementById('header-search-input');
    if (searchInput) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      searchInput.focus();
    } else {
      navigate('home');
    }
  });

  document.getElementById('bnav-profile')?.addEventListener('click', () => {
    const { currentUser } = getState();
    navigate(currentUser ? 'profile' : 'login');
  });

  document.getElementById('bnav-cart')?.addEventListener('click', () => navigate('cart'));

  document.getElementById('bnav-categories')?.addEventListener('click', () => {
    navigate('categories');
  });
}

// ---- Auto Scroll & Infinite Scroll ----
let _sugItemIndex = 0;
let _sugAutoTimer = null;
const SUG_TOTAL = 12;
const SUG_VISIBLE = 4;

function bindAutoAndInfiniteScroll() {
  _isAutoScrollActive = false;
  if (_autoScrollTimer) {
    clearInterval(_autoScrollTimer);
    _autoScrollTimer = null;
  }

  // Suggestions 1-by-1 Auto Horizontal Slider
  _sugItemIndex = 0;
  const maxSteps = SUG_TOTAL - SUG_VISIBLE + 1; // 9 steps (indices 0..8)

  const updateSugSlider = () => {
    const track = document.getElementById('sug-carousel-track');
    if (!track) return;
    const cards = track.querySelectorAll('.sug-card-item');
    if (!cards.length) return;

    const firstCard = cards[0];
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.gap) || 20;
    const cardWidth = firstCard.offsetWidth;
    const movePx = _sugItemIndex * (cardWidth + gap);

    track.style.transform = `translateX(-${movePx}px)`;

    // Update dot indicators
    const dots = document.querySelectorAll('[data-sug-dot]');
    dots.forEach((dot, idx) => {
      const activeIdx = Math.min(
        dots.length - 1,
        Math.floor((_sugItemIndex / (maxSteps - 1)) * dots.length)
      );
      dot.style.background = idx === activeIdx ? '#280026' : 'rgba(40,0,38,0.25)';
    });
  };

  const startSugAutoPlay = () => {
    if (_sugAutoTimer) clearInterval(_sugAutoTimer);
    _sugAutoTimer = setInterval(() => {
      _sugItemIndex = (_sugItemIndex + 1) % maxSteps;
      updateSugSlider();
    }, 3000);
  };

  const stopSugAutoPlay = () => {
    if (_sugAutoTimer) {
      clearInterval(_sugAutoTimer);
      _sugAutoTimer = null;
    }
  };

  document.getElementById('sug-prev-btn')?.addEventListener('click', () => {
    _sugItemIndex = (_sugItemIndex - 1 + maxSteps) % maxSteps;
    updateSugSlider();
  });

  document.getElementById('sug-next-btn')?.addEventListener('click', () => {
    _sugItemIndex = (_sugItemIndex + 1) % maxSteps;
    updateSugSlider();
  });

  document.getElementById('sug-dots-container')?.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-sug-dot]');
    if (!dot) return;
    const dotIdx = parseInt(dot.dataset.sugDot, 10);
    _sugItemIndex = Math.round((dotIdx / 3) * (maxSteps - 1));
    updateSugSlider();
  });

  document.querySelectorAll('.sug-card-item').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const prodId = card.dataset.productId;
      if (prodId && !prodId.startsWith('suggestion-prod-')) {
        navigate('product', { id: prodId });
      } else {
        const { products } = getState();
        if (products.length > 0) {
          navigate('product', { id: products[0].id });
        }
      }
    });
  });

  const wrap = document.getElementById('suggestions-container-wrap');
  wrap?.addEventListener('mouseenter', stopSugAutoPlay);
  wrap?.addEventListener('mouseleave', startSugAutoPlay);

  if (window._sugResizeHandler) {
    window.removeEventListener('resize', window._sugResizeHandler);
  }
  window._sugResizeHandler = () => updateSugSlider();
  window.addEventListener('resize', window._sugResizeHandler);

  // Initial update and auto-play
  setTimeout(updateSugSlider, 50);
  startSugAutoPlay();

  // Infinite Scroll window listener
  if (window._homeScrollHandler) {
    window.removeEventListener('scroll', window._homeScrollHandler);
  }

  window._homeScrollHandler = () => {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    const scrollBottom = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (documentHeight - scrollBottom < 700) {
      appendMoreProducts();
    }
  };

  window.addEventListener('scroll', window._homeScrollHandler, { passive: true });
}

function appendMoreProducts() {
  if (_isAppendingProducts) return;
  _isAppendingProducts = true;

  const grid = document.getElementById('products-grid');
  if (!grid) {
    _isAppendingProducts = false;
    return;
  }

  const { filteredProducts, products } = getState();
  const displayItems = filteredProducts.length > 0 ? filteredProducts : products;
  if (!displayItems || displayItems.length === 0) {
    _isAppendingProducts = false;
    return;
  }

  const addCount = 14; // Append 2 full rows (14 product cards)
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < addCount; i++) {
    const idx = _loadedProductCount + i;
    const item = displayItems[idx % displayItems.length];
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderProductCard(item, idx);
    if (wrapper.firstElementChild) {
      fragment.appendChild(wrapper.firstElementChild);
    }
  }

  grid.appendChild(fragment);
  _loadedProductCount += addCount;
  _isAppendingProducts = false;
}

export { updateCartBadge, updateNotificationBadge, updateProductGrid as _refreshGrid };


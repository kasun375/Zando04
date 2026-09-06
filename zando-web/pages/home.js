// =====================================================
// ZANDO WEB — pages/home.js
// Home page — header, carousel, categories, product grid
// =====================================================

import { getState, setState, subscribe, getCartCount } from '../js/state.js';
import { setSearchQuery, setCategory, clearFilters } from '../js/products.js';
import { addToCart } from '../js/state.js';
import { toggleWishlist } from '../js/auth.js';
import { showToast, formatCurrency, renderStars, debounce, imgFallback, renderFooter } from '../js/utils.js';
import { navigate } from '../js/router.js';

// Carousel state
let _carouselIndex = 0;
let _carouselTimer = null;
let _carouselTotal = 0;

// Fallback banners
const FALLBACK_BANNERS = [
  {
    imageUrl: 'assets/images/Splash_Screen.jpg',
    title: 'Welcome to Zando',
    subtitle: 'Shop everything you need — Fast & Reliable Delivery',
    ctaText: 'Explore Now'
  },
  {
    imageUrl: 'assets/images/welcome_bg.jpg',
    title: 'Premium Collection',
    subtitle: 'Exclusive fashion, electronics & accessories',
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

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderHeader()}
      <div class="page-content">
        <div class="page-content-inner">
          <main class="main-area" style="padding: 1.5rem 0 0 0; width: 100%;">
            ${renderCarousel(displayBanners)}
            ${renderProductGrid()}
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
  updateCartBadge();
  updateNotificationBadge();
  bindBottomNav();

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
    <header class="site-header" style="box-shadow: 0 4px 20px rgba(0,0,0,0.08); position: sticky; top: 0; z-index: 1000; background: #2E062B;">
      <div class="header-top header-top-responsive">
        <div class="header-logo" id="home-logo-btn" style="cursor: pointer; flex-shrink: 0;">
          <img src="assets/images/zando_logo.png" alt="ZANDO" class="header-logo-img" style="height: 44px; max-width: 100%; object-fit: contain; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.2));" />
        </div>

        <div class="header-search" id="header-search-wrap" style="flex: 1; max-width: 600px; width: 100%;">
          <div class="header-search-inner" style="position: relative; display: flex; align-items: center; background: rgba(255,255,255,0.1); border-radius: 24px; padding: 4px 8px; border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s ease;">
            <input
              type="text"
              id="header-search-input"
              class="header-search-input"
              placeholder="Search for products, brands and more..."
              autocomplete="off"
              style="flex: 1; background: transparent; border: none; padding: 0.75rem 1rem; color: #fff; outline: none; font-size: 1rem; font-family: var(--font-body);"
            />
            <button class="header-search-btn" id="search-btn" aria-label="Search" style="background: #FFFF00; color: #2E062B; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; box-shadow: 0 2px 8px rgba(255,255,0,0.3);">
              <span class="material-icons-round">search</span>
            </button>
          </div>
          <div class="search-overlay" id="search-overlay" style="display:none; position: absolute; top: calc(100% + 8px); left: 0; width: 100%; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); z-index: 1000; max-height: 400px; overflow-y: auto;"></div>
        </div>

        <div class="header-actions header-actions-responsive">
          ${currentUser ? `
            <button class="icon-btn header-icon-btn" id="notification-btn" aria-label="Notifications">
              <span class="material-icons-round">notifications</span>
              <span class="btn-badge" style="display:none;">0</span>
            </button>
          ` : ''}
          <button class="icon-btn header-icon-btn" id="cart-header-btn" aria-label="Cart">
            <span class="material-icons-round">shopping_cart</span>
            <span class="btn-badge" id="cart-badge" style="display:none;">0</span>
          </button>
          <button class="icon-btn header-icon-btn" id="orders-header-btn" aria-label="Track Orders">
            <span class="material-icons-round">local_shipping</span>
          </button>
          <button class="icon-btn header-icon-btn" id="profile-header-btn" aria-label="${currentUser ? 'Profile' : 'Sign In'}">
            <span class="material-icons-round">person</span>
          </button>
        </div>
      </div>

      <nav class="category-nav" style="background: rgba(255,255,255,0.05); border-top: 1px solid rgba(255,255,255,0.1); padding: 0.5rem 2rem;">
        <div class="category-nav-inner category-nav-responsive">
          <div class="all-categories-btn-wrapper" id="all-categories-btn-wrapper" style="position: relative; display: inline-block;">
            <button class="all-categories-btn" id="all-categories-btn" style="background: transparent; color: #fff; border: none; font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem 1rem; border-radius: 8px; transition: background 0.3s;">
              <span class="material-icons-round">menu</span>
              Categories
            </button>
            <div class="categories-dropdown" id="categories-dropdown" style="top: 100%; left: 0; margin-top: 8px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
              ${dropdownItems}
            </div>
          </div>
          
          <div class="main-nav-links main-nav-responsive">
            <a id="nav-about-home" class="nav-link">About Us</a>
            <a id="nav-privacy-home" class="nav-link">Privacy Policy</a>
            <a id="nav-contact-home" class="nav-link">Contact Us</a>
          </div>
        </div>
      </nav>
      
      <style>
        .header-top-responsive {
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
        }
        .header-actions-responsive {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .category-nav-responsive {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1400px;
          margin: 0 auto;
        }
        .main-nav-responsive {
          display: flex;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .header-top-responsive {
            flex-wrap: wrap;
            padding: 0.8rem 1rem;
            gap: 1rem;
          }
          .header-logo {
            flex: 1 1 auto;
          }
          .header-search {
            order: 3;
            flex: 1 1 100%;
            max-width: 100% !important;
          }
          .header-actions-responsive {
            order: 2;
            width: auto;
            justify-content: flex-end;
            gap: 0.5rem;
          }
          .category-nav-responsive {
            flex-direction: column;
            gap: 1rem;
          }
          .main-nav-responsive {
            flex-wrap: wrap;
            justify-content: center;
            gap: 1rem;
          }
          .header-icon-btn {
            width: 36px;
            height: 36px;
          }
          .header-icon-btn .material-icons-round {
            font-size: 1.2rem;
          }
        }
        .header-icon-btn {
          background: rgba(255,255,255,0.1);
          color: #fff;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .header-icon-btn:hover {
          background: #FFFF00;
          color: #2E062B;
          transform: translateY(-2px);
        }
        .nav-link {
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }
        .nav-link:hover {
          color: #FFFF00;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: -4px;
          left: 0;
          background-color: #FFFF00;
          transition: width 0.3s ease;
        }
        .nav-link:hover::after {
          width: 100%;
        }
        .all-categories-btn:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        .header-search-input::placeholder {
          color: rgba(255,255,255,0.6);
        }
      </style>
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
        <div class="track-orders-title">Track My Orders</div>
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
  const slides = banners.map((b, i) => {
    const title = b.title || (i === 0 ? 'Welcome to Zando' : 'Special Collection');
    const subtitle = b.subtitle || 'Discover amazing products & unbeatable prices';
    const cta = b.ctaText || 'Shop Now';

    if (b.isMockup || !b.imageUrl) {
      return `
        <div class="carousel-slide mockup-slide">
          <div class="carousel-mockup-content">
            <div class="carousel-badge">🔥 Limited Offer</div>
            <h2 class="carousel-title">${title}</h2>
            <p class="carousel-subtitle">${subtitle}</p>
            <button class="carousel-cta-btn" onclick="document.getElementById('products-grid')?.scrollIntoView({behavior:'smooth'})">
              ${cta} <span class="material-icons-round" style="font-size:1.1rem;margin-left:4px;">arrow_forward</span>
            </button>
          </div>
        </div>
      `;
    }
    return `
      <div class="carousel-slide">
        <img src="${b.imageUrl}" alt="${title}" loading="lazy"
             onerror="this.onerror=null; this.style.display='none'; this.parentElement.classList.add('mockup-slide'); this.parentElement.innerHTML=\`<div class=\\'carousel-mockup-content\\'><div class=\\'carousel-badge\\'>Featured</div><h2 class=\\'carousel-title\\'>${title}</h2><p class=\\'carousel-subtitle\\'>${subtitle}</p><button class=\\'carousel-cta-btn\\' onclick=\\'document.getElementById(\\\\''products-grid\\\\'')?.scrollIntoView({behavior:\\''smooth\\''})\\'>${cta}</button></div>\`;" />
        <div class="carousel-overlay">
          <div class="carousel-caption">
            <h2 class="carousel-title">${title}</h2>
            ${subtitle ? `<p class="carousel-subtitle">${subtitle}</p>` : ''}
            <button class="carousel-cta-btn" onclick="document.getElementById('products-grid')?.scrollIntoView({behavior:'smooth'})">
              ${cta} <span class="material-icons-round" style="font-size:1.1rem;margin-left:4px;">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const dots = banners.map((_, i) =>
    `<div class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`
  ).join('');

  return `
    <style>
      .hero-section-wrapper {
        display: flex;
        align-items: stretch;
        gap: 1.25rem;
        padding: 0 1.5rem;
        max-width: 1400px;
        margin: 0 auto;
      }
      .hero-carousel-col {
        flex: 1 1 0%;
        min-width: 0;
        aspect-ratio: 16 / 7;
        max-height: 420px;
        min-height: 280px;
      }
      .hero-carousel-col .home-hero {
        margin: 0;
        height: 100%;
      }
      .hero-carousel-col .home-hero .carousel {
        position: relative;
        height: 100%;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      }
      .hero-carousel-col .carousel-track {
        display: flex;
        height: 100%;
        transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
      }
      .hero-carousel-col .carousel-slide {
        min-width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      }
      .hero-carousel-col .carousel-slide img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .hero-carousel-col .carousel-slide.mockup-slide {
        background: linear-gradient(135deg, #2E062B 0%, #4a0d46 50%, #1a0319 100%);
        display: flex;
        align-items: center;
        justify-content: flex-start;
        position: relative;
        height: 100%;
        aspect-ratio: unset;
      }
      .carousel-mockup-content {
        padding: 2.5rem;
        text-align: left;
        max-width: 550px;
        color: #fff;
        z-index: 2;
        width: 100%;
      }
      .carousel-badge {
        display: inline-block;
        background: #FFFF00;
        color: #2E062B;
        font-weight: 800;
        font-size: 0.75rem;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 20px;
        margin-bottom: 0.75rem;
        letter-spacing: 0.05em;
      }
      .carousel-title {
        font-size: 2rem;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.2;
        margin-bottom: 0.5rem;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        font-family: var(--font-display, sans-serif);
      }
      .carousel-subtitle {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.85);
        margin-bottom: 1.25rem;
        line-height: 1.4;
      }
      .carousel-cta-btn {
        display: inline-flex;
        align-items: center;
        background: #FFFF00;
        color: #2E062B;
        font-weight: 700;
        font-size: 0.95rem;
        padding: 0.65rem 1.4rem;
        border-radius: 30px;
        border: none;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 4px 15px rgba(255,255,0,0.3);
      }
      .carousel-cta-btn:hover {
        background: #fff;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255,255,255,0.4);
      }
      .carousel-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(46,6,43,0.3) 60%, transparent 100%);
        display: flex;
        align-items: flex-end;
        padding: 2rem;
        z-index: 1;
      }
      .carousel-caption {
        max-width: 550px;
        color: #fff;
      }
      .carousel-arrow {
        display: none !important;
      }

      .carousel-dots {
        position: absolute;
        bottom: 1.25rem;
        right: 1.5rem;
        display: flex;
        gap: 8px;
        z-index: 10;
      }
      .carousel-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .carousel-dot.active {
        width: 28px;
        border-radius: 10px;
        background: #FFFF00;
      }

      /* === Download App Card === */
      .download-app-card {
        flex: 0 0 300px;
        width: 300px;
        border-radius: 20px;
        background: linear-gradient(145deg, #2E062B 0%, #1a0319 60%, #0d1a2e 100%);
        border: 1px solid rgba(255, 255, 0, 0.18);
        box-shadow:
          0 8px 32px rgba(0,0,0,0.45),
          inset 0 1px 0 rgba(255,255,255,0.08);
        padding: 1.5rem 1.25rem 1.25rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.9rem;
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        cursor: default;
      }
      .download-app-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(255,255,0,0.06) 0%, transparent 50%, rgba(46,6,43,0.1) 100%);
        pointer-events: none;
      }
      .download-app-card::after {
        content: '';
        position: absolute;
        top: -60%;
        left: -60%;
        width: 220%;
        height: 220%;
        background: conic-gradient(from 0deg, transparent 0deg, rgba(255,255,0,0.04) 60deg, transparent 120deg);
        animation: dac-spin 8s linear infinite;
        pointer-events: none;
      }
      @keyframes dac-spin {
        to { transform: rotate(360deg); }
      }
      .download-app-card:hover {
        transform: translateY(-4px);
        box-shadow:
          0 16px 48px rgba(0,0,0,0.55),
          0 0 0 1px rgba(255,255,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.1);
      }
      .dac-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        position: relative;
        z-index: 1;
        text-align: center;
      }
      .dac-icon-ring {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: linear-gradient(135deg, #FFFF00 0%, #e6c800 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(255,255,0,0.35);
        margin-bottom: 0.2rem;
      }
      .dac-icon-ring .material-icons-round {
        font-size: 1.6rem;
        color: #2E062B;
      }
      .dac-title {
        font-size: 1.05rem;
        font-weight: 800;
        color: #fff;
        letter-spacing: 0.02em;
        line-height: 1.2;
      }
      .dac-subtitle {
        font-size: 0.72rem;
        color: rgba(255,255,255,0.55);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-weight: 500;
      }
      .dac-divider {
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,0,0.25), transparent);
        position: relative;
        z-index: 1;
      }
      .dac-qr-wrap {
        position: relative;
        z-index: 1;
        width: 130px;
        height: 130px;
        border-radius: 14px;
        background: #fff;
        padding: 6px;
        box-shadow:
          0 4px 20px rgba(0,0,0,0.4),
          0 0 0 2px rgba(255,255,0,0.2);
        flex-shrink: 0;
      }
      .dac-qr-wrap img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
        display: block;
      }
      .dac-scan-label {
        font-size: 0.68rem;
        color: rgba(255,255,255,0.4);
        text-align: center;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        position: relative;
        z-index: 1;
        margin-top: -0.3rem;
      }
      .dac-badges {
        position: relative;
        z-index: 1;
        width: 100%;
        display: flex;
        justify-content: center;
      }
      .dac-badges img {
        width: 100%;
        max-width: 230px;
        height: auto;
        object-fit: contain;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        transition: filter 0.3s ease, transform 0.3s ease;
      }
      .dac-badges img:hover {
        filter: drop-shadow(0 4px 14px rgba(255,255,0,0.25));
        transform: scale(1.03);
      }
      .dac-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #FFFF00;
        box-shadow: 0 0 0 0 rgba(255,255,0,0.5);
        animation: dac-pulse 2s ease-in-out infinite;
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 2;
      }
      @keyframes dac-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(255,255,0,0.55); }
        70%  { box-shadow: 0 0 0 10px rgba(255,255,0,0); }
        100% { box-shadow: 0 0 0 0 rgba(255,255,0,0); }
      }

      /* Responsive */
      @media (max-width: 900px) {
        .hero-section-wrapper {
          flex-direction: column;
          padding: 0 1rem;
          gap: 1rem;
        }
        .hero-carousel-col {
          aspect-ratio: 16 / 7;
          max-height: 280px;
          width: 100%;
        }
        .download-app-card {
          flex: unset;
          width: 100%;
          flex-direction: row;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
        }
        .download-app-card::after { display: none; }
        .dac-header { align-items: flex-start; text-align: left; flex-direction: row; gap: 0.75rem; }
        .dac-icon-ring { flex-shrink: 0; }
        .dac-qr-wrap { width: 90px; height: 90px; flex-shrink: 0; }
        .dac-badges img { max-width: 180px; }
        .dac-divider { display: none; }
        .dac-scan-label { display: none; }
        .dac-pulse-dot { top: 10px; right: 10px; }
      }
      @media (max-width: 768px) {
        .download-app-card {
          display: none !important;
        }
      }
      @media (max-width: 480px) {
        .hero-carousel-col {
          aspect-ratio: 16 / 8;
          max-height: 200px;
        }
        .carousel-title { font-size: 1.3rem; }
        .carousel-subtitle { font-size: 0.85rem; }
        .carousel-mockup-content { padding: 1.2rem; }
      }
    </style>

    <div class="hero-section-wrapper">
      <!-- Carousel column -->
      <div class="hero-carousel-col">
        <div class="home-hero">
          <div class="carousel" id="main-carousel">
            <div class="carousel-track" id="carousel-track">${slides}</div>
            <div class="carousel-dots" id="carousel-dots">${dots}</div>
          </div>
        </div>
      </div>

      <!-- Download App Card -->
      <div class="download-app-card" id="download-app-card">
        <div class="dac-pulse-dot"></div>

        <div class="dac-header">
          <div class="dac-icon-ring">
            <span class="material-icons-round">smartphone</span>
          </div>
          <div>
            <div class="dac-title">Get the App</div>
            <div class="dac-subtitle">Shop on the go</div>
          </div>
        </div>

        <div class="dac-divider"></div>

        <div class="dac-qr-wrap">
          <img src="assets/images/qr-code.png" alt="Scan to download Zando app" />
        </div>
        <div class="dac-scan-label">📷 Scan to download</div>

        <div class="dac-badges">
          <img src="assets/images/pngegg.png" alt="Available on Google Play & App Store" />
        </div>
      </div>
    </div>

    <!-- Google AdSense Ad (Bottom of Carousel Slider) -->
    <div class="adsense-hero-banner-container" id="adsense-hero-banner" style="max-width: 1400px; margin: 1.25rem auto 0.5rem auto; padding: 0 1.5rem; width: 100%; box-sizing: border-box; text-align: center; overflow: hidden; min-height: 90px;">
      <!-- Adsense Ad01 -->
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-1267014580635785"
           data-ad-slot="7240410314"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      <script>
        try {
          (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {}
      </script>
    </div>
  `;
}

// ---- Product Grid ----
function renderProductGrid() {
  const { filteredProducts, products } = getState();

  const wrapperStart = '<div class="products-section-wrapper" style="max-width: 1400px; margin: 1.5rem auto 0 auto; padding: 0 1.5rem; width: 100%;">';

  // If we haven't loaded any products at all, show skeletons
  if (products.length === 0) {
    return `
      ${wrapperStart}
        <div class="products-grid" id="products-grid">
          ${renderSkeletonGrid(10)}
        </div>
      </div>
    `;
  }

  // If we have loaded products but the filtered list is empty, show empty state
  if (filteredProducts.length === 0) {
    return `
      ${wrapperStart}
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
    ${wrapperStart}
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

  // Main Nav Links
  document.getElementById('nav-about-home')?.addEventListener('click', () => navigate('about'));
  document.getElementById('nav-privacy-home')?.addEventListener('click', () => navigate('privacy'));
  document.getElementById('nav-contact-home')?.addEventListener('click', () => navigate('contact'));
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

  // Touch gesture support
  const carouselEl = document.getElementById('main-carousel');
  if (carouselEl) {
    let startX = 0;
    carouselEl.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    carouselEl.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          _carouselIndex = (_carouselIndex + 1) % _carouselTotal;
        } else {
          _carouselIndex = (_carouselIndex - 1 + _carouselTotal) % _carouselTotal;
        }
        updateCarousel();
        resetTimer();
      }
    }, { passive: true });
  }

  // Safely request Google AdSense ad fill
  try {
    const adIns = document.querySelector('#adsense-hero-banner .adsbygoogle');
    if (adIns && !adIns.getAttribute('data-adsbygoogle-status')) {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  } catch (err) {
    console.debug('[AdSense] Request notice:', err);
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

// ---- Bottom Navigation (mobile) ----
export function renderBottomNav(activePage) {
  const { currentUser } = getState();
  const cartCount = getCartCount();
  return `
    <nav class="bottom-nav" id="bottom-nav">
      <button class="bottom-nav-item ${activePage === 'home' ? 'active' : ''}" id="bnav-home" aria-label="Home">
        <span class="material-icons-round">home</span>
      </button>
      <button class="bottom-nav-item ${activePage === 'profile' ? 'active' : ''}" id="bnav-profile" aria-label="${currentUser ? 'Profile' : 'Sign In'}">
        <span class="material-icons-round">person</span>
      </button>
      <button class="bottom-nav-item ${activePage === 'cart' ? 'active' : ''}" id="bnav-cart" aria-label="Cart" style="position:relative;">
        <span class="material-icons-round">shopping_cart</span>
        ${cartCount > 0 ? `<span class="bottom-nav-badge">${cartCount}</span>` : ''}
      </button>
      <button class="bottom-nav-item ${activePage === 'categories' ? 'active' : ''}" id="bnav-categories" aria-label="Categories">
        <span class="material-icons-round">grid_view</span>
      </button>
    </nav>
  `;
}

export function bindBottomNav() {
  document.getElementById('bnav-home')?.addEventListener('click', () => {
    import('../js/products.js').then(({ clearFilters }) => clearFilters());
    navigate('home');
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

// Export for external re-renders
export { updateCartBadge, updateNotificationBadge, updateProductGrid as _refreshGrid };

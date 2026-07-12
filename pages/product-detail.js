// =====================================================
// ZANDO WEB — pages/product-detail.js
// Product detail page
// =====================================================

import { getState } from '../js/state.js';
import { addToCart } from '../js/state.js';
import { toggleWishlist } from '../js/auth.js';
import { showToast, formatCurrency, renderStars, imgFallback } from '../js/utils.js';
import { navigate } from '../js/router.js';
import { renderCheckoutModal } from './checkout.js';

let _currentImageIndex = 0;

export function renderProductDetail(appEl) {
  const { currentProduct: p, userModel, currentUser } = getState();
  if (!p) { navigate('home'); return; }

  const inWishlist = userModel?.wishlist?.includes(p.id);
  const allImages = [p.imageUrl, ...(p.galleryImages || [])].filter(Boolean);
  _currentImageIndex = 0;

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderProductDetailHeader()}
      <div class="page-content">
        <div class="main-area">
          <div class="product-detail-layout">
            <!-- Gallery -->
            <div class="product-detail-gallery">
              <div class="product-main-image" id="main-img-wrap">
                <img id="main-product-img" src="${allImages[0] || ''}" alt="${p.name}"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect width=%22400%22 height=%22400%22 fill=%22%23B1A7B4%22/%3E%3C/svg%3E'" />
              </div>
              ${allImages.length > 1 ? `
                <div class="product-gallery-thumbs" id="gallery-thumbs">
                  ${allImages.map((img, i) => `
                    <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-thumb="${i}">
                      <img src="${img}" alt="View ${i + 1}" loading="lazy" />
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Info -->
            <div class="product-detail-info">
              <div class="product-detail-category">${p.category || ''}${p.shop ? ` · ${p.shop}` : ''}</div>
              <h1 class="product-detail-name">${p.name}</h1>

              ${p.rating > 0 ? `
                <div class="product-detail-rating">
                  ${renderStars(p.rating, p.reviewsCount)}
                </div>
              ` : ''}

              <div class="product-detail-price">${formatCurrency(p.price)}</div>

              ${p.description ? `
                <div>
                  <h5 style="margin-bottom:0.5rem;font-size:var(--text-base);">Description</h5>
                  <p class="product-detail-description">${p.description}</p>
                </div>
              ` : ''}

              <div class="product-detail-actions">
                <button class="wishlist-btn ${inWishlist ? 'active' : ''}" id="detail-wishlist-btn" aria-label="Wishlist">
                  <span class="material-icons-round">${inWishlist ? 'favorite' : 'favorite_border'}</span>
                </button>
                <button class="btn btn-outline" id="detail-add-cart-btn">
                  <span class="material-icons-round">shopping_cart</span>
                  ADD TO CART
                </button>
                <button class="btn btn-primary" id="detail-buy-now-btn">
                  <span class="material-icons-round">bolt</span>
                  BUY NOW
                </button>
              </div>

              <!-- Trust badges -->
              <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:0.5rem;">
                <div style="display:flex;align-items:center;gap:6px;font-size:var(--text-xs);color:var(--color-text-muted);">
                  <span class="material-icons-round" style="font-size:1rem;color:var(--color-success);">verified</span>
                  Genuine Product
                </div>
                <div style="display:flex;align-items:center;gap:6px;font-size:var(--text-xs);color:var(--color-text-muted);">
                  <span class="material-icons-round" style="font-size:1rem;color:var(--color-primary);">local_shipping</span>
                  Fast Delivery
                </div>
                <div style="display:flex;align-items:center;gap:6px;font-size:var(--text-xs);color:var(--color-text-muted);">
                  <span class="material-icons-round" style="font-size:1rem;color:var(--color-warning);">replay</span>
                  Easy Returns
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Gallery thumbs
  document.getElementById('gallery-thumbs')?.addEventListener('click', (e) => {
    const thumb = e.target.closest('[data-thumb]');
    if (!thumb) return;
    _currentImageIndex = parseInt(thumb.dataset.thumb);
    document.getElementById('main-product-img').src = allImages[_currentImageIndex];
    document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
      t.classList.toggle('active', i === _currentImageIndex);
    });
  });

  // Add to Cart
  document.getElementById('detail-add-cart-btn')?.addEventListener('click', () => {
    addToCart(p);
    showToast(`${p.name} added to cart!`, 'success');
  });

  // Buy Now
  document.getElementById('detail-buy-now-btn')?.addEventListener('click', () => {
    if (!currentUser) { showToast('Please sign in to purchase', 'info'); navigate('login'); return; }
    renderCheckoutModal([{
      productId: p.id,
      productName: p.name,
      quantity: 1,
      price: p.price,
      imageUrl: p.imageUrl,
    }], p.price);
  });

  // Wishlist
  document.getElementById('detail-wishlist-btn')?.addEventListener('click', async () => {
    if (!currentUser) { showToast('Sign in to save items', 'info'); return; }
    await toggleWishlist(p.id);
    const { userModel: um } = getState();
    const inWl = um?.wishlist?.includes(p.id);
    const btn = document.getElementById('detail-wishlist-btn');
    btn?.classList.toggle('active', inWl);
    const icon = btn?.querySelector('.material-icons-round');
    if (icon) icon.textContent = inWl ? 'favorite' : 'favorite_border';
  });
}

function renderProductDetailHeader() {
  return `
    <header class="site-header">
      <div class="header-top">
        <button class="icon-btn" id="back-btn" aria-label="Go back" style="flex-shrink:0;">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div class="header-logo" id="home-logo-btn" style="cursor:pointer;">
          <span class="header-logo-text">ZANDO</span>
        </div>
        <div style="flex:1;"></div>
        <div class="header-actions">
          <button class="icon-btn" id="cart-header-btn" aria-label="Cart">
            <span class="material-icons-round">shopping_cart</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

// Bind events registered after innerHTML
document.addEventListener('click', (e) => {
  if (e.target.closest('#back-btn')) { history.back(); }
  if (e.target.closest('#home-logo-btn')) { navigate('home'); }
  if (e.target.closest('#cart-header-btn')) { navigate('cart'); }
}, true);

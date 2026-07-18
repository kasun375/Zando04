// =====================================================
// ZANDO WEB — pages/product-detail.js
// Product detail page
// =====================================================

import { getState } from '../js/state.js';
import { addToCart } from '../js/state.js';
import { toggleWishlist } from '../js/auth.js';
import { showToast, formatCurrency, renderStars, imgFallback, renderFooter } from '../js/utils.js';
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
    <div class="app-layout" style="padding-bottom: 80px;">
      ${renderProductDetailHeader(p.name)}
      <div class="page-content">
        <div class="main-area" style="padding: 1rem;">
          <div class="product-detail-layout">
            <!-- Gallery -->
            <div class="product-detail-gallery">
              <div class="product-main-image" id="main-img-wrap" style="background: #fff; box-shadow: none; border-radius: 0;">
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
              <!-- Meta row: Category on left, Rating on right -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div class="product-detail-category" style="margin: 0; font-size: 0.85rem; color: #8E8E8E; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  ${p.category || 'CATEGORY'}
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #8E8E8E; font-weight: 500;">
                  <span class="material-icons-round" style="color: #FFC107; font-size: 1.15rem;">star</span>
                  <span>${Number(p.rating || 0).toFixed(1)} (${p.reviewsCount || 0} reviews)</span>
                </div>
              </div>

              <h1 class="product-detail-name" style="font-size: 1.5rem; font-weight: 700; color: #000; margin: 0; font-family: var(--font-display);">${p.name}</h1>

              <div class="product-detail-price" style="font-size: 2.25rem; font-weight: 700; color: #2E062B; margin: 0.5rem 0;">
                $${p.price}
              </div>

              ${p.description ? `
                <div style="margin-top: 1rem;">
                  <h5 style="margin-bottom: 0.5rem; font-size: 1rem; font-weight: 700; color: #000;">Description</h5>
                  <p class="product-detail-description" style="margin: 0; color: #6E6E6E; line-height: 1.6; font-size: 0.9rem;">${p.description}</p>
                </div>
              ` : ''}

              <div class="product-detail-actions">
                <button class="wishlist-btn ${inWishlist ? 'active' : ''}" id="detail-wishlist-btn" aria-label="Wishlist">
                  <span class="material-icons-round">${inWishlist ? 'favorite' : 'favorite_border'}</span>
                </button>
                <button class="btn btn-outline" id="detail-add-cart-btn">
                  ADD TO CART
                </button>
                <button class="btn btn-primary" id="detail-buy-now-btn">
                  BUY NOW
                </button>
              </div>

              <!-- Trust badges -->
              <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:1rem;">
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
      ${renderFooter()}
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

function renderProductDetailHeader(productName) {
  return `
    <header class="site-header product-detail-header">
      <div class="header-top" style="justify-content: flex-start; gap: 0.5rem; align-items: center;">
        <button class="icon-btn" id="back-btn" aria-label="Go back" style="flex-shrink:0;">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div class="header-title" style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: #2E062B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">
          ${productName}
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

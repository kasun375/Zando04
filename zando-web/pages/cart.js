// =====================================================
// ZANDO WEB — pages/cart.js
// Shopping cart page
// =====================================================

import { getState, updateCartQty, removeFromCart, getCartTotal } from '../js/state.js';
import { showToast, formatCurrency, renderFooter } from '../js/utils.js';
import { navigate } from '../js/router.js';
import { renderCheckoutModal } from './checkout.js';
import { renderBottomNav, bindBottomNav } from './home.js';

let _selectedIds = new Set();
let _lastRoute = null;

export function renderCart(appEl) {
  const { cart, currentUser } = getState();
  const items = Object.values(cart);

  const currentRoute = window.location.hash.slice(1) || 'home';
  if (_lastRoute !== 'cart') {
    _selectedIds = new Set(items.map(i => i.id));
  } else {
    const cartIds = new Set(items.map(i => i.id));
    for (const id of _selectedIds) {
      if (!cartIds.has(id)) {
        _selectedIds.delete(id);
      }
    }
  }
  _lastRoute = currentRoute;

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderCartHeader()}
      <div class="page-content">
        <div class="main-area">
          ${items.length === 0 ? renderEmptyCart() : renderCartContent(items)}
        </div>
      </div>
      ${renderFooter()}
      ${renderBottomNav('cart')}
    </div>
  `;

  bindCartEvents(items);
  bindBottomNav();
}

function renderCartHeader() {
  return `
    <header class="site-header">
      <div class="header-top">
        <button class="icon-btn" id="cart-back-btn" aria-label="Go back">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div class="header-logo" id="cart-logo-btn" style="cursor:pointer;">
          <span class="header-logo-text">ZANDO</span>
        </div>
        <div style="flex:1;"></div>
        <button class="icon-btn" id="cart-clear-btn" aria-label="Clear cart" title="Clear cart">
          <span class="material-icons-round">delete_outline</span>
        </button>
      </div>
    </header>
  `;
}

function renderEmptyCart() {
  return `
    <div class="empty-state">
      <span class="material-icons-round">shopping_cart</span>
      <h4>Your cart is empty</h4>
      <p>Add some products to your cart to get started</p>
      <button class="btn btn-primary" id="cart-shop-btn">START SHOPPING</button>
    </div>
  `;
}

function renderCartContent(items) {
  const selectedTotal = getCartTotal([..._selectedIds]);
  const selectAll = _selectedIds.size === items.length;

  return `
    <div class="cart-layout">
      <!-- Items -->
      <div class="cart-items-section">
        <div class="cart-section-header">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <input type="checkbox" id="select-all-cart" ${selectAll ? 'checked' : ''}
                   style="width:18px;height:18px;accent-color:var(--color-primary);" />
            <span class="cart-section-title">Your Cart (${items.length})</span>
          </div>
          <span style="font-size:var(--text-sm);color:var(--color-text-muted);">${_selectedIds.size} selected</span>
        </div>

        <div id="cart-items-list">
          ${items.map(renderCartItem).join('')}
        </div>
      </div>

      <!-- Order summary -->
      <div class="cart-order-summary">
        <div class="cart-summary-title">Order Summary</div>
        <div class="checkout-summary">
          <div class="checkout-summary-row">
            <span>Items (${_selectedIds.size})</span>
            <span>${formatCurrency(selectedTotal)}</span>
          </div>
          <div class="checkout-summary-row">
            <span>Delivery</span>
            <span style="color:var(--color-success);">FREE</span>
          </div>
          <div class="checkout-summary-row total">
            <span>Total</span>
            <span id="cart-total-display">${formatCurrency(selectedTotal)}</span>
          </div>
        </div>

        <button class="btn btn-primary btn-full btn-lg" id="cart-checkout-btn"
                ${_selectedIds.size === 0 ? 'disabled' : ''}>
          <span class="material-icons-round">shopping_bag</span>
          CHECKOUT
        </button>

        <button class="btn btn-ghost btn-full" id="cart-continue-btn" style="margin-top:0.75rem;">
          Continue Shopping
        </button>
      </div>
    </div>
  `;
}

function renderCartItem(item) {
  const isSelected = _selectedIds.has(item.id);
  return `
    <div class="cart-item" id="cart-item-${item.id}">
      <input type="checkbox" class="cart-item-checkbox" data-item-id="${item.id}" ${isSelected ? 'checked' : ''} />
      <img class="cart-item-img" src="${item.imageUrl || ''}" alt="${item.name}"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Crect width=%2264%22 height=%2264%22 fill=%22%23B1A7B4%22/%3E%3C/svg%3E'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatCurrency(item.price)} each</div>
      </div>
      <div class="cart-item-actions">
        <div class="cart-item-subtotal">${formatCurrency(item.price * item.quantity)}</div>
        <div class="qty-control">
          <button class="qty-btn" data-qty-dec="${item.id}">−</button>
          <span class="qty-value" id="qty-${item.id}">${item.quantity}</span>
          <button class="qty-btn" data-qty-inc="${item.id}">+</button>
        </div>
        <button class="btn btn-sm btn-ghost" data-remove-id="${item.id}"
                style="color:var(--color-error);padding:4px;">
          <span class="material-icons-round" style="font-size:1rem;">delete</span>
        </button>
      </div>
    </div>
  `;
}

function bindCartEvents(items) {
  // Back button
  document.getElementById('cart-back-btn')?.addEventListener('click', () => history.back());
  document.getElementById('cart-logo-btn')?.addEventListener('click', () => navigate('home'));

  // Empty cart state
  document.getElementById('cart-shop-btn')?.addEventListener('click', () => navigate('home'));
  document.getElementById('cart-continue-btn')?.addEventListener('click', () => navigate('home'));

  // Clear cart
  document.getElementById('cart-clear-btn')?.addEventListener('click', () => {
    if (!confirm('Clear entire cart?')) return;
    Object.keys(getState().cart).forEach(id => removeFromCart(id));
    renderCart(document.getElementById('app'));
  });

  // Checkout
  document.getElementById('cart-checkout-btn')?.addEventListener('click', () => {
    const { currentUser } = getState();
    if (!currentUser) { showToast('Please sign in to checkout', 'info'); navigate('login'); return; }
    if (_selectedIds.size === 0) { showToast('Select at least one item', 'info'); return; }

    const { cart } = getState();
    const selectedItems = Object.values(cart)
      .filter(item => _selectedIds.has(item.id))
      .map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.imageUrl,
      }));

    const total = getCartTotal([..._selectedIds]);
    renderCheckoutModal(selectedItems, total, [..._selectedIds]);
  });

  // Select all
  document.getElementById('select-all-cart')?.addEventListener('change', (e) => {
    const { cart } = getState();
    if (e.target.checked) _selectedIds = new Set(Object.keys(cart));
    else _selectedIds = new Set();
    updateCartSummary();
    document.querySelectorAll('.cart-item-checkbox').forEach(cb => { cb.checked = e.target.checked; });
  });

  // Item checkboxes
  document.getElementById('cart-items-list')?.addEventListener('change', (e) => {
    if (e.target.matches('.cart-item-checkbox')) {
      const id = e.target.dataset.itemId;
      if (e.target.checked) _selectedIds.add(id);
      else _selectedIds.delete(id);
      updateCartSummary();
    }
  });

  // Qty & remove
  document.getElementById('cart-items-list')?.addEventListener('click', (e) => {
    const dec = e.target.closest('[data-qty-dec]');
    const inc = e.target.closest('[data-qty-inc]');
    const rem = e.target.closest('[data-remove-id]');

    if (dec) {
      updateCartQty(dec.dataset.qtyDec, -1);
      refreshCartItem(dec.dataset.qtyDec);
    } else if (inc) {
      updateCartQty(inc.dataset.qtyInc, 1);
      refreshCartItem(inc.dataset.qtyInc);
    } else if (rem) {
      removeFromCart(rem.dataset.removeId);
      _selectedIds.delete(rem.dataset.removeId);
      const row = document.getElementById(`cart-item-${rem.dataset.removeId}`);
      if (row) row.remove();
      updateCartSummary();
      if (Object.keys(getState().cart).length === 0) {
        document.querySelector('.cart-layout').outerHTML = renderEmptyCart();
      }
    }
  });
}

function refreshCartItem(productId) {
  const { cart } = getState();
  const item = cart[productId];
  if (!item) {
    document.getElementById(`cart-item-${productId}`)?.remove();
    return;
  }
  const qtyEl = document.getElementById(`qty-${productId}`);
  if (qtyEl) qtyEl.textContent = item.quantity;
  const subtotalEl = document.querySelector(`#cart-item-${productId} .cart-item-subtotal`);
  if (subtotalEl) subtotalEl.textContent = formatCurrency(item.price * item.quantity);
  updateCartSummary();
}

function updateCartSummary() {
  const total = getCartTotal([..._selectedIds]);
  const totalEl = document.getElementById('cart-total-display');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) checkoutBtn.disabled = _selectedIds.size === 0;
  const selectedCount = document.querySelector('#select-all-cart')?.closest('.cart-section-header')?.querySelector('span:last-child');
  if (selectedCount) selectedCount.textContent = `${_selectedIds.size} selected`;
}

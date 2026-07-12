// =====================================================
// ZANDO WEB — pages/order-history.js
// User order history page
// =====================================================

import { getState } from '../js/state.js';
import { fetchMyOrders, getStatusColor } from '../js/orders.js';
import { showToast, formatCurrency, formatDate } from '../js/utils.js';
import { navigate } from '../js/router.js';

export async function renderOrderHistory(appEl) {
  const { currentUser } = getState();
  // Guard must happen BEFORE rendering — auth state is already resolved by the time
  // app.js calls this, so this is safe.
  if (!currentUser) { navigate('login'); return; }

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderOrderHistoryHeader()}
      <div class="page-content">
        <div class="main-area">
          <div class="order-history-page">
            <div class="loading-overlay" id="orders-loading">
              <div class="spinner"></div>
              <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-top:0.5rem;">Loading your orders…</p>
            </div>
            <div id="orders-content"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const orders = await fetchMyOrders();
    renderOrdersList(orders);
  } catch (err) {
    console.error('[OrderHistory] fetchMyOrders error:', err);
    const loading = document.getElementById('orders-loading');
    const content = document.getElementById('orders-content');
    if (loading) loading.style.display = 'none';
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round" style="color:var(--color-error);">error_outline</span>
          <h4>Couldn't load orders</h4>
          <p>${err?.code === 'permission-denied'
            ? 'Permission denied. Check your Firestore security rules.'
            : (err?.message || 'Something went wrong. Please try again.')}
          </p>
          <button class="btn btn-primary" id="orders-retry-btn">RETRY</button>
        </div>
      `;
      document.getElementById('orders-retry-btn')?.addEventListener('click', () => renderOrderHistory(appEl));
    }
  }
}

function renderOrdersList(orders) {
  const loading = document.getElementById('orders-loading');
  const content = document.getElementById('orders-content');
  if (loading) loading.style.display = 'none';

  if (!content) return;

  if (orders.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">receipt_long</span>
        <h4>No orders yet</h4>
        <p>Your order history will appear here once you make a purchase</p>
        <button class="btn btn-primary" id="orders-shop-btn">START SHOPPING</button>
      </div>
    `;
    document.getElementById('orders-shop-btn')?.addEventListener('click', () => navigate('home'));
    return;
  }

  content.innerHTML = `
    <div class="order-history-header">
      <h2 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:800;">
        Order History
      </h2>
      <span style="color:var(--color-text-muted);font-size:var(--text-sm);">${orders.length} orders</span>
    </div>
    ${orders.map(renderOrderCard).join('')}
  `;

  // Toggle order details
  content.querySelectorAll('.order-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      body?.classList.toggle('open');
      const icon = header.querySelector('.expand-icon');
      if (icon) icon.textContent = body?.classList.contains('open') ? 'expand_less' : 'expand_more';
    });
  });
}

function renderOrderCard(order) {
  const statusColor = getStatusColor(order.status);
  const date = order.createdAt?.seconds
    ? formatDate(new Date(order.createdAt.seconds * 1000))
    : formatDate(order.createdAt);

  const itemsHtml = (order.items || []).map(item => `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
      <img src="${item.imageUrl || ''}" alt="${item.productName}"
           style="width:40px;height:40px;border-radius:var(--radius-sm);object-fit:cover;background:var(--color-surface-2);"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23B1A7B4%22/%3E%3C/svg%3E'" />
      <div style="flex:1;">
        <div style="font-size:var(--text-sm);font-weight:600;">${item.productName}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);">
          ${formatCurrency(item.price)} × ${item.quantity}
        </div>
      </div>
      <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-primary);">
        ${formatCurrency(item.price * item.quantity)}
      </div>
    </div>
  `).join('');

  return `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-card-id">
            Order #${order.id.length > 8 ? order.id.substring(0, 8).toUpperCase() : order.id.toUpperCase()}
          </div>
          <div class="order-card-date">${date}</div>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="status-pill ${order.status}" style="color:${statusColor};background:${statusColor}22;">
            ${(order.status || 'pending').toUpperCase()}
          </span>
          <span class="material-icons-round expand-icon" style="color:var(--color-text-muted);">expand_more</span>
        </div>
      </div>
      <div class="order-card-body">
        <div style="margin-bottom:1rem;">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:0.5rem;">Items Ordered</div>
          ${itemsHtml}
        </div>
        ${order.shippingAddress ? `
          <div style="display:flex;align-items:flex-start;gap:0.5rem;margin-bottom:0.75rem;">
            <span class="material-icons-round" style="font-size:1rem;color:var(--color-text-muted);margin-top:2px;">location_on</span>
            <div>
              <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-muted);">SHIPPING ADDRESS</div>
              <div style="font-size:var(--text-sm);">${order.shippingAddress}</div>
            </div>
          </div>
        ` : ''}
        ${order.paymentMethod ? `
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
            <span class="material-icons-round" style="font-size:1rem;color:var(--color-text-muted);">payment</span>
            <div>
              <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-muted);">PAID VIA</div>
              <div style="font-size:var(--text-sm);">${order.paymentMethod}</div>
            </div>
          </div>
        ` : ''}
        <div style="text-align:right;font-size:var(--text-lg);font-weight:800;color:var(--color-primary);">
          Total: ${formatCurrency(order.totalAmount)}
        </div>
      </div>
    </div>
  `;
}

function renderOrderHistoryHeader() {
  return `
    <header class="site-header">
      <div class="header-top">
        <button class="icon-btn" id="orders-back-btn" aria-label="Go back">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:white;flex:1;text-align:center;">
          My Orders
        </div>
        <button class="icon-btn" id="orders-cart-btn" aria-label="Cart">
          <span class="material-icons-round">shopping_cart</span>
        </button>
      </div>
    </header>
  `;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#orders-back-btn')) history.back();
  if (e.target.closest('#orders-cart-btn')) navigate('cart');
}, true);

// =====================================================
// ZANDO WEB — pages/order-history.js
// User order history page
// =====================================================

import { getState, addToCart } from '../js/state.js';
import { fetchMyOrders, getStatusColor } from '../js/orders.js';
import { showToast, formatCurrency, formatDate } from '../js/utils.js';
import { navigate } from '../js/router.js';

export async function renderOrderHistory(appEl) {
  const { currentUser } = getState();
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

  // Timeline Stepper calculation
  const statusMap = { 'pending': 1, 'processing': 2, 'shipped': 3, 'delivered': 4 };
  const currentStep = statusMap[order.status?.toLowerCase()] || 1;
  const progressPercent = ((currentStep - 1) / 3) * 100;

  const timelineHtml = `
    <div style="margin:1.5rem 0 1rem;">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-muted);margin-bottom:0.5rem;letter-spacing:0.5px;">DELIVERY STATUS</div>
      <div class="delivery-timeline" style="display:flex;justify-content:space-between;align-items:center;position:relative;padding:0 0.5rem;">
        <div style="position:absolute;top:12px;left:10%;right:10%;height:3px;background:var(--color-border);z-index:1;"></div>
        <div style="position:absolute;top:12px;left:10%;width:${progressPercent}%;height:3px;background:var(--color-primary);z-index:2;transition:width 0.4s ease;"></div>
        
        <div style="z-index:3;text-align:center;">
          <div style="width:24px;height:24px;border-radius:50%;background:${currentStep >= 1 ? 'var(--color-primary)' : 'var(--color-surface-2)'};color:${currentStep >= 1 ? '#fff' : 'var(--color-text-muted)'};border:2px solid ${currentStep >= 1 ? 'var(--color-primary)' : 'var(--color-border)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin:0 auto 4px;">1</div>
          <div style="font-size:9px;font-weight:700;color:${currentStep >= 1 ? 'var(--color-text-body)' : 'var(--color-text-muted)'};">Pending</div>
        </div>
        
        <div style="z-index:3;text-align:center;">
          <div style="width:24px;height:24px;border-radius:50%;background:${currentStep >= 2 ? 'var(--color-primary)' : 'var(--color-surface-2)'};color:${currentStep >= 2 ? '#fff' : 'var(--color-text-muted)'};border:2px solid ${currentStep >= 2 ? 'var(--color-primary)' : 'var(--color-border)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin:0 auto 4px;">2</div>
          <div style="font-size:9px;font-weight:700;color:${currentStep >= 2 ? 'var(--color-text-body)' : 'var(--color-text-muted)'};">Processing</div>
        </div>

        <div style="z-index:3;text-align:center;">
          <div style="width:24px;height:24px;border-radius:50%;background:${currentStep >= 3 ? 'var(--color-primary)' : 'var(--color-surface-2)'};color:${currentStep >= 3 ? '#fff' : 'var(--color-text-muted)'};border:2px solid ${currentStep >= 3 ? 'var(--color-primary)' : 'var(--color-border)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin:0 auto 4px;">3</div>
          <div style="font-size:9px;font-weight:700;color:${currentStep >= 3 ? 'var(--color-text-body)' : 'var(--color-text-muted)'};">Shipped</div>
        </div>

        <div style="z-index:3;text-align:center;">
          <div style="width:24px;height:24px;border-radius:50%;background:${currentStep >= 4 ? 'var(--color-success)' : 'var(--color-surface-2)'};color:${currentStep >= 4 ? '#fff' : 'var(--color-text-muted)'};border:2px solid ${currentStep >= 4 ? 'var(--color-success)' : 'var(--color-border)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin:0 auto 4px;">4</div>
          <div style="font-size:9px;font-weight:700;color:${currentStep >= 4 ? 'var(--color-success)' : 'var(--color-text-muted)'};">Delivered</div>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="order-card" id="order-card-${order.id}">
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
        ${timelineHtml}
        
        ${order.estimatedDelivery ? `
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;background:rgba(255,255,0,0.1);padding:0.5rem;border-radius:var(--radius-sm);">
            <span class="material-icons-round" style="font-size:1.1rem;color:var(--color-primary);">event</span>
            <span style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-body);">ESTIMATED DELIVERY: ${order.estimatedDelivery}</span>
          </div>
        ` : ''}

        <div style="margin-bottom:1rem;">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:0.5rem;">Items Ordered</div>
          ${itemsHtml}
        </div>

        ${order.isGift ? `
          <div style="background:rgba(255,105,180,0.1);border-radius:var(--radius-md);padding:0.75rem 1rem;margin-bottom:1rem;border:1px dashed var(--color-primary);">
            <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-primary);margin-bottom:0.25rem;">🎁 GIFT ORDER DETAILS</div>
            <div style="font-size:var(--text-sm);margin-bottom:0.25rem;"><strong>To:</strong> ${order.recipientName} (${order.recipientPhone})</div>
            ${order.giftMessage ? `<div style="font-size:var(--text-sm);font-style:italic;">"${order.giftMessage}"</div>` : ''}
            ${order.giftWrap ? `<div style="font-size:var(--text-xs);color:var(--color-success);font-weight:bold;margin-top:0.25rem;">✓ Premium Gift Wrapped</div>` : ''}
          </div>
        ` : ''}

        ${order.shippingAddress ? `
          <div style="display:flex;align-items:flex-start;gap:0.5rem;margin-bottom:0.75rem;">
            <span class="material-icons-round" style="font-size:1rem;color:var(--color-text-muted);margin-top:2px;">location_on</span>
            <div>
              <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-muted);">SHIPPING ADDRESS</div>
              <div style="font-size:var(--text-sm);">${order.shippingAddress}</div>
            </div>
          </div>
        ` : ''}
        ${order.mobileNumber ? `
          <div style="display:flex;align-items:flex-start;gap:0.5rem;margin-bottom:0.75rem;">
            <span class="material-icons-round" style="font-size:1rem;color:var(--color-text-muted);margin-top:2px;">phone</span>
            <div>
              <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-muted);">MOBILE NUMBER</div>
              <div style="font-size:var(--text-sm);">${order.mobileNumber}</div>
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
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;border-top:1px solid var(--color-border);padding-top:0.75rem;">
          <button class="btn btn-outline btn-sm" data-reorder-id="${order.id}">
            <span class="material-icons-round" style="font-size:1rem;">refresh</span> REORDER
          </button>
          <div style="font-size:var(--text-lg);font-weight:800;color:var(--color-primary);">
            Total: ${formatCurrency(order.totalAmount)}
          </div>
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

// Delegated events
document.addEventListener('click', (e) => {
  if (e.target.closest('#orders-back-btn')) history.back();
  if (e.target.closest('#orders-cart-btn')) navigate('cart');

  const reorderBtn = e.target.closest('[data-reorder-id]');
  if (reorderBtn) {
    const orderId = reorderBtn.dataset.reorderId;
    const { orders } = getState();
    const order = orders.find(o => o.id === orderId);
    if (order && order.items) {
      order.items.forEach(item => {
        addToCart({
          id: item.productId,
          name: item.productName,
          price: item.price,
          imageUrl: item.imageUrl
        });
      });
      showToast('Items added back to cart!', 'success');
      navigate('cart');
    }
  }
}, true);

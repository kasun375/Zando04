// =====================================================
// ZANDO WEB — pages/admin.js
// Admin panel — Products, Orders, Banners
// =====================================================

import { getState, setState } from '../js/state.js';
import { deleteProduct } from '../js/products.js';
import { fetchAllOrders, updateOrderStatus, getStatusColor } from '../js/orders.js';
import { showToast, formatCurrency, formatDate } from '../js/utils.js';
import { navigate } from '../js/router.js';
import {
  collection, addDoc, deleteDoc, doc, getDocs, serverTimestamp, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export async function renderAdmin(appEl) {
  const { userModel } = getState();
  if (!userModel?.isAdmin) {
    showToast('Access denied. Admin only.', 'error');
    navigate('home');
    return;
  }

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderAdminHeader()}
      <div class="page-content">
        <div class="main-area">
          <div class="admin-layout">
            <div class="admin-header">
              <h2>Admin Panel</h2>
              <span class="admin-badge">ADMIN</span>
            </div>

            <!-- Tabs -->
            <div class="tabs" id="admin-tabs">
              <div class="tab-item active" data-tab="products">Products</div>
              <div class="tab-item" data-tab="orders">Orders</div>
              <div class="tab-item" data-tab="banners">Banners</div>
            </div>

            <div class="admin-tab-content" style="margin-top:1rem;">
              <div class="admin-tab-panel active" id="tab-products">
                <div class="loading-overlay"><div class="spinner"></div></div>
              </div>
              <div class="admin-tab-panel" id="tab-orders">
                <div class="loading-overlay"><div class="spinner"></div></div>
              </div>
              <div class="admin-tab-panel" id="tab-banners">
                <div class="loading-overlay"><div class="spinner"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  document.getElementById('admin-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
  });

  // Load all tabs in parallel
  await Promise.all([
    loadProductsTab(),
    loadOrdersTab(),
    loadBannersTab(),
  ]);
}

// ---- Products Tab ----
async function loadProductsTab() {
  const panel = document.getElementById('tab-products');
  if (!panel) return;

  const { products } = getState();
  panel.innerHTML = `
    <div class="admin-toolbar">
      <button class="btn btn-primary" id="sync-sheets-btn">
        <span class="material-icons-round">sync</span> SYNC FROM GOOGLE SHEETS
      </button>
    </div>
    <div id="admin-products-list">
      ${products.length === 0
        ? '<div class="empty-state"><span class="material-icons-round">inventory_2</span><h4>No products</h4></div>'
        : products.map(renderAdminProductRow).join('')
      }
    </div>
  `;

  document.getElementById('sync-sheets-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('sync-sheets-btn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-icons-round" style="animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;">sync</span> SYNCING...`;
    showToast('Syncing products and banners from Google Sheets...', 'info');

    try {
      const { syncFromGoogleSheets } = await import('../js/products.js');
      await syncFromGoogleSheets();
      showToast('Database synced successfully!', 'success');
      await loadProductsTab();
    } catch (err) {
      console.error(err);
      showToast('Sync failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  document.getElementById('admin-products-list')?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-delete-product]');
    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteProduct;
      if (!confirm('Delete this product?')) return;
      try {
        await deleteProduct(id);
        document.getElementById(`admin-product-${id}`)?.remove();
        showToast('Product deleted', 'success');
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
      }
    }
  });
}

function renderAdminProductRow(product) {
  return `
    <div class="admin-product-row" id="admin-product-${product.id}">
      <img class="admin-product-img" src="${product.imageUrl || ''}" alt="${product.name}"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2256%22%3E%3Crect width=%2256%22 height=%2256%22 fill=%22%23B1A7B4%22/%3E%3C/svg%3E'" />
      <div class="admin-product-info">
        <div class="admin-product-name">${product.name}</div>
        <div class="admin-product-meta">
          ${product.category}${product.shop ? ` · ${product.shop}` : ''} ·
          <span style="color:var(--color-primary);font-weight:700;">${formatCurrency(product.price)}</span>
          ${product.isFeatured ? ' · <span style="color:var(--color-warning);font-weight:700;">Featured</span>' : ''}
        </div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px;">
          ⭐ ${Number(product.rating || 0).toFixed(1)} (${product.reviewsCount || 0} reviews)
        </div>
      </div>
      <button class="btn btn-sm btn-danger" data-delete-product="${product.id}">
        <span class="material-icons-round" style="font-size:0.9rem;">delete</span>
      </button>
    </div>
  `;
}

// ---- Orders Tab ----
async function loadOrdersTab() {
  const panel = document.getElementById('tab-orders');
  if (!panel) return;

  try {
    const orders = await fetchAllOrders();
    renderAdminOrders(orders);
  } catch (err) {
    panel.innerHTML = `<div class="empty-state"><h4>Failed to load orders</h4></div>`;
  }
}

function renderAdminOrders(orders) {
  const panel = document.getElementById('tab-orders');
  if (!panel) return;

  if (orders.length === 0) {
    panel.innerHTML = '<div class="empty-state"><span class="material-icons-round">receipt_long</span><h4>No orders yet</h4></div>';
    return;
  }

  panel.innerHTML = orders.map(order => {
    const date = order.createdAt?.seconds ? formatDate(new Date(order.createdAt.seconds * 1000)) : '';
    const statusColor = getStatusColor(order.status);
    const itemsHtml = (order.items || []).slice(0, 2).map(item => `
      <span style="font-size:var(--text-xs);color:var(--color-text-muted);">${item.productName} ×${item.quantity}</span>
    `).join(' · ');

    return `
      <div class="order-card">
        <div class="admin-order-header" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-5);background:var(--color-surface-2);cursor:pointer;"
             data-toggle-order="${order.id}">
          <div>
            <div style="font-weight:700;font-size:var(--text-sm);">Order #${order.id.substring(0,8).toUpperCase()}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);">${date} · ${formatCurrency(order.totalAmount)}</div>
            <div style="margin-top:2px;">${itemsHtml}</div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span class="status-pill ${order.status}" style="color:${statusColor};background:${statusColor}22;">
              ${(order.status || '').toUpperCase()}
            </span>
            <span class="material-icons-round" style="color:var(--color-text-muted);font-size:1.1rem;">expand_more</span>
          </div>
        </div>
        <div class="order-card-body" id="admin-order-body-${order.id}">
          <!-- Items -->
          ${(order.items || []).map(item => `
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <img src="${item.imageUrl || ''}" style="width:36px;height:36px;border-radius:var(--radius-sm);object-fit:cover;"
                   onerror="this.style.background='#B1A7B4'" />
              <div style="flex:1;">
                <div style="font-size:var(--text-sm);font-weight:500;">${item.productName}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted);">${formatCurrency(item.price)} × ${item.quantity}</div>
              </div>
            </div>
          `).join('')}

          <hr class="divider" />

          <!-- Address & Payment -->
          ${order.shippingAddress ? `<p style="font-size:var(--text-sm);margin-bottom:0.25rem;">📍 ${order.shippingAddress}</p>` : ''}
          ${order.mobileNumber ? `<p style="font-size:var(--text-sm);margin-bottom:0.5rem;">📞 ${order.mobileNumber}</p>` : ''}
          ${order.paymentMethod ? `<p style="font-size:var(--text-sm);margin-bottom:1rem;">💳 ${order.paymentMethod}</p>` : ''}

          <!-- Status update -->
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <label style="font-size:var(--text-sm);font-weight:600;">Update Status:</label>
            <select class="status-select" data-order-id="${order.id}">
              ${ORDER_STATUSES.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Toggle expand
  panel.querySelectorAll('[data-toggle-order]').forEach(header => {
    header.addEventListener('click', () => {
      const body = document.getElementById(`admin-order-body-${header.dataset.toggleOrder}`);
      body?.classList.toggle('open');
    });
  });

  // Status change
  panel.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.orderId;
      const newStatus = e.target.value;
      try {
        await updateOrderStatus(orderId, newStatus);
        showToast(`Order status updated to ${newStatus}`, 'success');
      } catch (err) {
        showToast('Status update failed', 'error');
      }
    });
  });
}

// ---- Banners Tab ----
async function loadBannersTab() {
  const panel = document.getElementById('tab-banners');
  if (!panel) return;

  try {
    const snap = await getDocs(collection(window._db, 'banners'));
    const banners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderBannersTab(banners);
  } catch (err) {
    panel.innerHTML = '<div class="empty-state"><h4>Failed to load banners</h4></div>';
  }
}

function renderBannersTab(banners) {
  const panel = document.getElementById('tab-banners');
  if (!panel) return;

  panel.innerHTML = `
    <div class="admin-toolbar" style="flex-direction:column;gap:0.75rem;align-items:stretch;">
      <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:0.25rem;">Add New Banner</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
        <input type="text" id="banner-url-input" class="form-control" placeholder="Banner Image URL" />
        <input type="text" id="banner-title-input" class="form-control" placeholder="Banner Title" />
      </div>
      <button class="btn btn-primary" id="add-banner-btn">
        <span class="material-icons-round">add</span> ADD BANNER
      </button>
    </div>

    <div id="banners-list">
      ${banners.length === 0
        ? '<div class="empty-state"><span class="material-icons-round">image</span><h4>No banners yet</h4></div>'
        : banners.map(renderBannerRow).join('')
      }
    </div>
  `;

  document.getElementById('add-banner-btn')?.addEventListener('click', async () => {
    const url = document.getElementById('banner-url-input').value.trim();
    const title = document.getElementById('banner-title-input').value.trim();
    if (!url) { showToast('Enter a banner image URL', 'info'); return; }

    try {
      const docRef = await addDoc(collection(window._db, 'banners'), {
        imageUrl: url,
        title: title || '',
        createdAt: serverTimestamp(),
      });
      const newBanner = { id: docRef.id, imageUrl: url, title: title || '' };
      const list = document.getElementById('banners-list');
      if (list) {
        const empty = list.querySelector('.empty-state');
        if (empty) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', renderBannerRow(newBanner));
      }
      document.getElementById('banner-url-input').value = '';
      document.getElementById('banner-title-input').value = '';
      showToast('Banner added!', 'success');
    } catch (err) {
      showToast('Failed to add banner: ' + err.message, 'error');
    }
  });

  document.getElementById('banners-list')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete-banner]');
    if (del) {
      if (!confirm('Delete this banner?')) return;
      const id = del.dataset.deleteBanner;
      await deleteDoc(doc(window._db, 'banners', id));
      document.getElementById(`banner-row-${id}`)?.remove();
      showToast('Banner deleted', 'success');
    }
  });
}

function renderBannerRow(banner) {
  return `
    <div class="admin-product-row" id="banner-row-${banner.id}">
      <img class="admin-product-img" src="${banner.imageUrl}" alt="${banner.title}"
           style="border-radius:var(--radius-md);"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2256%22%3E%3Crect width=%2256%22 height=%2256%22 fill=%22%23B1A7B4%22/%3E%3C/svg%3E'" />
      <div class="admin-product-info">
        <div class="admin-product-name">${banner.title || 'Untitled Banner'}</div>
        <div class="admin-product-meta" style="word-break:break-all;">${banner.imageUrl}</div>
      </div>
      <button class="btn btn-sm btn-danger" data-delete-banner="${banner.id}">
        <span class="material-icons-round" style="font-size:0.9rem;">delete</span>
      </button>
    </div>
  `;
}

function renderAdminHeader() {
  return `
    <header class="site-header">
      <div class="header-top">
        <button class="icon-btn" id="admin-back-btn" aria-label="Go back">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:white;flex:1;text-align:center;">
          Admin Panel
        </div>
        <button class="icon-btn" id="admin-home-btn" aria-label="Home">
          <span class="material-icons-round">home</span>
        </button>
      </div>
    </header>
  `;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#admin-back-btn')) history.back();
  if (e.target.closest('#admin-home-btn')) navigate('home');
}, true);

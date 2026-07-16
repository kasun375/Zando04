// =====================================================
// ZANDO WEB — pages/profile.js
// User profile page
// =====================================================

import { getState, clearCart } from '../js/state.js';
import { signOut } from '../js/auth.js';
import { showToast } from '../js/utils.js';
import { navigate } from '../js/router.js';
import { stopNotifications } from '../js/notifications.js';
import { fetchMyOrders } from '../js/orders.js';

export async function renderProfile(appEl) {
  const { userModel, currentUser } = getState();
  if (!currentUser) { navigate('login'); return; }

  const isAdmin = userModel?.isAdmin || false;

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderProfileHeader()}
      <div class="page-content">
        <div class="main-area">
          <div class="profile-page">
            <div class="profile-avatar-wrap">
              ${currentUser.photoURL
                ? `<img src="${currentUser.photoURL}" alt="Avatar" style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:var(--shadow-primary);" />`
                : `<div class="profile-avatar"><span class="material-icons-round">account_circle</span></div>`
              }
              <h2 class="profile-name">${userModel?.name || currentUser.displayName || 'User'}</h2>
              <p class="profile-email">${userModel?.email || currentUser.email || ''}</p>
              ${isAdmin ? `<span class="badge badge-primary" style="font-size:var(--text-xs);padding:4px 12px;">ADMIN</span>` : ''}
            </div>

            <div class="profile-actions">
              <!-- Order History -->
              <button class="btn btn-primary btn-full btn-lg" id="profile-orders-btn">
                <span class="material-icons-round">history</span>
                Order History
              </button>

              <!-- Notifications -->
              <button class="btn btn-outline btn-full btn-lg" id="profile-notif-btn">
                <span class="material-icons-round">notifications</span>
                Notifications
              </button>

              ${isAdmin ? `
                <!-- Admin Panel -->
                <button class="btn btn-full btn-lg" id="profile-admin-btn"
                        style="background:var(--color-primary);color:white;border-color:var(--color-primary);">
                  <span class="material-icons-round">admin_panel_settings</span>
                  Admin Panel
                </button>
              ` : ''}

              <!-- Sign Out -->
              <button class="btn btn-outline btn-full btn-lg" id="profile-signout-btn"
                      style="border-color:var(--color-error);color:var(--color-error);">
                <span class="material-icons-round">logout</span>
                Sign Out
              </button>
            </div>

            <!-- Stats cards -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);padding:0 var(--space-6);">
              <div style="background:var(--color-surface);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;border:1px solid var(--color-border);">
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-primary);font-family:var(--font-display);">
                  ${Array.isArray(userModel?.wishlist) ? userModel.wishlist.length : 0}
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">Wishlist</div>
              </div>
              <div style="background:var(--color-surface);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;border:1px solid var(--color-border);">
                <div style="font-size:var(--text-2xl);font-weight:800;color:var(--color-primary);font-family:var(--font-display);">
                  ${Object.values(getState().cart).reduce((s, i) => s + i.quantity, 0)}
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">In Cart</div>
              </div>
              <div style="background:var(--color-surface);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;border:1px solid var(--color-border);">
                <div id="profile-orders-count" style="font-size:var(--text-2xl);font-weight:800;color:var(--color-primary);font-family:var(--font-display);">
                  <div class="spinner sm" style="margin:0 auto;"></div>
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">Orders</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fetch actual orders asynchronously to populate stats
  fetchMyOrders().then(orders => {
    const countEl = document.getElementById('profile-orders-count');
    if (countEl) countEl.textContent = orders.length;
  }).catch(err => {
    console.error('Failed to fetch orders for profile stats:', err);
    const countEl = document.getElementById('profile-orders-count');
    if (countEl) countEl.textContent = '—';
  });

  document.getElementById('profile-orders-btn')?.addEventListener('click', () => navigate('orders'));
  document.getElementById('profile-notif-btn')?.addEventListener('click', () => navigate('notifications'));
  document.getElementById('profile-admin-btn')?.addEventListener('click', () => navigate('admin'));

  document.getElementById('profile-signout-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    stopNotifications();
    clearCart();
    await signOut();
    showToast('Signed out successfully', 'success');
    // Auth state change will redirect to home
  });
}

function renderProfileHeader() {
  return `
    <header class="site-header">
      <div class="header-top">
        <button class="icon-btn" id="profile-back-btn" aria-label="Go back">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:white;flex:1;text-align:center;">
          My Profile
        </div>
        <button class="icon-btn" id="profile-cart-btn" aria-label="Cart">
          <span class="material-icons-round">shopping_cart</span>
        </button>
      </div>
    </header>
  `;
}

// Delegated header events
document.addEventListener('click', (e) => {
  if (e.target.closest('#profile-back-btn')) history.back();
  if (e.target.closest('#profile-cart-btn')) navigate('cart');
}, true);

// =====================================================
// ZANDO WEB — pages/profile.js
// User profile page
// =====================================================

import { getState, clearCart } from '../js/state.js';
import { signOut, updateUserProfile } from '../js/auth.js';
import { showToast } from '../js/utils.js';
import { navigate } from '../js/router.js';
import { stopNotifications } from '../js/notifications.js';
import { fetchMyOrders } from '../js/orders.js';
import { renderBottomNav, bindBottomNav } from './home.js';

export async function renderProfile(appEl) {
  const { userModel, currentUser } = getState();
  if (!currentUser) { navigate('login'); return; }

  const isAdmin = userModel?.isAdmin || false;
  const gender = userModel?.gender || '';
  const birthday = userModel?.birthday || '';
  const language = userModel?.language || 'English';
  const addresses = userModel?.savedAddresses || [];

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderProfileHeader()}
      <div class="page-content">
        <div class="main-area">
          <div class="profile-page" style="padding-bottom:5rem;">
            <div class="profile-avatar-wrap">
              ${currentUser.photoURL
                ? `<img src="${currentUser.photoURL}" alt="Avatar" style="width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:var(--shadow-primary);" />`
                : `<div class="profile-avatar"><span class="material-icons-round">account_circle</span></div>`
              }
              <h2 class="profile-name">${userModel?.name || currentUser.displayName || 'User'}</h2>
              <p class="profile-email">${userModel?.email || currentUser.email || ''}</p>
              ${isAdmin ? `<span class="badge badge-primary" style="font-size:var(--text-xs);padding:4px 12px;">ADMIN</span>` : ''}
            </div>

            <!-- Stats cards -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);padding:0 var(--space-6);margin-bottom:1.5rem;">
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

            <!-- PERSONAL DETAILS SECTION -->
            <div style="padding:0 var(--space-6);margin-bottom:1.5rem;">
              <div style="background:var(--color-surface);border-radius:var(--radius-lg);padding:var(--space-5);border:1px solid var(--color-border);">
                <h3 style="font-size:var(--text-sm);font-weight:bold;margin-bottom:1rem;color:var(--color-text-body);letter-spacing:0.5px;">PERSONAL INFORMATION</h3>
                
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label" style="font-size:var(--text-xs);">Gender</label>
                  <select id="profile-gender" class="form-control" style="background:var(--color-surface-2);">
                    <option value="">Select Gender</option>
                    <option value="Male" ${gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${gender === 'Female' ? 'selected' : ''}>Female</option>
                    <option value="Other" ${gender === 'Other' ? 'selected' : ''}>Other</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label" style="font-size:var(--text-xs);">Birthday</label>
                  <input type="date" id="profile-birthday" class="form-control" value="${birthday}" style="background:var(--color-surface-2);" />
                </div>

                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label" style="font-size:var(--text-xs);">Preferred Language</label>
                  <select id="profile-language" class="form-control" style="background:var(--color-surface-2);">
                    <option value="English" ${language === 'English' ? 'selected' : ''}>English</option>
                    <option value="Sinhala" ${language === 'Sinhala' ? 'selected' : ''}>Sinhala</option>
                    <option value="Tamil" ${language === 'Tamil' ? 'selected' : ''}>Tamil</option>
                  </select>
                </div>

                <button class="btn btn-primary btn-full" id="profile-save-btn">
                  <span class="material-icons-round">save</span> Save Profile
                </button>
              </div>
            </div>

            <!-- ADDRESS BOOK SECTION -->
            <div style="padding:0 var(--space-6);margin-bottom:1.5rem;">
              <div style="background:var(--color-surface);border-radius:var(--radius-lg);padding:var(--space-5);border:1px solid var(--color-border);">
                <h3 style="font-size:var(--text-sm);font-weight:bold;margin-bottom:1rem;color:var(--color-text-body);letter-spacing:0.5px;">ADDRESS BOOK</h3>
                
                <!-- Saved Addresses list -->
                <div id="profile-addresses-list" style="margin-bottom:1rem;">
                  ${addresses.length === 0 
                    ? `<p style="font-size:var(--text-xs);color:var(--color-text-muted);text-align:center;padding:1rem 0;">No saved addresses yet.</p>` 
                    : addresses.map((addr, idx) => `
                      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--color-surface-2);border-radius:var(--radius-md);padding:0.75rem 1rem;margin-bottom:0.5rem;border:1px solid var(--color-border);">
                        <div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0;">
                          <span class="material-icons-round" style="color:var(--color-primary);font-size:1.25rem;">location_on</span>
                          <span style="font-size:var(--text-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${addr}</span>
                        </div>
                        <button class="btn btn-ghost" class="delete-address-btn" data-index="${idx}" style="color:var(--color-error);padding:0.25rem;">
                          <span class="material-icons-round" style="font-size:1.1rem;">delete</span>
                        </button>
                      </div>
                    `).join('')
                  }
                </div>

                <!-- Add new address form -->
                <div style="display:flex;gap:0.5rem;">
                  <input type="text" id="new-address-input" class="form-control" placeholder="Add new address..." style="background:var(--color-surface-2);" />
                  <button class="btn btn-primary" id="add-address-btn" style="padding:0 1rem;min-width:auto;">
                    <span class="material-icons-round">add</span>
                  </button>
                </div>
              </div>
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
          </div>
        </div>
      </div>
      ${renderBottomNav('profile')}
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

  // Save profile basic changes
  document.getElementById('profile-save-btn')?.addEventListener('click', async () => {
    const selGender = document.getElementById('profile-gender').value;
    const selBirthday = document.getElementById('profile-birthday').value;
    const selLang = document.getElementById('profile-language').value;

    try {
      await updateUserProfile(currentUser.uid, {
        gender: selGender,
        birthday: selBirthday,
        language: selLang
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update profile', 'error');
    }
  });

  // Add Address Action
  document.getElementById('add-address-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('new-address-input');
    const newAddr = input.value.trim();
    if (!newAddr) return;

    const currentAddresses = [...addresses, newAddr];
    try {
      await updateUserProfile(currentUser.uid, {
        savedAddresses: currentAddresses
      });
      input.value = '';
      showToast('Address added to book!', 'success');
      renderProfile(appEl); // Re-render to show updated address list
    } catch (err) {
      console.error(err);
      showToast('Failed to add address', 'error');
    }
  });

  // Delete Address Action
  appEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-index]');
    if (!btn || btn.id === 'profile-orders-btn' || btn.id === 'profile-notif-btn' || btn.id === 'profile-admin-btn' || btn.id === 'profile-signout-btn') return;
    const index = parseInt(btn.dataset.index, 10);
    if (isNaN(index)) return;

    const updated = [...addresses];
    updated.splice(index, 1);

    try {
      await updateUserProfile(currentUser.uid, {
        savedAddresses: updated
      });
      showToast('Address removed', 'info');
      renderProfile(appEl);
    } catch (err) {
      console.error(err);
      showToast('Failed to remove address', 'error');
    }
  });

  document.getElementById('profile-orders-btn')?.addEventListener('click', () => navigate('orders'));
  document.getElementById('profile-notif-btn')?.addEventListener('click', () => navigate('notifications'));
  document.getElementById('profile-admin-btn')?.addEventListener('click', () => navigate('admin'));
  bindBottomNav();

  document.getElementById('profile-signout-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    stopNotifications();
    clearCart();
    await signOut();
    showToast('Signed out successfully', 'success');
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

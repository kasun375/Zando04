// =====================================================
// ZANDO WEB — js/app.js
// Main application bootstrap
// =====================================================

import { initAuth } from './auth.js';
import { initProducts, loadBanners } from './products.js';
import { initNotifications, stopNotifications } from './notifications.js';
import { getState, setState, subscribe } from './state.js';
import { registerRoute, setBeforeEach, init as initRouter, navigate } from './router.js';
import { showToast } from './utils.js';

const PROTECTED_ROUTES = ['profile', 'orders', 'notifications', 'admin'];

let _appReady = false; // guard against double router init

// ── Page lazy loaders ─────────────────────────────────────────────────────────
const PAGES = {
  home:          () => import('../pages/home.js'),
  login:         () => import('../pages/login.js'),
  register:      () => import('../pages/register.js'),
  product:       () => import('../pages/product-detail.js'),
  cart:          () => import('../pages/cart.js'),
  profile:       () => import('../pages/profile.js'),
  orders:        () => import('../pages/order-history.js'),
  notifications: () => import('../pages/notifications.js'),
  admin:         () => import('../pages/admin.js'),
  categories:    () => import('../pages/categories.js'),
};

async function loadPage(name) {
  try {
    return PAGES[name] ? await PAGES[name]() : null;
  } catch (e) {
    console.error(`Failed to load page "${name}":`, e);
    showToast('Failed to load page. Please refresh.', 'error');
    return null;
  }
}

// ── App Root ──────────────────────────────────────────────────────────────────
export async function bootstrapApp() {
  const appEl = document.getElementById('app');
  const splash = document.getElementById('splash-screen');

  // ── Helper: hide splash and show app ──────────────────────────────────────
  function showApp() {
    if (splash) {
      splash.style.transition = 'opacity 0.35s ease';
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 350);
    }
    appEl.style.display = 'block';
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  setBeforeEach(async (route) => {
    const { currentUser } = getState();
    if (PROTECTED_ROUTES.includes(route) && !currentUser) {
      setState({ redirectAfterLogin: route });
      navigate('login');
      return false;
    }
    return true;
  });


  // ── Register routes ───────────────────────────────────────────────────────
  registerRoute('home', async () => {
    const mod = await loadPage('home');
    mod?.renderHome(appEl);
    updateCartBadge();
  });

  registerRoute('login', async () => {
    const { currentUser } = getState();
    if (currentUser) { navigate('home'); return; }
    const mod = await loadPage('login');
    mod?.renderLogin(appEl);
  });

  registerRoute('register', async () => {
    const { currentUser } = getState();
    if (currentUser) { navigate('home'); return; }
    const mod = await loadPage('register');
    mod?.renderRegister(appEl);
  });

  registerRoute('product', async () => {
    const mod = await loadPage('product');
    mod?.renderProductDetail(appEl);
  });

  registerRoute('cart', async () => {
    const mod = await loadPage('cart');
    mod?.renderCart(appEl);
  });

  registerRoute('profile', async () => {
    const mod = await loadPage('profile');
    mod?.renderProfile(appEl);
  });

  registerRoute('categories', async () => {
    const mod = await loadPage('categories');
    mod?.renderCategories(appEl);
  });

  registerRoute('orders', async () => {
    const mod = await loadPage('orders');
    await mod?.renderOrderHistory(appEl);
  });

  registerRoute('order-history', async () => {
    const mod = await loadPage('orders');
    await mod?.renderOrderHistory(appEl);
  });

  registerRoute('notifications', async () => {
    const mod = await loadPage('notifications');
    mod?.renderNotifications(appEl);
  });

  registerRoute('admin', async () => {
    const mod = await loadPage('admin');
    await mod?.renderAdmin(appEl);
  });

  registerRoute('404', () => {
    appEl.innerHTML = `
      <div class="app-layout">
        <div class="empty-state" style="min-height:100vh;">
          <span class="material-icons-round" style="font-size:5rem;">sentiment_dissatisfied</span>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist.</p>
          <button class="btn btn-primary" id="err-home-btn">GO HOME</button>
        </div>
      </div>
    `;
    document.getElementById('err-home-btn')?.addEventListener('click', () => navigate('home'));
  });

  // Helper to start products/banners listeners
  function initDataFetching() {
    initProducts(() => {
      // Refresh home page grid if it's currently visible
      const grid = document.getElementById('products-grid');
      if (!grid) return;

      // Lightweight in-place refresh — re-use home.js renderProductCard logic
      import('../pages/home.js').then(mod => {
        if (typeof mod._refreshGrid === 'function') mod._refreshGrid();
      }).catch(() => {});
    });

    loadBanners().catch(() => {});
  }

  // Initial load
  initDataFetching();

  // ── Auth state listener ────────────────────────────────────────────────────
  // initAuth wraps onAuthStateChanged which fires once immediately
  // We wait for the first auth determination before showing the app
  await new Promise((resolve) => {
    initAuth(
      // onSignedIn
      async (user, userModel) => {
        // Start notification listener
        initNotifications(user.uid);

        // Register FCM token for push notifications (lazy import to avoid crashing app on load)
        import('./fcm.js').then(({ initFCM }) => {
          initFCM(window._firebaseApp, user).catch((e) =>
            console.warn('[FCM] init failed:', e)
          );
        }).catch((e) => console.warn('[FCM] module load failed:', e));

        // Re-trigger data fetching with correct authenticated user context
        initDataFetching();

        if (!_appReady) {
          _appReady = true;
          showApp();
          initRouter();
          resolve();
        } else {
          // User signed in on an already-loaded page — re-render current route
          const hash = window.location.hash.slice(1) || 'home';
          if (hash === 'login' || hash === 'register') {
            const { redirectAfterLogin } = getState();
            if (redirectAfterLogin) {
              setState({ redirectAfterLogin: null });
              navigate(redirectAfterLogin);
            } else {
              navigate('home');
            }
          } else {
            initRouter();
          }
        }
      },
      // onSignedOut
      () => {
        stopNotifications();
        import('./fcm.js').then(({ resetFCM }) => resetFCM()).catch(() => {});

        // Re-trigger data fetching as guest
        initDataFetching();

        if (!_appReady) {
          _appReady = true;
          showApp();
          initRouter();
          resolve();
        } else {
          const hash = window.location.hash.slice(1) || '';
          if (PROTECTED_ROUTES.includes(hash)) navigate('home');
          else initRouter();
        }
      }
    );

    // Safety timeout — if Firebase auth takes > 3 seconds, show app anyway
    setTimeout(() => {
      if (!_appReady) {
        _appReady = true;
        showApp();
        initRouter();
        resolve();
      }
    }, 3000);
  });

  // ── Cart State Listener ────────────────────────────────────────────────────
  subscribe('cart', () => {
    updateCartBadge();
    const hash = window.location.hash.slice(1) || 'home';
    if (hash === 'cart') {
      const appEl = document.getElementById('app');
      import('../pages/cart.js').then(mod => {
        mod.renderCart(appEl);
      }).catch(() => {});
    }
  });

  // ── Notifications State Listener ───────────────────────────────────────────
  subscribe('notificationUnreadCount', (unreadCount) => {
    document.querySelectorAll('#notification-btn .btn-badge').forEach(b => {
      b.textContent = unreadCount;
      b.style.display = unreadCount > 0 ? 'flex' : 'none';
    });
  });

  subscribe('notifications', () => {
    const hash = window.location.hash.slice(1) || 'home';
    if (hash === 'notifications') {
      const appEl = document.getElementById('app');
      import('../pages/notifications.js').then(mod => {
        mod.renderNotifications(appEl);
      }).catch(() => {});
    }
  });
}

// ── Cart badge helper (used by route handlers) ──────────────────────────────
function updateCartBadge() {
  import('./state.js').then(({ getCartCount }) => {
    const count = getCartCount();
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  });
}

// Make navigate available globally for inline usage
window.navigate = navigate;

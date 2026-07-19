// =====================================================
// ZANDO WEB — pages/categories.js
// Categories list page view
// =====================================================

import { getState } from '../js/state.js';
import { setCategory } from '../js/products.js';
import { navigate } from '../js/router.js';
import { renderBottomNav, bindBottomNav } from './home.js';
import { renderFooter } from '../js/utils.js';

export function renderCategories(appEl) {
  const { shops, categories } = getState();
  const allCategories = [...new Set([...categories, ...shops])];

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderCategoriesHeader()}
      <div class="page-content">
        <div class="page-content-inner">
          <main class="main-area" style="padding: 0; width: 100%;">
            <div class="categories-list">
              ${allCategories.map(c => `
                <div class="category-row-item" data-category="${c}">
                  <span class="category-row-name">${c}</span>
                  <span class="category-row-arrow">&raquo;&raquo;</span>
                </div>
              `).join('')}
            </div>
          </main>
        </div>
      </div>
      ${renderFooter()}
      ${renderBottomNav('categories')}
    </div>
  `;

  // Bind categories click
  appEl.querySelectorAll('.category-row-item').forEach(item => {
    item.addEventListener('click', () => {
      const cat = item.dataset.category;
      setCategory(cat);
      navigate('home');
    });
  });

  bindHeader();
  bindBottomNav();
}

function renderCategoriesHeader() {
  return `
    <header class="site-header">
      <div class="header-top">
        <div class="header-logo" id="home-logo-btn">
          <img src="assets/images/zando_logo.png" alt="ZANDO" class="header-logo-img" style="height: 44px; max-width: 100%; object-fit: contain;" />
        </div>

        <div class="header-search" id="header-search-wrap">
          <div class="header-search-inner">
            <input
              type="text"
              id="header-search-input"
              class="header-search-input"
              placeholder="SEARCH PRODUCTS..."
              autocomplete="off"
            />
            <button class="header-search-btn" id="search-btn" aria-label="Search" style="background: #FFFF00 !important;">
              <span class="material-icons-round" style="color: black !important;">search</span>
            </button>
          </div>
        </div>

        <div class="header-actions">
          <button class="icon-btn" id="notification-btn" aria-label="Notifications">
            <span class="material-icons-round">notifications</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function bindHeader() {
  // Logo → home
  document.getElementById('home-logo-btn')?.addEventListener('click', () => {
    navigate('home');
  });

  // Notifications
  document.getElementById('notification-btn')?.addEventListener('click', () => navigate('notifications'));

  // Search
  document.getElementById('search-btn')?.addEventListener('click', () => {
    const q = document.getElementById('header-search-input')?.value.trim() || '';
    import('../js/products.js').then(({ setSearchQuery }) => {
      setSearchQuery(q);
      navigate('home');
    });
  });
}

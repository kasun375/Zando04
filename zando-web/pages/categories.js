// =====================================================
// ZANDO WEB — pages/categories.js
// Categories Screen — lists all categories (mobile app style)
// =====================================================

import { getState } from '../js/state.js';
import { setCategory } from '../js/products.js';
import { navigate } from '../js/router.js';

export function renderCategories(appEl) {
  const { categories, shops } = getState();
  const allCategories = [...new Set([...categories, ...shops])].filter(c => c !== 'All' && c !== '');

  appEl.innerHTML = `
    <div class="app-layout">
      <!-- Mobile Categories Header -->
      <header class="mobile-categories-header" style="background: var(--color-primary); color: white; padding: 1.25rem 1.5rem;">
        <h2 style="font-family: var(--font-display); font-weight: 800; font-size: 1.5rem; margin: 0; letter-spacing: 0.05em;">Categories</h2>
      </header>

      <div class="page-content" style="background: white; min-height: calc(100vh - 120px);">
        <div class="categories-list-container">
          ${allCategories.map(cat => `
            <div class="category-list-item" data-cat="${cat}" style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; cursor: pointer; border-bottom: 1px solid #f3f3f3; transition: background 0.2s;">
              <span style="font-size: 1.1rem; color: #4a4a4a; font-weight: 500;">${cat}</span>
              <span class="material-icons-round" style="color: #4FA5D6; font-size: 1.5rem;">keyboard_double_arrow_right</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Bind clicks to category list items
  appEl.querySelectorAll('.category-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const catName = item.dataset.cat;
      setCategory(catName);
      navigate('home');
    });
  });
}

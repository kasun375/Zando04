// =====================================================
// ZANDO WEB — pages/about.js
// About Us page
// =====================================================

import { renderFooter } from '../js/utils.js';
import { navigate } from '../js/router.js';

export function renderAbout(appEl) {
  appEl.innerHTML = `
    <div class="app-layout">
      ${renderHeader()}
      <div class="page-content" style="min-height: calc(100vh - 120px); padding-top: 2rem;">
        <div class="main-area" style="max-width: 800px; margin: 0 auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.05);">
          <h1 style="font-family: var(--font-display); font-size: 2.5rem; color: #2E062B; margin-bottom: 1.5rem; text-align: center;">About Zando</h1>
          <div style="font-size: 1.1rem; line-height: 1.8; color: #4A4A4A;">
            <p style="margin-bottom: 1rem;">
              Welcome to Zando, your ultimate destination for everything you need! We are an innovative e-commerce platform dedicated to providing our customers with a seamless, enjoyable, and secure shopping experience.
            </p>
            <p style="margin-bottom: 1rem;">
              Founded with the vision to bridge the gap between quality products and everyday consumers, Zando offers an extensive selection of items ranging from the latest fashion trends and cutting-edge electronics to everyday groceries and home essentials.
            </p>
            <p style="margin-bottom: 1rem;">
              Our mission is simple: to deliver exceptional value, unmatched variety, and outstanding customer service. We work closely with top brands and trusted suppliers to ensure that every product you find on Zando meets our high standards of quality.
            </p>
            <p style="margin-bottom: 1rem;">
              Thank you for choosing Zando. We are thrilled to have you as part of our community and look forward to serving all your shopping needs!
            </p>
          </div>
        </div>
      </div>
      ${renderFooter()}
    </div>
  `;

  // Bind navigation
  document.getElementById('home-logo-btn')?.addEventListener('click', () => navigate('home'));
  document.getElementById('nav-about')?.addEventListener('click', () => navigate('about'));
  document.getElementById('nav-privacy')?.addEventListener('click', () => navigate('privacy'));
  document.getElementById('nav-contact')?.addEventListener('click', () => navigate('contact'));
}

function renderHeader() {
  return `
    <header class="site-header" style="background: #2E062B; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <div class="header-logo" id="home-logo-btn" style="cursor: pointer;">
        <img src="assets/images/zando_logo.png" alt="ZANDO" style="height: 44px;" />
      </div>
      <nav class="desktop-nav" style="display: flex; gap: 2rem;">
        <a id="nav-about" style="color: #fff; text-decoration: none; font-weight: 600; cursor: pointer; transition: color 0.3s;" onmouseover="this.style.color='#FFFF00'" onmouseout="this.style.color='#fff'">About Us</a>
        <a id="nav-privacy" style="color: #fff; text-decoration: none; font-weight: 600; cursor: pointer; transition: color 0.3s;" onmouseover="this.style.color='#FFFF00'" onmouseout="this.style.color='#fff'">Privacy Policy</a>
        <a id="nav-contact" style="color: #fff; text-decoration: none; font-weight: 600; cursor: pointer; transition: color 0.3s;" onmouseover="this.style.color='#FFFF00'" onmouseout="this.style.color='#fff'">Contact Us</a>
      </nav>
      <div style="width: 44px;"></div> <!-- Spacer -->
    </header>
  `;
}

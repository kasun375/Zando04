// =====================================================
// ZANDO WEB — pages/privacy.js
// Privacy Policy page
// =====================================================

import { renderFooter } from '../js/utils.js';
import { navigate } from '../js/router.js';

export function renderPrivacy(appEl) {
  appEl.innerHTML = `
    <div class="app-layout">
      ${renderHeader()}
      <div class="page-content" style="min-height: calc(100vh - 120px); padding-top: 2rem;">
        <div class="main-area" style="max-width: 800px; margin: 0 auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.05);">
          <h1 style="font-family: var(--font-display); font-size: 2.5rem; color: #2E062B; margin-bottom: 1.5rem; text-align: center;">Privacy Policy</h1>
          <div style="font-size: 1.1rem; line-height: 1.8; color: #4A4A4A;">
            <p style="margin-bottom: 1rem;">
              Last updated: <strong>Today</strong>
            </p>
            <p style="margin-bottom: 1rem;">
              At Zando, we value your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, use, and safeguard your information when you visit our website and use our services.
            </p>
            <h3 style="color: #2E062B; margin-top: 2rem; margin-bottom: 1rem;">1. Information We Collect</h3>
            <p style="margin-bottom: 1rem;">
              We may collect personal information such as your name, email address, phone number, shipping address, and payment details when you create an account, place an order, or interact with our platform.
            </p>
            <h3 style="color: #2E062B; margin-top: 2rem; margin-bottom: 1rem;">2. How We Use Your Information</h3>
            <p style="margin-bottom: 1rem;">
              Your information is used to process your orders, communicate with you regarding your purchases, provide customer support, and improve our website's functionality and user experience. We may also send you promotional emails, which you can opt out of at any time.
            </p>
            <h3 style="color: #2E062B; margin-top: 2rem; margin-bottom: 1rem;">3. Data Security</h3>
            <p style="margin-bottom: 1rem;">
              We implement a variety of security measures to maintain the safety of your personal information. Our platform uses encryption technology and secure servers to protect your data from unauthorized access.
            </p>
            <h3 style="color: #2E062B; margin-top: 2rem; margin-bottom: 1rem;">4. Contact Us</h3>
            <p style="margin-bottom: 1rem;">
              If you have any questions or concerns about this Privacy Policy, please contact us through our Contact Us page.
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

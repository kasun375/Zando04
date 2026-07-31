// =====================================================
// ZANDO WEB — pages/contact.js
// Contact Us page
// =====================================================

import { renderFooter, showToast } from '../js/utils.js';
import { navigate } from '../js/router.js';

export function renderContact(appEl) {
  appEl.innerHTML = `
    <div class="app-layout">
      ${renderHeader()}
      <div class="page-content" style="min-height: calc(100vh - 120px); padding-top: 2rem;">
        <div class="main-area" style="max-width: 800px; margin: 0 auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.05);">
          <h1 style="font-family: var(--font-display); font-size: 2.5rem; color: #2E062B; margin-bottom: 0.5rem; text-align: center;">Contact Us</h1>
          <p style="text-align: center; color: #6E6E6E; font-size: 1.1rem; margin-bottom: 2rem;">We'd love to hear from you. Please fill out the form below.</p>
          
          <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
            <div style="background: #F9F9F9; padding: 1.5rem; border-radius: 8px;">
              <h3 style="color: #2E062B; margin-bottom: 1rem;">Get in Touch</h3>
              <p style="margin-bottom: 0.5rem;"><strong>Email:</strong> kasunjayaweera80@gmail.com</p>
              <p style="margin-bottom: 0.5rem;"><strong>Phone:</strong> +94760891262</p>
              <p style="margin-bottom: 1rem;"><strong>Address:</strong> Zando Stores, No 49, Paniyandoowa Rd, Ambalangoda</p>
              <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <!-- Social Icons Placeholder -->
                <span class="material-icons-round" style="color: #2E062B; cursor: pointer;">facebook</span>
                <span class="material-icons-round" style="color: #2E062B; cursor: pointer;">share</span>
              </div>
            </div>

            <form id="contact-form" style="display: flex; flex-direction: column; gap: 1rem;">
              <div>
                <label style="display: block; font-weight: 500; margin-bottom: 0.5rem; color: #333;">Name</label>
                <input type="text" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; outline: none; transition: border-color 0.3s;" onfocus="this.style.borderColor='#2E062B'" onblur="this.style.borderColor='#ccc'" />
              </div>
              <div>
                <label style="display: block; font-weight: 500; margin-bottom: 0.5rem; color: #333;">Email</label>
                <input type="email" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; outline: none; transition: border-color 0.3s;" onfocus="this.style.borderColor='#2E062B'" onblur="this.style.borderColor='#ccc'" />
              </div>
              <div>
                <label style="display: block; font-weight: 500; margin-bottom: 0.5rem; color: #333;">Message</label>
                <textarea rows="5" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; outline: none; resize: vertical; transition: border-color 0.3s;" onfocus="this.style.borderColor='#2E062B'" onblur="this.style.borderColor='#ccc'"></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="padding: 0.75rem; font-size: 1.1rem; border-radius: 6px; margin-top: 0.5rem; background: #2E062B; color: #FFFF00; border: none; font-weight: 700; cursor: pointer;">Send Message</button>
            </form>
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

  // Bind form
  document.getElementById('contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Your message has been sent successfully!', 'success');
    e.target.reset();
  });
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

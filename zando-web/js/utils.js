// =====================================================
// ZANDO WEB — js/utils.js
// Shared utility functions
// =====================================================

// Show a toast notification
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = { success: 'check_circle', error: 'error', info: 'info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="material-icons-round">${iconMap[type] || 'info'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Format currency
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date
export function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format relative time
export function formatRelativeTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date);
  const now = new Date();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

// Generate star HTML
export function renderStars(rating, count) {
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < Math.round(rating) ? 'filled' : ''}">★</span>`
  ).join('');
  return `<div class="star-rating">${stars}</div><span class="text-muted text-xs">(${count})</span>`;
}

// Capitalize first letter
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Truncate text
export function truncate(str, maxLen = 50) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}

// Debounce
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Convert Google Drive or similar links to direct image
export function convertToDirectLink(url) {
  if (!url) return '';
  
  // Try to match lh3.googleusercontent.com/d/ or lh3.googleusercontent.com/u/0/d/
  const lhMatch = url.match(/lh3\.googleusercontent\.com\/(?:u\/\d+\/)?d\/([^/?#&]+)/);
  if (lhMatch) return `https://lh3.googleusercontent.com/d/${lhMatch[1]}`;

  // Try to match file/d/ format
  const driveMatch1 = url.match(/drive\.google\.com\/file\/d\/([^/?#&]+)/);
  if (driveMatch1) return `https://lh3.googleusercontent.com/d/${driveMatch1[1]}`;
  
  // Try to match uc?id= or open?id= format
  const driveMatch2 = url.match(/drive\.google\.com\/(?:uc|open|thumbnail)\?.*id=([^&?#]+)/);
  if (driveMatch2) return `https://lh3.googleusercontent.com/d/${driveMatch2[1]}`;
  
  return url;
}

// Create element helper
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'class') element.className = val;
    else if (key === 'html') element.innerHTML = val;
    else if (key === 'text') element.textContent = val;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2), val);
    else element.setAttribute(key, val);
  });
  children.forEach(child => {
    if (child instanceof Node) element.appendChild(child);
    else if (child) element.appendChild(document.createTextNode(child));
  });
  return element;
}

// Show spinner in container
export function showSpinner(container, size = '') {
  container.innerHTML = `<div class="loading-overlay"><div class="spinner ${size}"></div></div>`;
}

// Image error fallback
export function imgFallback(imgEl) {
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23B1A7B4"/%3E%3Ctext x="50" y="55" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.7)" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
  };
}

// Render site footer HTML string matching provided mockup image
export function renderFooter() {
  return `
    <footer class="site-footer" style="background: #545454; color: #ffffff; padding: 2.2rem 3rem 1.5rem 3rem; width: 100%; font-family: 'Inter', system-ui, -apple-system, sans-serif; box-sizing: border-box;">
      <div style="width: 100%; max-width: 100%; margin: 0 auto;">
        
        <!-- Top WhatsApp Header -->
        <div style="text-align: center; margin-bottom: 1.8rem;">
          <h2 style="color: #ffffff; font-size: 1.5rem; font-weight: 700; margin: 0 0 0.35rem 0; letter-spacing: 0.05em; text-transform: uppercase;">ODER ON WHATSAPP</h2>
          <p style="color: #ffffff; font-size: 0.9rem; margin: 0; font-weight: 400;">Tell us what you need - we'll find it,price it, and deliver it.Open 24/7</p>
        </div>

        <!-- Main Top Row: Left About | Center Buttons | Right Badges & QR -->
        <div class="footer-top-grid" style="display: grid; grid-template-columns: 1.2fr 1fr 1.2fr; gap: 2.5rem; align-items: center; margin-bottom: 2.2rem; width: 100%;">
          
          <!-- Left: About Text & Yellow Links -->
          <div style="font-size: 0.9rem; line-height: 1.5;">
            <p style="margin: 0 0 0.8rem 0; color: #ffffff; font-weight: 400;">
              Zando is your ultimate online shopping destination. Discover premium fashion, electronics, lifestyle products and more with fast delivery and easy returns.
            </p>
            <div style="color: #dce319; font-weight: 600; font-size: 0.9rem;">
              <a href="#contact" onclick="window.navigate && window.navigate('contact')" style="color: #dce319; text-decoration: none;">Contact Us</a>
              <span style="color: #ffffff; margin: 0 0.4rem;">|</span>
              <a href="#about" onclick="window.navigate && window.navigate('about')" style="color: #dce319; text-decoration: none;">About Us</a>
              <span style="color: #ffffff; margin: 0 0.4rem;">|</span>
              <a href="#privacy" onclick="window.navigate && window.navigate('privacy')" style="color: #dce319; text-decoration: none;">Privacy Policy</a>
            </div>
          </div>

          <!-- Center: White Button & Phone Box -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
            <!-- White WhatsApp Button -->
            <a href="https://wa.me/94760891262" target="_blank" rel="noopener noreferrer"
               style="background: #ffffff; color: #000000; padding: 0.5rem 1.4rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 0.88rem; text-decoration: none; text-transform: uppercase; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
              <img src="assets/images/logo-whatsapp-png-46068.png" alt="WhatsApp" style="height: 24px; width: auto; object-fit: contain;" />
              <span>ODER ON WHATSAPP</span>
            </a>

            <!-- Grey Phone Box -->
            <div style="background: #6c6c6c; color: #ffffff; padding: 0.55rem 1.4rem; border-radius: 6px; font-size: 0.82rem; font-weight: 500; text-align: center; width: max-content;">
              To Oder by phone, call - 076 089 12 62
            </div>
          </div>

          <!-- Right: App Store Badges & QR Code -->
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 1rem;">
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" style="display: block;">
                <img src="assets/images/pngegg.png" alt="Get it on Google Play & App Store" style="height: 80px; width: auto; object-fit: contain;" />
              </a>
            </div>
            <div>
              <img src="assets/images/qr-code.png" alt="ZANDO QR Code" style="height: 80px; width: 80px; object-fit: contain; border-radius: 4px; background: #ffffff; padding: 2px;" />
            </div>
          </div>

        </div>

        <!-- Links Columns Grid: Quick Links | Customer Care | Contact Us -->
        <div class="footer-links-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3rem; align-items: start; margin-top: 1.8rem; width: 100%;">
          
          <!-- Col 1: Quick Links -->
          <div>
            <h4 style="color: #dce319; font-size: 1rem; font-weight: 700; margin: 0 0 0.6rem 0;">Quick Links</h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.88rem; color: #ffffff;">
              <li><a href="#home" onclick="window.navigate && window.navigate('home')" style="color: #ffffff; text-decoration: none;">Home</a></li>
              <li><a href="#categories" onclick="window.navigate && window.navigate('categories')" style="color: #ffffff; text-decoration: none;">Categories</a></li>
              <li><a href="#cart" onclick="window.navigate && window.navigate('cart')" style="color: #ffffff; text-decoration: none;">Shopping Cart</a></li>
              <li><a href="#profile" onclick="window.navigate && window.navigate('profile')" style="color: #ffffff; text-decoration: none;">My Profile</a></li>
            </ul>
          </div>

          <!-- Col 2: Customer Care -->
          <div>
            <h4 style="color: #dce319; font-size: 1rem; font-weight: 700; margin: 0 0 0.6rem 0;">Customer Care</h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.88rem; color: #ffffff;">
              <li><a href="#orders" onclick="window.navigate && window.navigate('orders')" style="color: #ffffff; text-decoration: none;">Track Orders</a></li>
              <li><a href="#contact" onclick="window.navigate && window.navigate('contact')" style="color: #ffffff; text-decoration: none;">Help &amp; Support</a></li>
              <li><a href="#contact" onclick="window.navigate && window.navigate('contact')" style="color: #ffffff; text-decoration: none;">Returns &amp; Refunds</a></li>
              <li><a href="#contact" onclick="window.navigate && window.navigate('contact')" style="color: #ffffff; text-decoration: none;">FAQ</a></li>
            </ul>
          </div>

          <!-- Col 3: Contact Us -->
          <div>
            <h4 style="color: #dce319; font-size: 1rem; font-weight: 700; margin: 0 0 0.6rem 0;">Contact Us</h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.88rem; color: #ffffff;">
              <li>Email Us</li>
              <li>076081262</li>
              <li style="line-height: 1.4;">Zando Stores,No 49,<br />Paniyandoowa Rd,<br />Ambalangoda.</li>
            </ul>
          </div>

        </div>

        <!-- Copyright Bar -->
        <div style="margin-top: 2.2rem; text-align: center; color: #ffffff; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 1rem;">
          &copy; 2026 ZANDO. All rights reserved.
        </div>

      </div>
    </footer>

    <style>
      @media (max-width: 900px) {
        .footer-top-grid {
          grid-template-columns: 1fr !important;
          text-align: center !important;
        }
        .footer-top-grid > div {
          justify-content: center !important;
        }
        .footer-links-grid {
          grid-template-columns: 1fr 1fr !important;
        }
      }
      @media (max-width: 600px) {
        .footer-links-grid {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;
}


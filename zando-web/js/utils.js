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
  return `$${Number(amount).toFixed(2)}`;
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

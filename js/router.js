// =====================================================
// ZANDO WEB — js/router.js
// Simple hash-based SPA router
// =====================================================

const _routes = {};
let _beforeEach = null;
let _initialized = false;

export function registerRoute(path, handler) {
  _routes[path] = handler;
}

export function setBeforeEach(fn) {
  _beforeEach = fn;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getParams() {
  return window._routeParams || {};
}

export function init() {
  if (!_initialized) {
    window.addEventListener('hashchange', handleRoute);
    _initialized = true;
  }
  handleRoute();
}

async function handleRoute() {
  let hash = window.location.hash.slice(1) || 'home';

  // Strip query string
  const qIdx = hash.indexOf('?');
  if (qIdx >= 0) hash = hash.slice(0, qIdx);

  // Auth guard
  if (_beforeEach) {
    let proceed;
    try {
      proceed = await _beforeEach(hash);
    } catch (e) {
      console.error('Router guard error:', e);
      proceed = true;
    }
    if (!proceed) return;
  }

  // Find handler — support parameterized routes like 'product/123'
  let handler = _routes[hash];
  if (!handler) {
    const base = hash.split('/')[0];
    handler = _routes[base];
  }

  if (handler) {
    try {
      await handler(hash);
    } catch (e) {
      console.error('Route handler error:', e);
      if (_routes['404']) _routes['404'](hash);
    }
  } else if (_routes['404']) {
    _routes['404'](hash);
  }
}

export function getCurrentRoute() {
  return window.location.hash.slice(1) || 'home';
}

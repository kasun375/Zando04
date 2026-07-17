// =====================================================
// ZANDO WEB — js/state.js
// Global reactive state manager
// =====================================================

const _listeners = {};

const state = {
  currentUser: null,
  userModel: null,
  products: [],
  filteredProducts: [],
  categories: [],
  shops: [],
  cart: {},           // { productId: { id, name, price, imageUrl, quantity } }
  wishlist: [],
  orders: [],
  allOrders: [],      // admin
  notifications: [],
  banners: [],
  searchQuery: '',
  selectedCategory: '',
  currentRoute: 'home',
  currentProduct: null,
  isLoading: false,
  notificationUnreadCount: 0,
};

export function getState() { return state; }

export function setState(updates) {
  Object.assign(state, updates);
  Object.keys(updates).forEach(key => {
    if (_listeners[key]) {
      _listeners[key].forEach(fn => fn(state[key], state));
    }
  });
  if (_listeners['*']) {
    _listeners['*'].forEach(fn => fn(state));
  }
}

export function subscribe(key, fn) {
  if (!_listeners[key]) _listeners[key] = [];
  _listeners[key].push(fn);
  return () => {
    _listeners[key] = _listeners[key].filter(l => l !== fn);
  };
}

export function subscribeAll(fn) {
  return subscribe('*', fn);
}

// Cart helpers
export function getCartCount() {
  return Object.values(state.cart).reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(selectedIds = null) {
  return Object.values(state.cart).reduce((sum, item) => {
    if (!selectedIds || selectedIds.includes(item.id)) {
      return sum + item.price * item.quantity;
    }
    return sum;
  }, 0);
}

export function addToCart(product) {
  const existing = state.cart[product.id];
  const updatedCart = {
    ...state.cart,
    [product.id]: existing
      ? { ...existing, quantity: existing.quantity + 1 }
      : { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: 1 }
  };
  setState({ cart: updatedCart });
}

export function removeFromCart(productId) {
  const updatedCart = { ...state.cart };
  delete updatedCart[productId];
  setState({ cart: updatedCart });
}

export function updateCartQty(productId, delta) {
  const item = state.cart[productId];
  if (!item) return;
  if (item.quantity + delta <= 0) {
    removeFromCart(productId);
    return;
  }
  const updatedCart = {
    ...state.cart,
    [productId]: { ...item, quantity: item.quantity + delta }
  };
  setState({ cart: updatedCart });
}

export function clearCart() {
  setState({ cart: {} });
}

export function removeCartItems(ids) {
  const updatedCart = { ...state.cart };
  ids.forEach(id => delete updatedCart[id]);
  setState({ cart: updatedCart });
}

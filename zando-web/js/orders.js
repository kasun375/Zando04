// =====================================================
// ZANDO WEB — js/orders.js
// Firestore orders — place & fetch
// =====================================================

import {
  collection, addDoc, getDocs, updateDoc, doc, query,
  where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { setState, getState } from './state.js';

// Place an order
export async function placeOrder({ items, totalAmount, shippingAddress, mobileNumber, paymentMethod }) {
  const { currentUser } = getState();
  if (!currentUser) throw new Error('Must be signed in to place an order');

  const orderData = {
    userId: currentUser.uid,
    items,
    totalAmount,
    status: 'pending',
    createdAt: serverTimestamp(),
    shippingAddress,
    mobileNumber,
    paymentMethod,
  };

  const docRef = await addDoc(collection(window._db, 'orders'), orderData);
  return docRef.id;
}

// Fetch user's orders
export async function fetchMyOrders() {
  const { currentUser } = getState();
  if (!currentUser) return [];

  const q = query(
    collection(window._db, 'orders'),
    where('userId', '==', currentUser.uid)
  );
  const snap = await getDocs(q);
  const orders = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  setState({ orders });
  return orders;
}

// Fetch ALL orders (admin)
export async function fetchAllOrders() {
  const q = query(collection(window._db, 'orders'));
  const snap = await getDocs(q);
  const allOrders = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  setState({ allOrders });
  return allOrders;
}

// Update order status (admin)
export async function updateOrderStatus(orderId, newStatus) {
  await updateDoc(doc(window._db, 'orders', orderId), { status: newStatus });
  // Update local state
  const { allOrders } = getState();
  const updated = allOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
  setState({ allOrders: updated });
}

// Status color helper
export function getStatusColor(status) {
  const map = {
    pending: '#FF9500',
    processing: '#007AFF',
    shipped: '#5856D6',
    delivered: '#28A745',
    cancelled: '#DC3545',
  };
  return map[status] || '#888';
}

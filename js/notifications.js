// =====================================================
// ZANDO WEB — js/notifications.js
// Firestore notifications module
// =====================================================

import {
  collection, query, where,
  onSnapshot, updateDoc, doc, writeBatch, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { setState, getState } from './state.js';

let _unsubscribe = null;

// Initialize notification listener for current user
export function initNotifications(uid, onChange) {
  if (_unsubscribe) _unsubscribe();
  if (!uid) return;

  const q = query(
    collection(window._db, 'users', uid, 'notifications')
  );

  _unsubscribe = onSnapshot(q, (snap) => {
    const notifications = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const unreadCount = notifications.filter(n => !n.isRead).length;
    setState({ notifications, notificationUnreadCount: unreadCount });
    if (onChange) onChange(notifications, unreadCount);
  }, (err) => {
    console.error('Notifications listener error:', err);
  });
}

// Stop listener
export function stopNotifications() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  setState({ notifications: [], notificationUnreadCount: 0 });
}

// Mark a single notification as read
export async function markAsRead(notificationId) {
  const { currentUser } = getState();
  if (!currentUser) return;
  await updateDoc(doc(window._db, 'users', currentUser.uid, 'notifications', notificationId), { isRead: true });
}

// Mark all as read
export async function markAllAsRead() {
  const { notifications, currentUser } = getState();
  if (!currentUser) return;
  const unread = notifications.filter(n => !n.isRead);
  if (!unread.length) return;

  const batch = writeBatch(window._db);
  unread.forEach(n => {
    batch.update(doc(window._db, 'users', currentUser.uid, 'notifications', n.id), { isRead: true });
  });
  await batch.commit();
}

// Delete a single notification
export async function deleteNotification(notificationId) {
  const { currentUser } = getState();
  if (!currentUser) return;
  await deleteDoc(doc(window._db, 'users', currentUser.uid, 'notifications', notificationId));
}

// Clear all notifications
export async function clearAllNotifications() {
  const { notifications, currentUser } = getState();
  if (!currentUser || !notifications.length) return;

  const batch = writeBatch(window._db);
  notifications.forEach(n => {
    batch.delete(doc(window._db, 'users', currentUser.uid, 'notifications', n.id));
  });
  await batch.commit();
}

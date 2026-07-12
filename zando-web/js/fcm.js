// =====================================================
// ZANDO WEB — js/fcm.js
// Firebase Cloud Messaging — Web Integration
//
// Responsibilities:
//  1. Register the firebase-messaging-sw.js service worker
//  2. Request Notification permission from the browser
//  3. Retrieve the FCM registration token using your VAPID key
//  4. Save the token to Firestore: users/{uid}/fcmTokens/{token}
//  5. Handle foreground (in-app) messages as toast banners
//
// ⚠️  SETUP REQUIRED:
//     Replace 'YOUR_VAPID_KEY_HERE' below with the Web Push certificate
//     key pair generated in:
//     Firebase Console → Project Settings → Cloud Messaging →
//     Web configuration → "Generate key pair"
// =====================================================

import {
  getMessaging,
  getToken,
  onMessage,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

import {
  doc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  Replace this with your actual VAPID key from the Firebase Console
// ─────────────────────────────────────────────────────────────────────────────
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

let _messaging = null;
let _initialized = false;

/**
 * Initialise FCM for the current web session.
 * Call this after the user has signed in (pass the Firebase User object).
 *
 * @param {import('firebase/app').FirebaseApp} firebaseApp
 * @param {import('firebase/auth').User} user   - signed-in Firebase user
 */
export async function initFCM(firebaseApp, user) {
  if (_initialized) return;

  // Service Workers + Notification API are required
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[FCM] Notifications not supported in this browser.');
    return;
  }

  if (VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
    console.warn(
      '[FCM] VAPID key is not set. ' +
      'Open zando-web/js/fcm.js and replace YOUR_VAPID_KEY_HERE ' +
      'with the key from Firebase Console → Project Settings → Cloud Messaging.'
    );
    return;
  }

  try {
    // 1. Register service worker
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM] Service worker registered:', swReg.scope);

    // 2. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied by user.');
      return;
    }

    // 3. Get FCM token
    _messaging = getMessaging(firebaseApp);
    const token = await getToken(_messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn('[FCM] No registration token obtained. Check VAPID key and browser support.');
      return;
    }

    console.log('[FCM] Registration token:', token);

    // 4. Save token to Firestore → users/{uid}/fcmTokens/{token}
    const db = window._db;
    if (db && user?.uid) {
      const tokenRef = doc(db, `users/${user.uid}/fcmTokens/${token}`);
      await setDoc(tokenRef, {
        token,
        platform: 'web',
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log('[FCM] Token saved to Firestore for user:', user.uid);
    }

    // 5. Handle foreground messages (tab is open and focused)
    onMessage(_messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      _showForegroundNotification(payload);
    });

    _initialized = true;

  } catch (err) {
    console.error('[FCM] Initialisation error:', err);
  }
}

/**
 * Reset the FCM initialisation flag (call on sign-out so the next sign-in
 * re-registers the token for potentially a different user).
 */
export function resetFCM() {
  _initialized = false;
}

// ── Foreground Notification Banner ────────────────────────────────────────────
/**
 * Shows a rich in-app toast banner for foreground FCM messages.
 * Falls back to showToast if the import is unavailable.
 */
function _showForegroundNotification(payload) {
  const title = payload.notification?.title || payload.data?.title || 'ZANDO';
  const body  = payload.notification?.body  || payload.data?.body  || '';

  // Try to use the app's own toast system for a consistent look
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast toast-info fcm-toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="fcm-toast-icon">
      <span class="material-icons-round">notifications</span>
    </div>
    <div class="fcm-toast-content">
      <strong class="fcm-toast-title">${_escape(title)}</strong>
      <p class="fcm-toast-body">${_escape(body)}</p>
    </div>
    <button class="fcm-toast-close" aria-label="Dismiss">
      <span class="material-icons-round">close</span>
    </button>
  `;

  // Dismiss on close button
  toast.querySelector('.fcm-toast-close').addEventListener('click', () => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }
  }, 6000);
}

function _escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =====================================================
// ZANDO WEB — Firebase Messaging Service Worker
// Handles background push notifications.
// Must be served from the ROOT of the web app (not in /js/).
// =====================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCAMt4rLwtm5htZhPZnWdT-bjyzGxnstPM',
  authDomain:        'zando-b574e.firebaseapp.com',
  projectId:         'zando-b574e',
  storageBucket:     'zando-b574e.appspot.com',
  messagingSenderId: '20423532374',
  appId:             '1:20423532374:web:213ad3f80bc841a9d880f7',
  measurementId:     'G-SM7F64PL0V',
});

const messaging = firebase.messaging();

// ── Background Messages ───────────────────────────────────────────────────────
// Fires when the browser tab is closed or in the background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title   = payload.notification?.title || payload.data?.title || 'ZANDO';
  const options = {
    body:  payload.notification?.body || payload.data?.body || '',
    icon:  '/assets/images/app_icon.png',
    badge: '/assets/images/app_icon.png',
    data:  payload.data || {},
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(title, options);
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

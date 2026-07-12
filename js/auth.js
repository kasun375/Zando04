// =====================================================
// ZANDO WEB — js/auth.js
// Firebase Authentication module
// =====================================================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { setState, getState } from './state.js';
import { showToast } from './utils.js';

const googleProvider = new GoogleAuthProvider();

// Initialize auth state listener
export function initAuth(onSignedIn, onSignedOut) {
  onAuthStateChanged(window._auth, async (user) => {
    if (user) {
      const userModel = await fetchUserModel(user.uid);
      setState({ currentUser: user, userModel });
      onSignedIn(user, userModel);
    } else {
      setState({ currentUser: null, userModel: null });
      onSignedOut();
    }
  });
}

// Fetch user model from Firestore
export async function fetchUserModel(uid) {
  try {
    const docRef = doc(window._db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { uid, ...snap.data() };
    }
    return null;
  } catch (e) {
    console.error('fetchUserModel error:', e);
    return null;
  }
}

// Sign in with email/password
export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(window._auth, email, password);
  return cred.user;
}

// Register with email/password
export async function signUp(email, password, name) {
  const cred = await createUserWithEmailAndPassword(window._auth, email, password);
  const user = cred.user;
  // Create user document in Firestore
  await setDoc(doc(window._db, 'users', user.uid), {
    uid: user.uid,
    name,
    email,
    isAdmin: false,
    wishlist: [],
    createdAt: serverTimestamp(),
  });
  return user;
}

// Sign in with Google
export async function signInWithGoogle() {
  const result = await signInWithPopup(window._auth, googleProvider);
  const user = result.user;
  // Create user doc if new
  const docRef = doc(window._db, 'users', user.uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, {
      uid: user.uid,
      name: user.displayName || 'User',
      email: user.email,
      isAdmin: false,
      wishlist: [],
      createdAt: serverTimestamp(),
    });
  }
  return user;
}

// Sign out
export async function signOut() {
  await fbSignOut(window._auth);
}

// Toggle wishlist
export async function toggleWishlist(productId) {
  const { userModel } = getState();
  if (!userModel) { showToast('Please sign in to save items', 'info'); return; }
  const wishlist = [...(userModel.wishlist || [])];
  const idx = wishlist.indexOf(productId);
  if (idx >= 0) wishlist.splice(idx, 1);
  else wishlist.push(productId);
  await setDoc(doc(window._db, 'users', userModel.uid), { wishlist }, { merge: true });
  setState({ userModel: { ...userModel, wishlist } });
  return wishlist;
}

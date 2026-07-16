// =====================================================
// ZANDO WEB — pages/login.js
// Login page renderer
// =====================================================

import { signIn, signInWithGoogle } from '../js/auth.js';
import { showToast } from '../js/utils.js';
import { navigate } from '../js/router.js';

export function renderLogin(appEl) {
  appEl.innerHTML = `
    <div class="auth-page" id="login-page">
      <div class="auth-card">
        <div class="auth-logo">ZANDO</div>
        <p class="auth-subtitle">Welcome back, please sign in</p>

        <form class="auth-form" id="login-form" novalidate>
          <div class="form-group">
            <div class="form-control-wrapper">
              <span class="material-icons-round input-icon">email</span>
              <input
                type="email"
                id="login-email"
                class="form-control form-control-dark has-icon"
                placeholder="Email address"
                autocomplete="email"
                required
              />
            </div>
            <span class="form-error" id="login-email-err"></span>
          </div>

          <div class="form-group">
            <div class="form-control-wrapper">
              <span class="material-icons-round input-icon">lock</span>
              <input
                type="password"
                id="login-password"
                class="form-control form-control-dark has-icon"
                placeholder="Password"
                autocomplete="current-password"
                required
              />
            </div>
            <span class="form-error" id="login-password-err"></span>
          </div>

          <button type="submit" id="login-submit" class="btn btn-accent btn-full btn-lg">
            SIGN IN
          </button>
        </form>

        <div class="divider-text">OR</div>

        <button id="login-google" class="btn btn-full btn-lg" style="background:white;color:#000;gap:10px;border-radius:30px;">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.57-.14-3.08-.4-4.54H24v8.59h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.21z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>
          SIGN IN WITH GOOGLE
        </button>

        <p class="auth-link-text">
          Don't have an account? <a id="go-register">Register</a>
        </p>
      </div>
    </div>
  `;

  // Form submission
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !email.includes('@')) {
      setError('login-email-err', 'Enter a valid email');
      return;
    }
    if (!password || password.length < 6) {
      setError('login-password-err', 'Password too short');
      return;
    }

    const btn = document.getElementById('login-submit');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner sm white"></div>';

    try {
      await signIn(email, password);
      // Auth state change will redirect
    } catch (err) {
      showToast(friendlyAuthError(err.code), 'error');
      btn.disabled = false;
      btn.innerHTML = 'SIGN IN';
    }
  });

  // Google sign-in
  document.getElementById('login-google').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast('Google Sign-In failed. ' + err.message, 'error');
    }
  });

  // Navigate to register
  document.getElementById('go-register').addEventListener('click', () => {
    navigate('register');
  });
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors() {
  ['login-email-err', 'login-password-err'].forEach(id => setError(id, ''));
}

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Sign in failed. Please try again.';
}

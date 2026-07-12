// =====================================================
// ZANDO WEB — pages/register.js
// Registration page renderer
// =====================================================

import { signUp, signInWithGoogle } from '../js/auth.js';
import { showToast } from '../js/utils.js';
import { navigate } from '../js/router.js';

export function renderRegister(appEl) {
  appEl.innerHTML = `
    <div class="auth-page" id="register-page">
      <div class="auth-card">
        <div class="auth-logo">ZANDO</div>
        <p class="auth-subtitle">Create an account to start shopping</p>

        <form class="auth-form" id="register-form" novalidate>
          <div class="form-group">
            <div class="form-control-wrapper">
              <span class="material-icons-round input-icon">person</span>
              <input
                type="text"
                id="reg-name"
                class="form-control form-control-dark has-icon"
                placeholder="Full Name"
                autocomplete="name"
                required
              />
            </div>
            <span class="form-error" id="reg-name-err"></span>
          </div>

          <div class="form-group">
            <div class="form-control-wrapper">
              <span class="material-icons-round input-icon">email</span>
              <input
                type="email"
                id="reg-email"
                class="form-control form-control-dark has-icon"
                placeholder="Email address"
                autocomplete="email"
                required
              />
            </div>
            <span class="form-error" id="reg-email-err"></span>
          </div>

          <div class="form-group">
            <div class="form-control-wrapper">
              <span class="material-icons-round input-icon">lock</span>
              <input
                type="password"
                id="reg-password"
                class="form-control form-control-dark has-icon"
                placeholder="Password (min 6 characters)"
                autocomplete="new-password"
                required
              />
            </div>
            <span class="form-error" id="reg-password-err"></span>
          </div>

          <button type="submit" id="reg-submit" class="btn btn-accent btn-full btn-lg">
            SIGN UP
          </button>
        </form>

        <div class="divider-text">OR</div>

        <button id="reg-google" class="btn btn-full btn-lg" style="background:white;color:#000;gap:10px;border-radius:30px;">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.12 24.5c0-1.57-.14-3.08-.4-4.54H24v8.59h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.21z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>
          SIGN UP WITH GOOGLE
        </button>

        <p class="auth-link-text">
          Already have an account? <a id="go-login">Sign In</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    let valid = true;
    if (!name) { setError('reg-name-err', 'Enter your name'); valid = false; }
    if (!email || !email.includes('@')) { setError('reg-email-err', 'Enter a valid email'); valid = false; }
    if (!password || password.length < 6) { setError('reg-password-err', 'Password must be at least 6 characters'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('reg-submit');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner sm white"></div>';

    try {
      await signUp(email, password, name);
      showToast('Account created! Welcome to Zando!', 'success');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
      btn.disabled = false;
      btn.innerHTML = 'SIGN UP';
    }
  });

  document.getElementById('reg-google').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast('Google Sign-Up failed: ' + err.message, 'error');
    }
  });

  document.getElementById('go-login').addEventListener('click', () => {
    navigate('login');
  });
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors() {
  ['reg-name-err', 'reg-email-err', 'reg-password-err'].forEach(id => setError(id, ''));
}

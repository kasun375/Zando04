// =====================================================
// ZANDO WEB — pages/checkout.js
// Consolidated Checkout modal containing address and Stripe payment element
// =====================================================

import { getState, clearCart, removeCartItems } from '../js/state.js';
import { placeOrder } from '../js/orders.js';
import { showToast, formatCurrency } from '../js/utils.js';
import { navigate } from '../js/router.js';

let _checkoutItems = null;
let _checkoutTotal = 0;
let _checkoutItemIds = null;

// Helper to load Stripe JS dynamically if not already present
function ensureStripeLoaded() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      if (window.Stripe) resolve(window.Stripe);
      else reject(new Error('Stripe failed to load'));
    };
    script.onerror = () => reject(new Error('Failed to load Stripe script'));
    document.head.appendChild(script);
  });
}

// Main entry point — renders consolidated modal bottom sheet
export function renderCheckoutModal(items, total, checkoutItemIds = null) {
  _checkoutItems = items;
  _checkoutTotal = total;
  _checkoutItemIds = checkoutItemIds;

  // Remove existing
  document.getElementById('checkout-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay bottom-sheet';
  overlay.id = 'checkout-modal-overlay';
  overlay.innerHTML = `

    <div class="modal-box" id="checkout-modal-box" style="max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <span class="modal-title">CHECKOUT</span>
        <div class="modal-close" id="checkout-close">
          <span class="material-icons-round">close</span>
        </div>
      </div>
      <hr class="divider" />

      <!-- Section 1: Delivery Address -->
      <div class="form-group" style="margin-bottom:1.25rem;">
        <label class="form-label">Delivery Address</label>
        <div class="form-control-wrapper">
          <span class="material-icons-round input-icon">local_shipping</span>
          <textarea id="checkout-address" class="form-control has-icon" rows="2"
            placeholder="Enter shipping address..." style="resize:none;padding-top:0.75rem;"></textarea>
        </div>
        <span class="form-error" id="addr-err"></span>
      </div>

      <!-- Section 2: Interactive Card Form -->
      <div class="form-group" style="margin-bottom:1.25rem;">
        <label class="form-label">Payment Method</label>
        <div class="payment-methods" id="checkout-payment-methods">
          <div class="payment-method-btn active" data-method="Credit Card">
            <span class="material-icons-round">credit_card</span>
            <span>Card</span>
          </div>
          <div class="payment-method-btn" data-method="PayPal">
            <span class="material-icons-round">account_balance_wallet</span>
            <span>PayPal</span>
          </div>
          <div class="payment-method-btn" data-method="Google Pay">
            <span class="material-icons-round">payment</span>
            <span>Google Pay</span>
          </div>
          <div class="payment-method-btn" data-method="Cash on Delivery">
            <span class="material-icons-round">handshake</span>
            <span>Cash on Delivery</span>
          </div>
        </div>
      </div>

      <div id="payment-details-container" style="margin-bottom:1.25rem;">
        <!-- Card details (Stripe Elements) -->
        <div class="payment-form-section" id="pay-form-card">
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:var(--text-xs);margin-bottom:0.25rem;">Cardholder Name</label>
            <input type="text" id="card-holder" class="form-control" placeholder="John Doe" />
            <span class="form-error" id="card-holder-err" style="color:var(--color-error);font-size:0.75rem;"></span>
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:var(--text-xs);margin-bottom:0.25rem;">Card Details</label>
            <div id="card-element" style="background:var(--color-surface); padding:0.75rem 1rem; border-radius:var(--radius-md); border:1.5px solid var(--color-border);"></div>
            <span class="form-error" id="card-element-err" style="color:var(--color-error);font-size:0.75rem;margin-top:0.25rem;display:block;"></span>
          </div>
        </div>

        <!-- PayPal details -->
        <div class="payment-form-section" id="pay-form-paypal" style="display:none;">
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:var(--text-xs);margin-bottom:0.25rem;">PayPal Email</label>
            <input type="email" id="paypal-email" class="form-control" placeholder="paypal@example.com" />
            <span class="form-error" id="paypal-email-err" style="color:var(--color-error);font-size:0.75rem;"></span>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:var(--text-xs);margin-bottom:0.25rem;">Password</label>
            <input type="password" id="paypal-password" class="form-control" placeholder="••••••••" />
            <span class="form-error" id="paypal-password-err" style="color:var(--color-error);font-size:0.75rem;"></span>
          </div>
        </div>

        <!-- Google Pay details -->
        <div class="payment-form-section" id="pay-form-gpay" style="display:none;">
          <div style="background:var(--color-surface-2);padding:1rem;border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-text-body);display:flex;align-items:center;gap:0.75rem;">
            <span class="material-icons-round" style="color:var(--color-primary);">payment</span>
            <span>Pay securely with Google Pay.</span>
          </div>
        </div>

        <!-- Cash on Delivery details -->
        <div class="payment-form-section" id="pay-form-cod" style="display:none;">
          <div style="background:var(--color-surface-2);padding:1rem;border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-text-body);display:flex;align-items:center;gap:0.75rem;">
            <span class="material-icons-round" style="color:var(--color-primary);">handshake</span>
            <span>Pay with cash when your package arrives.</span>
          </div>
        </div>
      </div>


      <!-- Section 3: Total Summary -->
      <div class="checkout-summary" style="margin-top:1rem;">
        <div class="checkout-summary-row">
          <span>Subtotal</span><span>${formatCurrency(_checkoutTotal)}</span>
        </div>
        <div class="checkout-summary-row">
          <span>Delivery</span><span style="color:var(--color-success);">FREE</span>
        </div>
        <div class="checkout-summary-row total">
          <span>Total Amount</span><span>${formatCurrency(_checkoutTotal)}</span>
        </div>
      </div>

      <!-- Section 4: Pay Button -->
      <button class="btn btn-primary btn-full btn-lg" id="checkout-pay-btn" style="margin-top:1rem;">
        PLACE ORDER (${formatCurrency(_checkoutTotal)})
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Initialize Stripe and mount Card Element securely
  let stripe = null;
  let cardElement = null;
  ensureStripeLoaded().then((StripeLib) => {
    stripe = StripeLib('pk_live_51Ted5APDNJFdc8fiVuKPhOpSNZblzFGXW9FSUEUiOdC5YWgplyJ23EHagAyJqN2GOn3HXl4uMeYXsGhDLOWYFizC00hUBu6tBU');
    const elements = stripe.elements();
    cardElement = elements.create('card', {
      style: {
        base: {
          color: '#333333',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '16px',
          '::placeholder': {
            color: '#888888',
          },
        },
        invalid: {
          color: '#ff6b6b',
          iconColor: '#ff6b6b',
        },
      },
    });
    cardElement.mount('#card-element');
    cardElement.on('change', (event) => {
      const displayError = document.getElementById('card-element-err');
      if (event.error) {
        displayError.textContent = event.error.message;
      } else {
        displayError.textContent = '';
      }
    });
  }).catch((err) => {
    console.error('Stripe initialization failed:', err);
    const displayError = document.getElementById('card-element-err');
    if (displayError) {
      displayError.textContent = 'Failed to load secure payment fields. Please refresh the page.';
    }
  });

  // Variables
  let _isPaying = false;
  let _selectedMethod = 'Credit Card';
  const addrInput = document.getElementById('checkout-address');

  addrInput.addEventListener('input', () => {
    document.getElementById('addr-err').textContent = '';
  });

  // Toggle payment methods
  const methodBtns = document.querySelectorAll('#checkout-payment-methods .payment-method-btn');
  methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      methodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedMethod = btn.dataset.method;

      // Hide all forms
      document.getElementById('pay-form-card').style.display = 'none';
      document.getElementById('pay-form-paypal').style.display = 'none';
      document.getElementById('pay-form-gpay').style.display = 'none';
      document.getElementById('pay-form-cod').style.display = 'none';

      // Show selected form
      if (_selectedMethod === 'Credit Card') {
        document.getElementById('pay-form-card').style.display = 'block';
      } else if (_selectedMethod === 'PayPal') {
        document.getElementById('pay-form-paypal').style.display = 'block';
      } else if (_selectedMethod === 'Google Pay') {
        document.getElementById('pay-form-gpay').style.display = 'flex';
      } else if (_selectedMethod === 'Cash on Delivery') {
        document.getElementById('pay-form-cod').style.display = 'flex';
      }
    });
  });

  // Card input formatting & event cleaning listeners
  const cardHolderInput = document.getElementById('card-holder');
  if (cardHolderInput) {
    cardHolderInput.addEventListener('input', () => {
      document.getElementById('card-holder-err').textContent = '';
    });
  }

  const paypalEmailInput = document.getElementById('paypal-email');
  if (paypalEmailInput) {
    paypalEmailInput.addEventListener('input', () => {
      document.getElementById('paypal-email-err').textContent = '';
    });
  }

  const paypalPwdInput = document.getElementById('paypal-password');
  if (paypalPwdInput) {
    paypalPwdInput.addEventListener('input', () => {
      document.getElementById('paypal-password-err').textContent = '';
    });
  }

  // Close handlers
  const closePopup = () => overlay.remove();
  document.getElementById('checkout-close').addEventListener('click', closePopup);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });

  // ── Checkout Pay Action ──
  document.getElementById('checkout-pay-btn').addEventListener('click', async () => {
    // Clear error texts
    document.getElementById('addr-err').textContent = '';
    if (document.getElementById('card-holder-err')) document.getElementById('card-holder-err').textContent = '';
    if (document.getElementById('card-element-err')) document.getElementById('card-element-err').textContent = '';
    if (document.getElementById('paypal-email-err')) document.getElementById('paypal-email-err').textContent = '';
    if (document.getElementById('paypal-password-err')) document.getElementById('paypal-password-err').textContent = '';

    const addr = addrInput.value.trim();

    if (!addr) {
      document.getElementById('addr-err').textContent = 'Enter shipping address';
      return;
    }

    // Validate payment details based on selected method
    if (_selectedMethod === 'Credit Card') {
      const holder = document.getElementById('card-holder').value.trim();
      if (!holder) {
        document.getElementById('card-holder-err').textContent = 'Enter cardholder name';
        return;
      }
    } else if (_selectedMethod === 'PayPal') {
      const email = document.getElementById('paypal-email').value.trim();
      const pwd = document.getElementById('paypal-password').value.trim();

      let hasErr = false;
      if (!email || !email.includes('@')) {
        document.getElementById('paypal-email-err').textContent = 'Enter valid PayPal email';
        hasErr = true;
      }
      if (!pwd) {
        document.getElementById('paypal-password-err').textContent = 'Enter password';
        hasErr = true;
      }
      if (hasErr) return;
    }

    if (_isPaying) return;
    _isPaying = true;

    const payBtn = document.getElementById('checkout-pay-btn');
    payBtn.disabled = true;
    payBtn.innerHTML = '<div class="spinner sm white"></div> Placing Order...';

    try {
      let methodDisplay = _selectedMethod;
      if (_selectedMethod === 'Credit Card') {
        if (!stripe || !cardElement) {
          showToast('Secure payment fields are loading. Please try again in a moment.', 'error');
          _isPaying = false;
          payBtn.disabled = false;
          payBtn.textContent = `PLACE ORDER (${formatCurrency(_checkoutTotal)})`;
          return;
        }
        const cardHolder = document.getElementById('card-holder').value.trim();

        // Tokenize card securely using Stripe JS SDK (no raw card data leaves the user browser)
        const { paymentMethod, error } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: cardHolder,
          },
        });

        if (error) {
          document.getElementById('card-element-err').textContent = error.message;
          _isPaying = false;
          payBtn.disabled = false;
          payBtn.textContent = `PLACE ORDER (${formatCurrency(_checkoutTotal)})`;
          return;
        }

        methodDisplay = `Credit Card (**** ${paymentMethod.card.last4})`;

        await processStripePayment(_checkoutTotal, paymentMethod.id);
      }

      // Finalize order locally as chosen payment method
      await finalizeOrder(addr, methodDisplay);
      closePopup();
      showSuccessDialog();
    } catch (err) {
      console.error('Checkout Error:', err);
      _isPaying = false;
      payBtn.disabled = false;
      payBtn.textContent = `PLACE ORDER (${formatCurrency(_checkoutTotal)})`;
      showToast(err.message || 'Failed to place order', 'error');
    }
  });
}

async function finalizeOrder(address, paymentMethod) {
  await placeOrder({
    items: _checkoutItems,
    totalAmount: _checkoutTotal,
    shippingAddress: address,
    paymentMethod,
  });

  // Clear cart
  if (_checkoutItemIds) removeCartItems(_checkoutItemIds);
  else if (!_checkoutItemIds && _checkoutItems) {
    // buy now — don't clear whole cart
  } else clearCart();
}

function showSuccessDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '700';
  overlay.innerHTML = `
    <div class="modal-box" style="text-align:center;max-width:360px;padding:2.5rem;background:#ffffff;border-radius:24px;">
      <span class="material-icons-round" style="font-size:5rem;color:var(--color-success);display:block;margin-bottom:1rem;">check_circle</span>
      <h2 style="margin-bottom:0.5rem;font-family:var(--font-display);font-weight:bold;">Order Placed!</h2>
      <p style="color:var(--color-text-muted);margin-bottom:2rem;font-size:0.9rem;">
        Your order has been placed successfully. Thank you for shopping with ZANDO!
      </p>
      <button class="btn btn-primary btn-full" id="success-view-orders">VIEW MY ORDERS</button>
      <button class="btn btn-ghost btn-full" id="success-continue" style="margin-top:0.75rem;">CONTINUE SHOPPING</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('success-view-orders').addEventListener('click', () => { overlay.remove(); navigate('orders'); });
  document.getElementById('success-continue').addEventListener('click', () => { overlay.remove(); navigate('home'); });
}

/**
 * Processes payment by calling the Firebase Cloud Function first (for production),
 * with a fallback to the standalone local Node.js payment server (for local development).
 */
async function processStripePayment(amount, paymentMethodId) {
  const amountCents = Math.round(amount * 100);
  let success = false;
  let firebaseError = null;

  // 1. Try Firebase Cloud Function (if initialized)
  if (window._functions) {
    try {
      const { httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js');
      const createPaymentIntentFn = httpsCallable(window._functions, 'createPaymentIntent');
      const result = await createPaymentIntentFn({
        amount: amountCents,
        currency: 'usd',
        paymentMethodId: paymentMethodId,
      });

      if (result.data && result.data.success) {
        success = true;
      } else {
        throw new Error(result.data?.error || 'Payment failed via Cloud Function');
      }
    } catch (err) {
      firebaseError = err;
      console.warn('Firebase Cloud Function payment failed, falling back to local server:', err);
    }
  }

  // 2. Fallback to Local Payment Server
  if (!success) {
    const host = window.location.hostname || 'localhost';
    try {
      const res = await fetch(`http://${host}:4242/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountCents,
          currency: 'usd',
          paymentMethodId: paymentMethodId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed. Please try again.');
      }

      const { status } = data;
      if (status !== 'succeeded' && status !== 'requires_capture') {
        throw new Error(`Payment not authorised (status: ${status}). Please try again.`);
      }
      success = true;
    } catch (err) {
      console.error('Local payment server failed:', err);
      if (firebaseError) {
        throw new Error(
          `Payment failed.\n\n` +
          `Firebase error: ${firebaseError.message}\n\n` +
          `Local server error: ${err.message}`
        );
      } else {
        throw new Error('Payment failed. Local payment server is unreachable.');
      }
    }
  }
}

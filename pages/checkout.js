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

  const { userModel } = getState();
  const addresses = userModel?.savedAddresses || [];

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

      <!-- Section 0.5: Saved Addresses Dropdown -->
      ${addresses.length > 0 ? `
        <div class="form-group" style="margin-bottom:1rem;">
          <label class="form-label">Use Saved Address</label>
          <div class="form-control-wrapper">
            <span class="material-icons-round input-icon">bookmark</span>
            <select id="checkout-saved-address" class="form-control has-icon" style="background:var(--color-surface-2);appearance:none;padding-top:0px;padding-bottom:0px;height:45px;">
              <option value="">-- Select Saved Address --</option>
              ${addresses.map(addr => `<option value="${addr}">${addr}</option>`).join('')}
            </select>
          </div>
        </div>
      ` : ''}

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

      <!-- Section 1.2: Deliver as Gift Toggle -->
      <div style="background:var(--color-surface-2);border-radius:var(--radius-md);padding:1rem;margin-bottom:1.25rem;border:1px solid var(--color-border);">
        <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer;font-weight:bold;font-size:var(--text-sm);">
          <input type="checkbox" id="checkout-is-gift" style="width:18px;height:18px;accent-color:var(--color-primary);" />
          <span>🎁 Deliver as a Gift</span>
        </label>
        
        <div id="gift-options-fields" style="display:none;margin-top:1rem;border-top:1px solid var(--color-border);padding-top:1rem;">
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:var(--text-xs);">Recipient Name</label>
            <input type="text" id="gift-recipient-name" class="form-control" placeholder="Recipient's name" />
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:var(--text-xs);">Recipient Phone Number</label>
            <input type="tel" id="gift-recipient-phone" class="form-control" placeholder="Recipient's phone" />
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:var(--text-xs);">Gift Message / Card Note</label>
            <textarea id="gift-message" class="form-control" rows="2" placeholder="Write your message here..." style="resize:none;"></textarea>
          </div>
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;margin-top:0.75rem;font-size:var(--text-xs);color:var(--color-text-body);">
            <input type="checkbox" id="checkout-gift-wrap" style="width:16px;height:16px;accent-color:var(--color-primary);" />
            <span>Add Gift Wrapping (+$5.00)</span>
          </label>
        </div>
      </div>

      <!-- Section 1.5: Mobile Number -->
      <div class="form-group" style="margin-bottom:1.25rem;">
        <label class="form-label">Sender Mobile Number</label>
        <div class="form-control-wrapper">
          <span class="material-icons-round input-icon">phone</span>
          <input type="tel" id="checkout-phone" class="form-control has-icon"
            placeholder="Enter mobile number..." />
        </div>
        <span class="form-error" id="phone-err"></span>
      </div>

      <!-- Section 2: Interactive Card Form -->
      <div class="form-group" style="margin-bottom:1.25rem;">
        <label class="form-label">Payment Method</label>
        <div class="payment-methods" id="checkout-payment-methods">
          <div class="payment-method-btn active" data-method="Credit Card">
            <span class="material-icons-round">credit_card</span>
            <span>Card</span>
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
        <div class="checkout-summary-row" id="gift-wrap-summary-row" style="display:none;">
          <span>Gift Wrapping</span><span>$5.00</span>
        </div>
        <div class="checkout-summary-row">
          <span>Delivery</span><span style="color:var(--color-success);">FREE</span>
        </div>
        <div class="checkout-summary-row total">
          <span>Total Amount</span><span id="checkout-total-display">${formatCurrency(_checkoutTotal)}</span>
        </div>
      </div>

      <!-- Section 4: Pay Button -->
      <button class="btn btn-primary btn-full btn-lg" id="checkout-pay-btn" style="margin-top:1rem; margin-bottom:1.5rem;">
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

  // Saved Address Handler
  const savedAddrSelect = document.getElementById('checkout-saved-address');
  if (savedAddrSelect) {
    savedAddrSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        addrInput.value = e.target.value;
        document.getElementById('addr-err').textContent = '';
      }
    });
  }

  // Gift Toggle Handler
  const isGiftCheckbox = document.getElementById('checkout-is-gift');
  const giftFields = document.getElementById('gift-options-fields');
  const giftWrapCheckbox = document.getElementById('checkout-gift-wrap');
  
  isGiftCheckbox?.addEventListener('change', (e) => {
    giftFields.style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) {
      if (giftWrapCheckbox) giftWrapCheckbox.checked = false;
      document.getElementById('gift-wrap-summary-row').style.display = 'none';
      updateCheckoutTotalDisplay();
    }
  });

  giftWrapCheckbox?.addEventListener('change', (e) => {
    document.getElementById('gift-wrap-summary-row').style.display = e.target.checked ? 'flex' : 'none';
    updateCheckoutTotalDisplay();
  });

  function updateCheckoutTotalDisplay() {
    let currentTotal = _checkoutTotal;
    if (isGiftCheckbox?.checked && giftWrapCheckbox?.checked) {
      currentTotal += 5.00;
    }
    const formatted = formatCurrency(currentTotal);
    const totalDisp = document.getElementById('checkout-total-display');
    if (totalDisp) totalDisp.textContent = formatted;
    const payBtn = document.getElementById('checkout-pay-btn');
    if (payBtn && !_isPaying) payBtn.textContent = `PLACE ORDER (${formatted})`;
  }

  // Toggle payment methods
  const methodBtns = document.querySelectorAll('#checkout-payment-methods .payment-method-btn');
  methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      methodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedMethod = btn.dataset.method;

      // Hide all forms
      document.getElementById('pay-form-card').style.display = 'none';
      document.getElementById('pay-form-cod').style.display = 'none';

      // Show selected form
      if (_selectedMethod === 'Credit Card') {
        document.getElementById('pay-form-card').style.display = 'block';
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

  const phoneInput = document.getElementById('checkout-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      document.getElementById('phone-err').textContent = '';
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
    document.getElementById('phone-err').textContent = '';
    if (document.getElementById('card-holder-err')) document.getElementById('card-holder-err').textContent = '';
    if (document.getElementById('card-element-err')) document.getElementById('card-element-err').textContent = '';

    const addr = addrInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';

    let validationFailed = false;
    if (!addr) {
      document.getElementById('addr-err').textContent = 'Enter shipping address';
      validationFailed = true;
    }
    if (!phone) {
      document.getElementById('phone-err').textContent = 'Enter mobile number';
      validationFailed = true;
    }
    if (validationFailed) return;

    // Validate payment details based on selected method
    if (_selectedMethod === 'Credit Card') {
      const holder = document.getElementById('card-holder').value.trim();
      if (!holder) {
        document.getElementById('card-holder-err').textContent = 'Enter cardholder name';
        return;
      }
    }

    if (_isPaying) return;
    _isPaying = true;

    const isGift = isGiftCheckbox ? isGiftCheckbox.checked : false;
    const giftWrap = (isGift && giftWrapCheckbox) ? giftWrapCheckbox.checked : false;
    const recipientName = isGift ? document.getElementById('gift-recipient-name').value.trim() : '';
    const recipientPhone = isGift ? document.getElementById('gift-recipient-phone').value.trim() : '';
    const giftMessage = isGift ? document.getElementById('gift-message').value.trim() : '';
    const finalTotal = isGift && giftWrap ? _checkoutTotal + 5.00 : _checkoutTotal;

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
          payBtn.textContent = `PLACE ORDER (${formatCurrency(finalTotal)})`;
          return;
        }
        const cardHolder = document.getElementById('card-holder').value.trim();

        // 1. Create a real Stripe PaymentIntent on backend using Stripe secret key
        const intentRes = await fetch('/create-payment-sheet-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(finalTotal * 100),
            currency: 'usd',
          }),
        });

        if (!intentRes.ok) {
          const errData = await intentRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to initialize secure payment session with Stripe.');
        }

        const intentData = await intentRes.json();
        if (!intentData.clientSecret) {
          throw new Error(intentData.error || 'Invalid payment session response from server.');
        }

        // 2. Confirm card payment directly with Stripe SDK (handles 3DS, SCA, and charges card)
        const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
          intentData.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: cardHolder,
                phone: phone,
              },
            },
          }
        );

        if (confirmError) {
          document.getElementById('card-element-err').textContent = confirmError.message;
          throw new Error(confirmError.message);
        }

        if (!paymentIntent || (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture')) {
          throw new Error(`Payment could not be completed (status: ${paymentIntent ? paymentIntent.status : 'unknown'}).`);
        }

        const last4 = paymentIntent.payment_method?.card?.last4 || 'Card';
        methodDisplay = `Credit Card (**** ${last4})`;
      }

      // Finalize order locally as chosen payment method
      await finalizeOrder(addr, methodDisplay, phone, isGift, recipientName, recipientPhone, giftMessage, giftWrap, finalTotal);
      closePopup();
      showSuccessDialog();
    } catch (err) {
      console.error('Checkout Error:', err);
      _isPaying = false;
      payBtn.disabled = false;
      payBtn.textContent = `PLACE ORDER (${formatCurrency(finalTotal)})`;
      showToast(err.message || 'Failed to place order', 'error');
    }
  });
}

async function finalizeOrder(address, paymentMethod, mobileNumber, isGift, recipientName, recipientPhone, giftMessage, giftWrap, finalTotal) {
  const estDate = new Date();
  estDate.setDate(estDate.getDate() + 3);
  const estimatedDelivery = estDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  await placeOrder({
    items: _checkoutItems,
    totalAmount: finalTotal,
    shippingAddress: address,
    mobileNumber,
    paymentMethod,
    isGift,
    recipientName,
    recipientPhone,
    giftMessage,
    giftWrap,
    estimatedDelivery
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

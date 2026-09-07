// =====================================================
// ZANDO — Local Payment Server
// Runs as a standalone Node.js process.
// Replicates the Firebase Cloud Function createPaymentIntent
// so that real Stripe charges are made without needing
// Firebase Blaze billing.
//
// Start with:  node server.js
// Default URL:  http://localhost:4242
// =====================================================

const express = require('express');
const cors    = require('cors');

// Load environment variables if dotenv is available (optional)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, using system env variables
}

let stripeClient = null;
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('PLACEHOLDER') || key.startsWith('sk_live_PLACEHOLDER')) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = require('stripe')(key);
  }
  return stripeClient;
}

const app  = express();
const PORT = 4242;

// Allow requests from any origin (web app on localhost:3000, Flutter, etc.)
app.use(cors());
app.use(express.json());

// ── Health & Diagnostics ──────────────────────────────
app.get('/', (req, res) => {
  const isConfigured = !!getStripe();
  const key = process.env.STRIPE_SECRET_KEY || '';
  const isLive = key.startsWith('sk_live_') || key.startsWith('rk_live_');
  return res.json({
    status: 'ok',
    service: 'ZANDO Payment Server',
    stripeConfigured: isConfigured,
    mode: isConfigured ? (isLive ? 'live' : 'test') : 'simulation'
  });
});



// ── POST /create-payment-sheet-intent ─────────────────
// Used by flutter_stripe PaymentSheet.
// Creates an UNCONFIRMED PaymentIntent and returns its client_secret.
// The Stripe native SDK on the device then collects card data & confirms it
// without raw card numbers ever leaving Stripe's servers.
// Body: { amount: number (cents), currency: string }
app.post('/create-payment-sheet-intent', async (req, res) => {
  const { amount, currency = 'usd' } = req.body;

  if (!amount || typeof amount !== 'number' || amount < 50) {
    return res.status(400).json({ error: 'A valid amount (minimum 50 cents) is required.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    console.warn('[ZANDO Payment Server] STRIPE_SECRET_KEY not set. Returning simulation response.');
    return res.json({
      clientSecret: 'pi_demo_secret_' + Date.now(),
      paymentIntentId: 'pi_demo_' + Date.now(),
      demoMode: true
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:               Math.round(amount),
      currency:             currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata:             { app: 'ZANDO' },
    });

    return res.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});
app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd', paymentMethodId } = req.body;

  // ── Validation ────────────────────────────────────
  const numAmount = Math.round(Number(amount));
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'A valid amount (in cents) is required.' });
  }
  if (numAmount < 50) {
    return res.status(400).json({ error: 'Amount must be at least 50 cents.' });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ error: 'paymentMethodId is required.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    console.warn('[ZANDO Payment Server] STRIPE_SECRET_KEY not configured. Falling back to simulation mode.');
    return res.json({
      success: true,
      status: 'succeeded',
      paymentIntentId: 'pi_demo_' + Date.now(),
      demoMode: true
    });
  }

  try {
    // 1. Create & immediately confirm the PaymentIntent using paymentMethodId
    const paymentIntent = await stripe.paymentIntents.create({
      amount:               numAmount,
      currency:             currency.toLowerCase(),
      payment_method:       paymentMethodId,
      confirm:              true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata:             { app: 'ZANDO' },
    });

    console.log('[ZANDO Payment Server] Real payment processed:', paymentIntent.id, numAmount, currency);

    return res.json({
      success:         true,
      status:          paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅  ZANDO Payment Server running at http://localhost:${PORT}`);
  console.log(`    POST http://localhost:${PORT}/create-payment-intent\n`);
});

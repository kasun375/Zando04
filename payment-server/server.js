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

const stripe  = require('stripe')(
  process.env.STRIPE_SECRET_KEY || 'sk_live_PLACEHOLDER_CHANGE_ME'
);

const app  = express();
const PORT = 4242;

// Allow requests from any origin (web app on localhost:3000, Flutter, etc.)
app.use(cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'ZANDO Payment Server' }));



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
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A valid amount (in cents) is required.' });
  }
  if (amount < 50) {
    return res.status(400).json({ error: 'Amount must be at least 50 cents.' });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ error: 'paymentMethodId is required.' });
  }

  try {
    // 1. Create & immediately confirm the PaymentIntent using paymentMethodId
    const paymentIntent = await stripe.paymentIntents.create({
      amount:               Math.round(amount),
      currency:             currency.toLowerCase(),
      payment_method:       paymentMethodId,
      confirm:              true,
      return_url:           'https://example.com',
      payment_method_types: ['card'],
      metadata:             { app: 'ZANDO' },
    });

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

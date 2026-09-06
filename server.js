const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables if available
try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv is not present
}

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// Lazy-initialize Stripe client
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

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Zando E-Commerce Server' });
});

// ── Payment Endpoints ─────────────────────────────────────────────────────────
app.post('/create-payment-sheet-intent', async (req, res) => {
  const { amount, currency = 'usd' } = req.body;

  if (!amount || typeof amount !== 'number' || amount < 50) {
    return res.status(400).json({ error: 'A valid amount (minimum 50 cents) is required.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    console.warn('[ZANDO Server] STRIPE_SECRET_KEY not configured. Simulating payment sheet intent.');
    return res.json({
      clientSecret: 'pi_demo_secret_' + Date.now(),
      paymentIntentId: 'pi_demo_' + Date.now(),
      demoMode: true
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: { app: 'ZANDO' },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('Stripe payment sheet error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd', paymentMethodId } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A valid amount (in cents) is required.' });
  }
  if (amount < 50) {
    return res.status(400).json({ error: 'Amount must be at least 50 cents.' });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ error: 'paymentMethodId is required.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    console.warn('[ZANDO Server] STRIPE_SECRET_KEY not configured. Simulating successful checkout.');
    return res.json({
      success: true,
      status: 'succeeded',
      paymentIntentId: 'pi_demo_' + Date.now(),
      demoMode: true
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      return_url: 'https://example.com',
      payment_method_types: ['card'],
      metadata: { app: 'ZANDO' },
    });

    return res.json({
      success: true,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Serve Static Assets ───────────────────────────────────────────────────────
const SERVE_DIR = path.resolve(__dirname);
app.use(express.static(SERVE_DIR, {
  index: 'index.html',
  maxAge: '0'
}));

// SPA fallback for all unhandled client routes
app.get('*', (req, res) => {
  res.sendFile(path.join(SERVE_DIR, 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  ZANDO Web & Payment Server running`);
  console.log(`  Listening on http://${HOST}:${PORT}`);
  console.log(`====================================================`);
});

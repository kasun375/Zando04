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

// ── Health & Diagnostic Checks ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Zando E-Commerce Server',
    stripeConfigured: !!getStripe(),
    stripeMode: process.env.STRIPE_SECRET_KEY
      ? (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') || process.env.STRIPE_SECRET_KEY.startsWith('rk_live_') ? 'live' : 'test')
      : 'not_configured'
  });
});

app.get('/api/payment-status', (req, res) => {
  const isConfigured = !!getStripe();
  const key = process.env.STRIPE_SECRET_KEY || '';
  const isLive = key.startsWith('sk_live_') || key.startsWith('rk_live_');
  res.json({
    stripeConfigured: isConfigured,
    mode: isConfigured ? (isLive ? 'live' : 'test') : 'simulation',
    message: isConfigured
      ? `Stripe is active (${isLive ? 'LIVE' : 'TEST'} mode). Payments are processed directly to your Stripe account.`
      : 'STRIPE_SECRET_KEY is not configured in Settings > Environment Variables. Running in simulation mode.'
  });
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
    console.warn('[ZANDO Stripe] STRIPE_SECRET_KEY is not configured in environment variables. Falling back to simulation mode (pi_demo_...). No real funds will be credited to Stripe.');
    return res.json({
      success: true,
      status: 'succeeded',
      paymentIntentId: 'pi_demo_' + Date.now(),
      demoMode: true,
      warning: 'STRIPE_SECRET_KEY is not configured on server. Set STRIPE_SECRET_KEY in Settings > Environment Variables to receive real payments.'
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: numAmount,
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: { app: 'ZANDO' },
    });

    console.log('[ZANDO Stripe] Real payment succeeded! PaymentIntent ID:', paymentIntent.id, 'Amount:', numAmount, currency);

    return res.json({
      success: true,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('[ZANDO Stripe] Stripe API Error:', err.message);
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

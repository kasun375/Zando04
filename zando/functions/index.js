// =====================================================
// ZANDO — Firebase Cloud Functions: Stripe Payments
// =====================================================

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

// Stripe Secret Key (loaded from environment variable)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;


// ── HTTP API Endpoint for Web App Fetch ─────────────────────────────────────
exports.api = onRequest({ cors: true }, async (req, res) => {
  const urlPath = req.path || req.url || '';

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (urlPath.includes('create-payment-sheet-intent')) {
    const { amount, currency = 'usd' } = req.body || {};
    const numAmount = Math.round(Number(amount));

    if (!numAmount || isNaN(numAmount) || numAmount < 50) {
      return res.status(400).json({ error: 'A valid amount (minimum 50 cents) is required.' });
    }

    try {
      const stripe = require('stripe')(STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: numAmount,
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: { app: 'ZANDO' },
      });

      return res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err) {
      console.error('[Stripe HTTP Error]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (urlPath.includes('create-payment-intent')) {
    const { amount, currency = 'usd', paymentMethodId } = req.body || {};
    const numAmount = Math.round(Number(amount));

    if (!numAmount || isNaN(numAmount) || numAmount < 50) {
      return res.status(400).json({ error: 'A valid amount (minimum 50 cents) is required.' });
    }
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'paymentMethodId is required.' });
    }

    try {
      const stripe = require('stripe')(STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: numAmount,
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: { app: 'ZANDO' },
      });

      return res.json({
        success: true,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err) {
      console.error('[Stripe HTTP Error]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Endpoint not found' });
});

// ── Firebase Callable Functions for Web / Mobile SDK ───────────────────────
exports.createPaymentIntent = onCall({ cors: true }, async (request) => {
  const { amount, currency = 'usd', paymentMethodId } = request.data || {};
  const numAmount = Math.round(Number(amount));

  if (!numAmount || isNaN(numAmount) || numAmount < 50) {
    throw new HttpsError('invalid-argument', 'Amount must be at least 50 cents.');
  }
  if (!paymentMethodId) {
    throw new HttpsError('invalid-argument', 'paymentMethodId is required.');
  }

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: numAmount,
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { app: 'ZANDO', userId: request.auth ? request.auth.uid : 'guest' },
    });

    return {
      success: true,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('[Stripe Callable Error]', error.message);
    throw new HttpsError('internal', error.message);
  }
});

exports.createPaymentSheetIntent = onCall({ cors: true }, async (request) => {
  const { amount, currency = 'usd' } = request.data || {};
  const numAmount = Math.round(Number(amount));

  if (!numAmount || isNaN(numAmount) || numAmount < 50) {
    throw new HttpsError('invalid-argument', 'Amount must be at least 50 cents.');
  }

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: numAmount,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: { app: 'ZANDO', userId: request.auth ? request.auth.uid : 'guest' },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentClientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('[Stripe Callable Error]', error.message);
    throw new HttpsError('internal', error.message);
  }
});



// =====================================================
// ZANDO — Firebase Cloud Function: createPaymentIntent
// Called by Flutter app & web app to create a Stripe
// PaymentIntent using the secret key (server-side only)
// =====================================================

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

// Stripe Secret Key — loaded from Firebase Functions environment variable
// Set with: firebase functions:params:set STRIPE_SECRET_KEY="sk_live_..."
// Or stored in functions/.env file for local + deployed use
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

exports.createPaymentIntent = onCall(async (request) => {
  // ── Auth check ────────────────────────────────────────
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to make a payment.'
    );
  }

  if (!STRIPE_SECRET_KEY) {
    throw new HttpsError(
      'internal',
      'Payment service is not configured. Please contact support.'
    );
  }

  const { amount, currency = 'usd', paymentMethodId } = request.data;

  // Validate input
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new HttpsError(
      'invalid-argument',
      'A valid amount (in cents) is required.'
    );
  }

  // Minimum charge is 50 cents (Stripe requirement)
  if (amount < 50) {
    throw new HttpsError(
      'invalid-argument',
      'Amount must be at least 50 cents.'
    );
  }

  if (!paymentMethodId) {
    throw new HttpsError(
      'invalid-argument',
      'paymentMethodId is required.'
    );
  }

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    // 1. Create and immediately confirm the PaymentIntent on Stripe backend using paymentMethodId
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount in cents (integer)
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      confirm: true,
      return_url: 'https://example.com',
      payment_method_types: ['card'],
      metadata: {
        userId: request.auth.uid,
        app: 'ZANDO',
      },
    });

    return {
      success: true,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Stripe error:', error.message);
    throw new HttpsError('internal', error.message);
  }
});

exports.createPaymentSheetIntent = onCall(async (request) => {
  // ── Auth check ────────────────────────────────────────
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to make a payment.'
    );
  }

  if (!STRIPE_SECRET_KEY) {
    throw new HttpsError(
      'internal',
      'Payment service is not configured. Please contact support.'
    );
  }

  const { amount, currency = 'usd' } = request.data;

  // Validate input
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new HttpsError(
      'invalid-argument',
      'A valid amount (in cents) is required.'
    );
  }

  // Minimum charge is 50 cents (Stripe requirement)
  if (amount < 50) {
    throw new HttpsError(
      'invalid-argument',
      'Amount must be at least 50 cents.'
    );
  }

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    // Create a PaymentIntent (do NOT confirm it, the app PaymentSheet will confirm it)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount in cents (integer)
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        userId: request.auth.uid,
        app: 'ZANDO',
      },
    });

    return {
      success: true,
      paymentIntentClientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('Stripe error:', error.message);
    throw new HttpsError('internal', error.message);
  }
});


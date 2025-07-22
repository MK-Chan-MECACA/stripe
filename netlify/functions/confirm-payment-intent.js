// confirm-payment-intent.js - Server-driven PaymentIntent confirmation
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    const { payment_intent_id } = body;

    if (!payment_intent_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing payment_intent_id' }),
      };
    }

    // Step 2: Confirm the PaymentIntent after payment method collection
    const confirmResult = await stripe.paymentIntents.confirm(payment_intent_id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        payment_intent: confirmResult,
        status: confirmResult.status
      }),
    };

  } catch (err) {
    console.error('Failed to confirm PaymentIntent:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'Failed to confirm PaymentIntent', 
        details: err.message 
      }),
    };
  }
};
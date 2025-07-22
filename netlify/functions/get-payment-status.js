// get-payment-status.js - Get PaymentIntent status directly
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

    // Get PaymentIntent status directly from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: paymentIntent.status,
        payment_intent: paymentIntent
      }),
    };

  } catch (err) {
    console.error('Failed to get payment status:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'Failed to get payment status', 
        details: err.message 
      }),
    };
  }
};
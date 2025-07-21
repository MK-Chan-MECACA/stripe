// process-payment.js - Netlify Function
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    const { payment_intent_id, reader_id } = body;

    if (!payment_intent_id || !reader_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing payment_intent_id or reader_id' }),
      };
    }

    // Use Stripe Terminal server-driven API to collect payment
    const result = await stripe.terminal.readers.processPaymentIntent(reader_id, {
      payment_intent: payment_intent_id,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ result }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Failed to process payment', details: err.message }),
    };
  }
}; 
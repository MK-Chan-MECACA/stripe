// process-payment.js - Netlify Function
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    if (!event.body) {
      console.error('No request body provided');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No request body provided' }),
      };
    }
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      console.error('Malformed JSON:', err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Malformed JSON', details: err.message }),
      };
    }
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

    if (result && result.payment_intent && result.payment_intent.status) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: result.payment_intent.status,
          result
        }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Stripe did not return a payment_intent',
          details: result,
        }),
      };
    }
  } catch (err) {
    console.error('Failed to process payment:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Failed to process payment', details: err.message, stack: err.stack }),
    };
  }
}; 
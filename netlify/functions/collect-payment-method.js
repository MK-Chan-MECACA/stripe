// collect-payment-method.js - Server-driven collect payment method
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

    // Step 1: Collect payment method using server-driven API
    const collectResult = await stripe.terminal.readers.processPaymentIntent(reader_id, {
      payment_intent: payment_intent_id,
      process_config: {
        skip_tipping: false,
        tipping: {
          amount_eligible: 100, // minimum amount eligible for tipping in cents
        },
      },
    });

    // The reader will now prompt for card insertion/tap
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        action: collectResult.action,
        reader: collectResult
      }),
    };

  } catch (err) {
    console.error('Failed to collect payment method:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'Failed to collect payment method', 
        details: err.message 
      }),
    };
  }
};
// collect-payment-method.js - Server-driven collect payment method
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { payment_intent_id, reader_id } = body;

    if (!payment_intent_id || !reader_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({ 
        error: 'Failed to collect payment method', 
        details: err.message 
      }),
    };
  }
};
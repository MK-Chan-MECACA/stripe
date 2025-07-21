// capture-payment.js - Netlify Function
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    const { payment_intent_id, amount, status, description, reader_id, currency } = body;

    // Capture the PaymentIntent using Stripe
    const paymentIntent = await stripe.paymentIntents.capture(payment_intent_id);

    // Insert payment record in Supabase
    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          payment_intent_id,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
          description,
          reader_id,
          currency: paymentIntent.currency,
        },
      ])
      .select();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ payment: data[0], payment_intent: paymentIntent }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request', details: err.message }),
    };
  }
}; 
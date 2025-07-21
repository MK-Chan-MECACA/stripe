// create-payment-intent.js - Netlify Function
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);
    const { amount, currency, description, capture_method, metadata } = body;

    // Create PaymentIntent with card_present method
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
      payment_method_types: ['card_present'],
      capture_method: capture_method || 'automatic',
      description,
      metadata,
    });

    // Optionally, store the PaymentIntent in Supabase
    await supabase.from('payments').insert([
      {
        payment_intent_id: paymentIntent.id,
        amount,
        status: paymentIntent.status,
        description,
        currency: currency || 'usd',
      },
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ payment_intent: paymentIntent }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request', details: err.message }),
    };
  }
}; 
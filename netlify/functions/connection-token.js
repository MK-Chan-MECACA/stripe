// connection-token.js - Netlify Function
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
    const { reader_id, status, metadata } = body;

    // Upsert reader status
    const { data, error } = await supabase
      .from('reader_status')
      .upsert([
        {
          reader_id,
          status,
          metadata: metadata || null,
          last_ping: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    // Create Stripe Terminal connection token
    const connectionToken = await stripe.terminal.connectionTokens.create();

    return {
      statusCode: 200,
      body: JSON.stringify({
        reader_status: data[0],
        secret: connectionToken.secret,
      }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request', details: err.message }),
    };
  }
}; 
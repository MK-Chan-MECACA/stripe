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
    // Create Stripe Terminal connection token - this is the main purpose
    const connectionToken = await stripe.terminal.connectionTokens.create();

    // Optional: Update reader status if body provided
    let readerStatus = null;
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        const { reader_id, status, metadata } = body;
        
        if (reader_id && status) {
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
          
          if (!error && data && data[0]) {
            readerStatus = data[0];
          }
        }
      } catch (parseError) {
        // Ignore parsing errors for connection token requests
        console.log('Body parsing failed (probably empty request):', parseError.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        secret: connectionToken.secret,
        reader_status: readerStatus,
      }),
    };
  } catch (err) {
    console.error('Connection token creation failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create connection token', details: err.message }),
    };
  }
}; 
// get-terminal-location.js - Netlify Function to expose STRIPE_TERMINAL_LOCATION_ID
exports.handler = async function() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ 
      location_id: process.env.STRIPE_TERMINAL_LOCATION_ID 
    })
  };
};
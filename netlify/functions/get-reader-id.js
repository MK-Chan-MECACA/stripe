// get-reader-id.js - Netlify Function to expose READER_ID
exports.handler = async function() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ reader_id: process.env.READER_ID })
  };
}; 
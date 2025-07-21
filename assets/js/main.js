// Initialize Supabase client
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const statusElem = document.getElementById('reader-status');
const dotElem = document.getElementById('reader-dot');

function setReaderStatus(status) {
  statusElem.textContent = `Reader status: ${status}`;
  dotElem.className = 'status-dot ' + (status === 'connected' ? 'connected' : status === 'disconnected' ? 'disconnected' : 'unknown');
}

async function checkReaderStatus() {
  // Example: fetch from a Netlify function or Supabase table
  const { data, error } = await supabase
    .from('readers')
    .select('status')
    .eq('id', 1)
    .single();

  if (error || !data) {
    setReaderStatus('unknown');
  } else {
    setReaderStatus(data.status);
  }
}

document.getElementById('start-payment-btn').addEventListener('click', () => {
  window.location.href = 'payment.html';
});

window.addEventListener('DOMContentLoaded', () => {
  checkReaderStatus();
}); 
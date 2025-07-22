// Initialize Supabase client
let supabase = null;

async function initializeSupabase() {
  try {
    const response = await fetch('/.netlify/functions/get-supabase-config');
    const config = await response.json();
    if (config.url && config.anonKey) {
      const { createClient } = window.supabase;
      supabase = createClient(config.url, config.anonKey);
    }
  } catch (error) {
    console.warn('Could not initialize Supabase:', error);
  }
}

const statusElem = document.getElementById('reader-status');
const dotElem = document.getElementById('reader-dot');

function setReaderStatus(status) {
  statusElem.textContent = `Reader status: ${status}`;
  dotElem.className = 'status-dot ' + (status === 'connected' ? 'connected' : status === 'disconnected' ? 'disconnected' : 'unknown');
}

async function checkReaderStatus() {
  if (!supabase) {
    setReaderStatus('unknown');
    return;
  }
  
  try {
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
  } catch (error) {
    console.warn('Error checking reader status:', error);
    setReaderStatus('unknown');
  }
}

document.getElementById('start-payment-btn').addEventListener('click', () => {
  window.location.href = 'payment.html';
});

window.addEventListener('DOMContentLoaded', async () => {
  await initializeSupabase();
  checkReaderStatus();
}); 
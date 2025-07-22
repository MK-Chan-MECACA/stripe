// stripe-terminal.js - Stripe Terminal integration

let terminal = null;
let reader = null;

// Connection token provider as required by Stripe Terminal docs
async function fetchConnectionToken() {
  try {
    const response = await fetch('/.netlify/functions/connection-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.secret;
  } catch (error) {
    console.error('Error fetching connection token:', error);
    throw error;
  }
}

// Initialize Terminal object
async function initializeTerminal() {
  if (typeof StripeTerminal === 'undefined') {
    console.error('Stripe Terminal SDK not loaded');
    return null;
  }

  try {
    terminal = StripeTerminal.create({
      onFetchConnectionToken: fetchConnectionToken,
      onUnexpectedReaderDisconnect: function() {
        console.log('Reader disconnected unexpectedly');
        updateReaderStatus('disconnected');
      },
    });
    
    console.log('Terminal initialized successfully');
    return terminal;
  } catch (error) {
    console.error('Terminal initialization failed:', error);
    return null;
  }
}

// Discover and connect to readers
async function discoverReaders() {
  if (!terminal) {
    console.error('Terminal not initialized');
    return;
  }

  try {
    const discoverResult = await terminal.discoverReaders({
      simulated: false, // Set to true for testing
      location: 'tml_GHqYagPZrZxRFf' // Your terminal location ID
    });

    if (discoverResult.error) {
      console.error('Discover failed:', discoverResult.error);
      return;
    }

    console.log('Discovered readers:', discoverResult.discoveredReaders);
    
    if (discoverResult.discoveredReaders.length > 0) {
      // Connect to first available reader
      await connectToReader(discoverResult.discoveredReaders[0]);
    } else {
      console.log('No readers found');
      updateReaderStatus('not_found');
    }
  } catch (error) {
    console.error('Error during reader discovery:', error);
    updateReaderStatus('error');
  }
}

// Connect to a specific reader
async function connectToReader(selectedReader) {
  if (!terminal) {
    console.error('Terminal not initialized');
    return;
  }

  try {
    updateReaderStatus('connecting');
    
    const connectResult = await terminal.connectReader(selectedReader);
    
    if (connectResult.error) {
      console.error('Connect failed:', connectResult.error);
      updateReaderStatus('failed');
      return;
    }

    reader = connectResult.reader;
    console.log('Connected to reader:', reader);
    updateReaderStatus('connected');
    
    return reader;
  } catch (error) {
    console.error('Error connecting to reader:', error);
    updateReaderStatus('error');
  }
}

// Update reader status in UI and potentially in database
function updateReaderStatus(status) {
  const statusElement = document.getElementById('reader-status');
  if (statusElement) {
    statusElement.textContent = getStatusText(status);
    statusElement.className = getStatusClass(status);
  }
  
  // Update database via API if needed
  if (reader) {
    updateReaderStatusInDatabase(reader.id, status);
  }
}

function getStatusText(status) {
  const statusTexts = {
    'connecting': 'Connecting...',
    'connected': 'Reader Connected',
    'disconnected': 'Disconnected',
    'not_found': 'No Readers Found',
    'failed': 'Connection Failed',
    'error': 'Error'
  };
  return statusTexts[status] || 'Unknown';
}

function getStatusClass(status) {
  const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
  const statusClasses = {
    'connecting': 'bg-yellow-200 text-yellow-800',
    'connected': 'bg-green-200 text-green-800',
    'disconnected': 'bg-red-200 text-red-800',
    'not_found': 'bg-gray-200 text-gray-800',
    'failed': 'bg-red-200 text-red-800',
    'error': 'bg-red-200 text-red-800'
  };
  return `${baseClasses} ${statusClasses[status] || 'bg-gray-200 text-gray-800'}`;
}

// Update reader status in database
async function updateReaderStatusInDatabase(readerId, status) {
  try {
    await fetch('/.netlify/functions/connection-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reader_id: readerId,
        status: status,
        metadata: { timestamp: new Date().toISOString() }
      })
    });
  } catch (error) {
    console.warn('Failed to update reader status in database:', error);
  }
}

// Process payment with Terminal
async function processTerminalPayment(paymentIntentSecret) {
  if (!terminal || !reader) {
    throw new Error('Terminal or reader not available');
  }

  try {
    const result = await terminal.collectPaymentMethod(paymentIntentSecret);
    
    if (result.error) {
      throw new Error(result.error.message);
    }

    const confirmResult = await terminal.processPayment(result.paymentIntent);
    
    if (confirmResult.error) {
      throw new Error(confirmResult.error.message);
    }

    return confirmResult.paymentIntent;
  } catch (error) {
    console.error('Terminal payment processing failed:', error);
    throw error;
  }
}

// Export functions for use by other scripts
window.StripeTerminalIntegration = {
  initializeTerminal,
  discoverReaders,
  connectToReader,
  processTerminalPayment,
  updateReaderStatus,
  getTerminal: () => terminal,
  getReader: () => reader
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Stripe Terminal...');
  await initializeTerminal();
  
  // Auto-discover readers on page load
  setTimeout(() => {
    discoverReaders();
  }, 1000);
});
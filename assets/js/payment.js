// payment.js - Payment processing logic
console.log('Payment page loaded');

// Form validation for payment amount
function validateAmount(amount) {
  return !isNaN(amount) && Number(amount) > 0;
}

// PaymentIntent creation via Netlify function
async function createPaymentIntent(amount) {
  const response = await fetch('/.netlify/functions/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  return response.json();
}

async function getReaderId() {
  const res = await fetch('/.netlify/functions/get-reader-id');
  const data = await res.json();
  return data.reader_id;
}

// Real-time payment status updates (example: polling)
async function pollPaymentStatus(paymentIntentId) {
  let status = 'processing';
  const paymentStatusElem = document.getElementById('payment-status');
  const readerId = await getReaderId(); // Fetch reader_id from backend
  let pollCount = 0;
  const maxPolls = 12; // 12 * 5s = 60 seconds
  while (status === 'processing' || status === 'in_progress') {
    const res = await fetch('/.netlify/functions/process-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_intent_id: paymentIntentId, reader_id: readerId })
    });
    const data = await res.json();
    status = data.status;
    console.log('Stripe payment status:', status);
    paymentStatusElem.textContent = `Status: ${status}`;
    paymentStatusElem.className = '';
    if (status === 'succeeded' || status === 'requires_capture') paymentStatusElem.classList.add('success');
    if (status === 'failed') paymentStatusElem.classList.add('error');
    if (status === 'succeeded' || status === 'failed' || status === 'requires_capture') break;
    pollCount++;
    if (pollCount >= maxPolls) break;
    await new Promise(r => setTimeout(r, 5000)); // 5 seconds
  }
  if (status === 'succeeded' || status === 'requires_capture') {
    window.location.href = 'success.html';
  } else if (status === 'requires_payment_method' || status === 'failed' || status === 'canceled') {
    localStorage.setItem('lastError', paymentStatusElem.textContent || 'Unknown error');
    window.location.href = 'error.html';
  } else {
    // For processing/in_progress/unknown, show a message and do NOT redirect
    paymentStatusElem.className = 'error';
    paymentStatusElem.textContent = 'Payment is still processing. Please check the terminal or try again.';
  }
}

const paymentStatusElem = document.getElementById('payment-status');
const loadingElem = document.getElementById('loading');

function showLoading(show) {
  loadingElem.style.display = show ? 'block' : 'none';
}

document.getElementById('payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  // Convert dollars to cents and validate
  const amountInput = document.getElementById('amount').value;
  const amount = parseInt(amountInput, 10) * 100;
  if (!validateAmount(amountInput) || isNaN(amount) || amount < 50) { // Stripe minimum is 50 cents
    paymentStatusElem.className = 'error';
    paymentStatusElem.textContent = 'Please enter a valid amount (minimum $0.50).';
    return;
  }
  showLoading(true);
  paymentStatusElem.textContent = '';
  paymentStatusElem.className = '';
  try {
    const response = await createPaymentIntent(amount);
    const paymentIntentId = response.payment_intent && response.payment_intent.id;
    const error = response.error;
    if (error) throw new Error(error);
    await pollPaymentStatus(paymentIntentId);
  } catch (err) {
    paymentStatusElem.className = 'error';
    paymentStatusElem.textContent = `Error: ${err.message}`;
    localStorage.setItem('lastError', err.message || 'Unknown error');
    window.location.href = 'error.html';
  } finally {
    showLoading(false);
  }
}); 
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

// Helper function to get PaymentIntent status directly from Stripe
async function getPaymentIntentStatus(paymentIntentId) {
  try {
    const res = await fetch('/.netlify/functions/get-payment-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_intent_id: paymentIntentId })
    });
    const data = await res.json();
    return data.status || 'unknown';
  } catch (error) {
    console.warn('Failed to get direct payment status:', error);
    return 'unknown';
  }
}

// Server-driven payment flow following Stripe Terminal docs
async function processServerDrivenPayment(paymentIntentId) {
  const paymentStatusElem = document.getElementById('payment-status');
  const readerId = await getReaderId();

  try {
    // Step 1: Collect payment method using server-driven API
    paymentStatusElem.textContent = 'Please insert or tap your card...';
    paymentStatusElem.className = '';
    
    const collectRes = await fetch('/.netlify/functions/collect-payment-method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        payment_intent_id: paymentIntentId, 
        reader_id: readerId 
      })
    });
    
    const collectData = await collectRes.json();
    if (collectData.error) {
      throw new Error(collectData.error);
    }

    // Step 2: Simple status polling - check PaymentIntent directly
    let status = 'processing';
    let pollCount = 0;
    const maxPolls = 20; // 20 * 3s = 60 seconds
    
    paymentStatusElem.textContent = 'Processing payment... Please wait for terminal to complete.';
    
    while (pollCount < maxPolls) {
      // Wait before checking status
      await new Promise(r => setTimeout(r, 3000));
      
      // Get status directly from PaymentIntent (most reliable)
      status = await getPaymentIntentStatus(paymentIntentId);
      
      console.log(`Poll ${pollCount + 1}: Payment status = ${status}`);
      paymentStatusElem.textContent = `${getStatusMessage(status)} (attempt ${pollCount + 1})`;
      
      // Check for terminal states
      if (status === 'succeeded' || status === 'requires_capture') {
        console.log('✅ Payment succeeded! Status:', status);
        break;
      }
      if (status === 'failed' || status === 'canceled' || status === 'requires_payment_method') {
        console.log('❌ Payment failed. Status:', status);
        break;
      }
      
      pollCount++;
    }
    
    // Final status check
    if (status === 'processing' || status === 'unknown') {
      console.log('Final attempt to get payment status...');
      status = await getPaymentIntentStatus(paymentIntentId);
      console.log('Final status:', status);
    }

    // Step 3: Handle final status
    handlePaymentResult(status, paymentStatusElem);
    
  } catch (error) {
    console.error('❌ Server-driven payment failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      paymentIntentId: paymentIntentId
    });
    paymentStatusElem.className = 'error';
    paymentStatusElem.textContent = `Error: ${error.message}`;
    localStorage.setItem('lastError', error.message);
    
    // Don't redirect immediately - let user see the error
    alert(`Payment Error: ${error.message}\n\nCheck console for details. Click OK to go to error page.`);
    setTimeout(() => window.location.href = 'error.html', 1000);
  }
}

function getStatusMessage(status) {
  const messages = {
    'processing': 'Processing payment...',
    'requires_payment_method': 'Please insert or tap your card',
    'requires_confirmation': 'Confirming payment...',
    'succeeded': 'Payment successful!',
    'requires_capture': 'Payment authorized (requires capture)',
    'failed': 'Payment failed',
    'canceled': 'Payment canceled'
  };
  return messages[status] || `Status: ${status}`;
}

function handlePaymentResult(status, statusElem) {
  statusElem.className = '';
  console.log('Handling final payment result. Status:', status);
  
  if (status === 'succeeded') {
    statusElem.classList.add('success');
    statusElem.textContent = '✅ Payment successful! Redirecting...';
    console.log('🎉 Payment succeeded - redirecting to success page');
    setTimeout(() => window.location.href = 'success.html', 1500);
  } else if (status === 'requires_capture') {
    statusElem.classList.add('success');
    statusElem.textContent = '✅ Payment authorized! Redirecting...';
    console.log('✅ Payment requires capture - redirecting to success page');
    setTimeout(() => window.location.href = 'success.html', 1500);
  } else if (status === 'failed' || status === 'canceled' || status === 'requires_payment_method') {
    statusElem.classList.add('error');
    statusElem.textContent = `❌ ${getStatusMessage(status)}`;
    console.log('❌ Payment failed - redirecting to error page');
    localStorage.setItem('lastError', statusElem.textContent);
    setTimeout(() => window.location.href = 'error.html', 2000);
  } else {
    // For processing, unknown, or other states - assume it might succeed
    console.log('⚠️ Unclear status:', status, '- checking one more time...');
    statusElem.classList.add('error');
    statusElem.textContent = `Status: ${status}. Please check your terminal or Stripe dashboard.`;
    
    // Give user option to check manually
    setTimeout(() => {
      if (confirm('Payment status unclear. Click OK to go to success page, Cancel to try again.')) {
        window.location.href = 'success.html';
      } else {
        window.location.href = 'error.html';
      }
    }, 3000);
  }
}

const paymentStatusElem = document.getElementById('payment-status');
const loadingElem = document.getElementById('loading');

function showLoading(show) {
  loadingElem.style.display = show ? 'block' : 'none';
}

document.getElementById('payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('🚀 Payment form submitted');
  
  // Convert dollars to cents and validate
  const amountInput = document.getElementById('amount').value;
  const amount = parseInt(amountInput, 10) * 100;
  console.log('Amount input:', amountInput, '-> cents:', amount);
  
  if (!validateAmount(amountInput) || isNaN(amount) || amount < 50) { // Stripe minimum is 50 cents
    console.error('❌ Invalid amount:', amountInput);
    paymentStatusElem.className = 'error';
    paymentStatusElem.textContent = 'Please enter a valid amount (minimum $0.50).';
    return;
  }
  
  showLoading(true);
  paymentStatusElem.textContent = '';
  paymentStatusElem.className = '';
  
  try {
    console.log('📝 Creating PaymentIntent...');
    const response = await createPaymentIntent(amount);
    console.log('PaymentIntent response:', response);
    
    const paymentIntentId = response.payment_intent && response.payment_intent.id;
    const error = response.error;
    
    if (error) {
      console.error('❌ PaymentIntent creation failed:', error);
      throw new Error(error);
    }
    
    if (!paymentIntentId) {
      console.error('❌ No PaymentIntent ID received:', response);
      throw new Error('No PaymentIntent ID received');
    }
    
    console.log('✅ PaymentIntent created:', paymentIntentId);
    await processServerDrivenPayment(paymentIntentId);
  } catch (err) {
    console.error('❌ Form submission error:', err);
    paymentStatusElem.className = 'error';
    paymentStatusElem.textContent = `Error: ${err.message}`;
    localStorage.setItem('lastError', err.message || 'Unknown error');
    
    alert(`Form Error: ${err.message}\n\nClick OK to go to error page.`);
    window.location.href = 'error.html';
  } finally {
    showLoading(false);
  }
}); 
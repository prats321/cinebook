const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

// Razorpay's checkout script is only needed on the payment step, so load it on demand
// instead of on every page. Cached, so repeat calls reuse the same promise.
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      loading = null; // allow a retry
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return loading;
}

// Opens Razorpay Checkout for an order from our API. Resolves with the signed payment
// response on success, or null if the user closes the window.
export async function openCheckout({ keyId, order, description, prefill, onFailure }) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve) => {
    const rzp = new Razorpay({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'CineBook',
      description,
      prefill,
      theme: { color: '#f43f5e' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => resolve(null), confirm_close: true },
    });
    // A failed attempt (declined card etc.) keeps the window open so the user can retry.
    rzp.on('payment.failed', (res) => onFailure?.(res.error?.description || 'Payment failed'));
    rzp.open();
  });
}

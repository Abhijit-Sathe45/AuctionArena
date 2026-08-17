// Loads the Razorpay checkout script (once) and opens the payment modal.
// Resolves with { razorpay_order_id, razorpay_payment_id, razorpay_signature } on success.
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({ order, keyId, name, description, prefill }) {
  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error('Failed to load Razorpay checkout. Check your internet connection.');

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name,
      description,
      prefill,
      theme: { color: '#0B3D2E' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.open();
  });
}

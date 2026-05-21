const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const gelatoService = require('../services/gelato');
const imageService = require('../services/imageGenerator');
const emailService = require('../services/email');
const crypto = require('crypto');

async function sendMetaPurchaseEvent(session) {
  const pixelId = process.env.FB_PIXEL_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return;
  const eventTime = Math.floor(Date.now() / 1000);
  const email = session.customer_details?.email || '';
  const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: session.id,
      action_source: 'website',
      user_data: {
        em: [hashedEmail],
      },
      custom_data: {
        currency: 'USD',
        value: ((session.amount_total || 0) / 100).toFixed(2),
      }
    }]
  };
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const result = await response.json();
    console.log('Meta CAPI Purchase sent:', JSON.stringify(result));
  } catch (err) {
    console.error('Meta CAPI error:', err.message);
  }
}

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      try {
        await handleSuccessfulOrder(session);
      } catch (err) {
        console.error('Order processing error:', err);
      }
    }
  }
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    console.log('Payment failed:', intent.id);
  }
  res.json({ received: true });
});

router.post('/gelato', express.json(), async (req, res) => {
  try {
    const { event, order } = req.body;
    console.log('Gelato webhook:', event, order?.id);
    if (event === 'order_status_updated' && order?.status === 'shipped') {
      if (order.customerEmail && order.trackingUrl) {
        await emailService.sendShippingNotification({
          email: order.customerEmail,
          name: order.customerName,
          trackingUrl: order.trackingUrl,
        });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Gelato webhook error:', err);
    res.json({ received: true });
  }
});

async function handleSuccessfulOrder(session) {
  const { surname, est, pub, product, size, gelato_uid } = session.metadata;
  const shipping = session.shipping_details;
  const billing = session.customer_details;
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const shippingAddr = shipping?.address || {};
  const billingAddr = billing?.address || {};
  const resolvedAddress = {
    name: shipping?.name || customerName,
    line1: shippingAddr.line1 || billingAddr.line1 || '',
    line2: shippingAddr.line2 || billingAddr.line2 || '',
    city: shippingAddr.city || billingAddr.city || '',
    postcode: session.shipping_details?.address?.postal_code || billingAddr.postal_code || '',
    country: session.shipping_details?.address?.country || billingAddr.country || 'IE',
  };
  console.log(`Processing order: ${surname}'s ${pub} pub — ${product} ${size}`);
  console.log('Resolved address:', JSON.stringify(resolvedAddress));
  const imageUrl = await imageService.generatePrintImage({ surname, est, pub, size });
  console.log('Image generated:', imageUrl);
  const gelatoOrder = await gelatoService.createOrder({
    orderReference: session.id,
    customerEmail,
    customerName,
    shippingAddress: resolvedAddress,
    productUid: gelato_uid,
    imageUrl,
    quantity: 1,
  });
  console.log('Gelato order created:', gelatoOrder.id);
  await emailService.sendOrderConfirmation({
    email: customerEmail,
    name: customerName,
    surname,
    pub,
    product,
    size,
    est,
    orderId: gelatoOrder.id,
  });
  await sendMetaPurchaseEvent(session);
  console.log('Order complete:', session.id);
}

module.exports = router;

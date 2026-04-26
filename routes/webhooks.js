const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const gelatoService = require('../services/gelato');
const imageService = require('../services/imageGenerator');
const emailService = require('../services/email');

// POST /webhook/stripe
router.post('/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

              // Verify webhook came from Stripe
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

              // Handle successful payment
              if (event.type === 'checkout.session.completed') {
                    const session = event.data.object;

      // Only process if payment was successful
      if (session.payment_status === 'paid') {
              try {
                        await handleSuccessfulOrder(session);
              } catch (err) {
                        console.error('Order processing error:', err);
                        // Return 200 to Stripe even if our processing fails
                // — prevents Stripe from retrying endlessly
                // Log to investigate manually
              }
      }
              }

              // Handle failed payment
              if (event.type === 'payment_intent.payment_failed') {
                    const intent = event.data.object;
                    console.log('Payment failed:', intent.id);
                    // Could send a recovery email here
              }

              res.json({ received: true });
});

// POST /webhook/gelato
// Receives order status updates from Gelato
router.post('/gelato', express.json(), async (req, res) => {
    try {
          const { event, order } = req.body;
          console.log('Gelato webhook:', event, order?.id);

      if (event === 'order_status_updated' && order?.status === 'shipped') {
              // Email customer their tracking info
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

// ── CORE ORDER HANDLER ──
async function handleSuccessfulOrder(session) {
    const {
          surname,
          est,
          pub,
          product,
          size,
          gelato_uid,
    } = session.metadata;

  const shipping = session.shipping_details;
    const billing = session.customer_details;
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;

  // Use shipping address, fall back to billing address if shipping fields are blank
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

  // Step 1: Generate personalised print image
  const imageUrl = await imageService.generatePrintImage({
        surname,
        est,
        pub,
        size,
  });

  console.log('Image generated:', imageUrl);

  // Step 2: Send order to Gelato
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

  // Step 3: Send confirmation email to customer
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

  console.log('Order complete:', session.id);
}

module.exports = router;

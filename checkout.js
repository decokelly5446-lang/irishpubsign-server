const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Gelato product UIDs
const PRODUCT_UIDS = {
  print: {
    A4: 'fine_arts_poster_geo_simplified_product_12-0_ver_a4-8x12-inch_200-gsm-80lb-enhanced-uncoated',
    A3: 'fine_arts_poster_geo_simplified_product_12-0_ver_a3_200-gsm-80lb-enhanced-uncoated',
    A2: 'fine_arts_poster_geo_simplified_product_12-0_ver_a2_200-gsm-80lb-enhanced-uncoated',
  },
  framed: {
    A4: 'framed_poster_mounted_210x297mm-8x12-inch_white_wood_w12xt22-mm_plexiglass_a4-8x12-inch_170-gsm-65lb-uncoated_4-0_ver',
    A3: 'framed_poster_mounted_a3_white_wood_w12xt22-mm_plexiglass_a3_170-gsm-65lb-uncoated_4-0_ver',
    A2: 'framed_poster_mounted_a2_white_wood_w12xt22-mm_plexiglass_a2_170-gsm-65lb-uncoated_4-0_ver',
  }
};

// Prices in cents
const PRICES = {
  print: { A4: 3500, A3: 4500, A2: 5500 },
  framed: { A4: 7500, A3: 8500, A2: 9500 }
};

// POST /api/create-checkout
// Body: { name, est, pub, product, size }
router.post('/create-checkout', async (req, res) => {
  try {
    const { name, est, pub, product, size } = req.body;

    // Validate inputs
    if (!name || name.length < 2) return res.status(400).json({ error: 'Invalid name' });
    if (!['city', 'seaside'].includes(pub)) return res.status(400).json({ error: 'Invalid pub' });
    if (!['print', 'framed'].includes(product)) return res.status(400).json({ error: 'Invalid product' });
    if (!['A4', 'A3', 'A2'].includes(size)) return res.status(400).json({ error: 'Invalid size' });

    const displayName = name.toUpperCase().endsWith('S') ? name : name + "'s";
    const pubLabel = pub === 'city' ? 'City Pub' : 'Seaside Pub';
    const productLabel = product === 'print' ? 'Art Print' : 'Framed Print';
    const estLabel = est ? ` · Est. ${est}` : '';
    const amount = PRICES[product][size];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${displayName} — ${pubLabel} ${productLabel} (${size})${estLabel}`,
            description: `Personalised Irish pub sign print. Produced and shipped within 3–5 working days.`,
            images: [`${process.env.BASE_URL}/images/preview-${pub}.jpg`],
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/`,
      shipping_address_collection: {
        allowed_countries: ['IE', 'GB', 'US', 'AU', 'CA', 'DE', 'FR', 'NL', 'ES', 'IT'],
      },
      metadata: {
        // Store all order details in metadata — retrieved in webhook
        surname: name,
        est: est || '',
        pub,
        product,
        size,
        gelato_uid: PRODUCT_UIDS[product][size],
      },
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

module.exports = router;

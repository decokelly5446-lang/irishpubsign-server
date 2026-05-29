require('dotenv').config();
const express = require('express');
const path = require('path');
const checkoutRouter = require('./routes/checkout');
const adminRenderRouter = require('./routes/adminRender');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

app.use((req, res, next) => {
  if (req.originalUrl === '/webhook/stripe') return next();
  express.json()(req, res, next);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/tool', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tool.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/verify-session', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.json({ paid: false });
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ paid: session.payment_status === 'paid' });
  } catch (e) {
    res.json({ paid: false });
  }
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { surname, style, est, email, name, address } = session.metadata;

    try {
      await axios.post(
        'https://dashboard.gelato.com/api/v4/orders',
        {
          orderType: 'order',
          orderReferenceId: session.id,
          customerReferenceId: email,
          currency: session.currency.toUpperCase(),
          items: [{
            itemReferenceId: `${session.id}-1`,
            productUid: 'art_print_350gsm-170gsm_poster_a3_ver',
            files: [{ type: 'default', url: `${process.env.R2_PUBLIC_URL}/${surname}-${style}-${est}.png` }],
            quantity: 1
          }],
          shippingAddress: {
            firstName: name.split(' ')[0] || name,
            lastName: name.split(' ').slice(1).join(' ') || '-',
            addressLine1: address.line1,
            addressLine2: address.line2 || '',
            city: address.city,
            postCode: address.postal_code,
            country: address.country,
            email: email,
            phone: ''
          }
        },
        {
          headers: {
            'X-API-KEY': process.env.GELATO_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Gelato order created for session:', session.id);
    } catch (err) {
      console.error('Gelato order error:', err.response?.data || err.message);
    }
  }

  res.json({ received: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.use('/api', checkoutRouter);
app.use('/admin', adminRenderRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

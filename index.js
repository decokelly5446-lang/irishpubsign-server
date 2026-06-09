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
res.json({ paid: session.payment_status === 'paid', amount: (session.amount_total || 0) / 100, currency: session.currency?.toUpperCase() || 'EUR' });
  } catch (e) {
    res.json({ paid: false });
  }
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});


app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.use('/api', checkoutRouter);
app.use('/admin', adminRenderRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

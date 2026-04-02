require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();

// Serve static files (the frontend HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Raw body needed for Stripe webhook verification
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

// JSON body for all other routes
app.use(express.json());

// ── ROUTES ──
app.use('/api', require('./routes/checkout'));
app.use('/webhook', require('./routes/webhooks'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'IrishPubSign API' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IrishPubSign server running on port ${PORT}`);
});

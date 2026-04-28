require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Raw body needed for Stripe webhook verification
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));

app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
// JSON body for all other routes
app.use(express.json());


// Redirect www to apex
app.use((req, res, next) => {
    if (req.headers.host && req.headers.host.startsWith('www.')) {
          return res.redirect(301, 'https://irishpubsign.com' + req.url);
    }
    next();
});

// ── ROUTES ──
app.use('/api', require('./routes/checkout'));
app.use('/webhook', require('./routes/webhooks'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'IrishPubSign API' }));

// Preview route — generates and returns composite image without placing order
app.get('/preview', async (req, res) => {
      const { name, est, pub } = req.query;
      if (!name || !pub) {
              return res.status(400).send('Missing required parameters: name, pub');
      }
      try {
              const { generatePrintImage } = require('./services/imageGenerator');
              const imageUrl = await generatePrintImage({
                        surname: name,
                        est: est || '1845',
                        pub: pub.toLowerCase(),
                        size: 'A3'
              });
              res.redirect(imageUrl);
      } catch (err) {
              console.error('Preview error:', err);
              res.status(500).send('Preview generation failed: ' + err.message);
      }
});

// Tool route — personalisation engine
app.get('/tool', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tool.html'));
});

// Success page
app.get('/success', (req, res) => {
    res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed — IrishPubSign.com</title>
    <link href="https://fonts.googleapis.com/css2?family=Uncial+Antiqua&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0D0A06; color:#F2ECD8; font-family:'Crimson Pro',Georgia,serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem; }
    .card { max-width:520px; width:100%; border:1px solid rgba(201,168,76,0.2); padding:3rem 2.5rem; text-align:center; }
    .shamrock { font-size:3rem; margin-bottom:1.5rem; display:block; }
    h1 { font-family:'Uncial Antiqua',serif; color:#C9A84C; font-size:1.8rem; margin-bottom:1rem; }
    p { color:#D4C9A8; font-size:1.05rem; line-height:1.7; margin-bottom:1rem; opacity:0.85; }
    .order-note { background:rgba(201,168,76,0.06); border:1px solid rgba(201,168,76,0.15); padding:1.2rem; margin:1.5rem 0; }
    .order-note p { font-size:0.9rem; opacity:0.7; margin:0; }
    a.btn { display:inline-block; margin-top:1.5rem; background:#C9A84C; color:#0D0A06; padding:0.85rem 2rem; font-family:'Uncial Antiqua',serif; font-size:0.95rem; text-decoration:none; border-radius:2px; }
    a.btn:hover { background:#E8C96A; }
    </style>
    </head>
    <body>
    <div class="card">
      <span class="shamrock">☘</span>
        <h1>Order Confirmed!</h1>
          <p>Your personalised Irish pub sign is on its way to print. You'll receive a confirmation email shortly.</p>
            <div class="order-note">
                <p>Produced and shipped within 3–5 working days · Delivered worldwide</p>
                  </div>
                    <p style="font-size:0.9rem;">Questions? Email us at <a href="mailto:orders@irishpubsign.com" style="color:#C9A84C;">orders@irishpubsign.com</a></p>
                      <a href="/" class="btn">Order Another →</a>
                      </div>
                      </body>
                      </html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`IrishPubSign server running on port ${PORT}`);
});

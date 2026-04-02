# IrishPubSign.com — Server

Node.js backend handling Stripe payments, image generation, and Gelato fulfilment.

## Setup

### 1. Install dependencies
```bash
npm install
pip3 install Pillow
```

### 2. Environment variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

Required keys:
- `STRIPE_SECRET_KEY` — from Stripe dashboard → Developers → API Keys
- `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard → Developers → Webhooks
- `GELATO_API_KEY` — from Gelato dashboard → Developer → API Keys
- `RESEND_API_KEY` — from resend.com (free account)
- `BASE_URL` — your live domain e.g. https://irishpubsign.com

### 3. Add assets
```
assets/
  City_Pub.png      ← high-res pub illustration from Emmet
  Sea_Side.png      ← high-res pub illustration from Emmet
  fonts/
    VastShadow-Regular.ttf   ← download from Google Fonts
```

### 4. Run locally
```bash
npm run dev
```

### 5. Test Stripe webhooks locally
```bash
stripe listen --forward-to localhost:3000/webhook/stripe
```

---

## Deployment (Railway.app)

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Add all environment variables in Railway dashboard
4. Railway auto-deploys on every push

Update your Stripe webhook endpoint URL to the Railway URL once live.

---

## Flow

```
Customer pays on Stripe Checkout
    ↓
Stripe fires checkout.session.completed webhook
    ↓
Server retrieves order metadata (surname, pub, size, etc.)
    ↓
Python/Pillow generates personalised print image (3600x4800 @ 300dpi)
    ↓
Image saved to /public/generated/ (served via Express static)
    ↓
Gelato API called with image URL + shipping address
    ↓
Gelato prints and ships to customer
    ↓
Confirmation email sent via Resend
    ↓
Gelato fires order_status_updated webhook when shipped
    ↓
Shipping notification email sent to customer with tracking link
```

---

## API Endpoints

### POST /api/create-checkout
Creates a Stripe Checkout session.

**Body:**
```json
{
  "name": "Kelly",
  "est": "1973",
  "pub": "city",
  "product": "print",
  "size": "A3"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /webhook/stripe
Stripe webhook endpoint. Handles `checkout.session.completed`.

### POST /webhook/gelato
Gelato webhook endpoint. Handles order status updates.

### GET /health
Returns `{ "status": "ok" }`.

const axios = require('axios');

const resendClient = axios.create({
  baseURL: 'https://api.resend.com',
  headers: {
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

async function sendEmail({ to, subject, html }) {
  try {
    const response = await resendClient.post('/emails', {
      from: process.env.FROM_EMAIL || 'orders@irishpubsign.com',
      to,
      subject,
      html,
    });
    console.log('Email sent:', response.data.id);
    return response.data;
  } catch (err) {
    console.error('Email error:', err.response?.data || err.message);
    // Don't throw — email failure shouldn't break the order
  }
}

async function sendOrderConfirmation({ email, name, surname, pub, product, size, est, orderId }) {
    const displayName = surname.toUpperCase().endsWith('S') ? surname.toUpperCase() : surname.toUpperCase() + "'S";
  const pubLabel = pub === 'city' ? 'City Pub' : 'Seaside Pub';
  const productLabel = product === 'print' ? 'Art Print (Unframed)' : 'Framed Print';
  const estLine = est ? `<p style="margin:4px 0;color:#666;">Est. ${est}</p>` : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Georgia, serif; background: #f9f6f0; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 40px auto; background: #fff; border: 1px solid #e0d8c8; padding: 40px;">

    <h1 style="font-family: Georgia, serif; color: #0D0A06; font-size: 24px; margin: 0 0 8px;">
      IrishPubSign.com
    </h1>
    <p style="color: #888; font-style: italic; font-size: 13px; margin: 0 0 32px; letter-spacing: 0.15em; text-transform: uppercase;">
      Your Name Above The Door
    </p>

    <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px;">Order Confirmed ☘</h2>

    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Thank you ${name ? name.split(' ')[0] : ''}. Your personalised pub sign is on its way to print.
    </p>

    <div style="background: #f9f6f0; border: 1px solid #e0d8c8; padding: 20px; margin: 24px 0; border-radius: 2px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.15em; text-transform: uppercase; color: #888;">Your Order</h3>
      <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #0D0A06;">${displayName} — ${pubLabel}</p>
      ${estLine}
      <p style="margin: 8px 0 4px 0; color: #666;">${productLabel} · ${size}</p>
      <p style="margin: 4px 0; color: #999; font-size: 13px;">Order ref: ${orderId}</p>
    </div>

    <p style="color: #333; font-size: 15px; line-height: 1.6;">
      Your print will be produced and shipped within <strong>3–5 working days</strong>.
      You'll receive a shipping confirmation with tracking details once it's on its way.
    </p>

    <p style="color: #333; font-size: 15px; line-height: 1.6;">
      Questions? Reply to this email and we'll get back to you.
    </p>

    <hr style="border: none; border-top: 1px solid #e0d8c8; margin: 32px 0;">

    <p style="color: #bbb; font-size: 12px; text-align: center;">
      IrishPubSign.com · Dublin, Ireland
    </p>

  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `Order confirmed — ${displayName} ${pubLabel} print`,
    html,
  });
}

async function sendShippingNotification({ email, name, trackingUrl }) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #f9f6f0; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 40px auto; background: #fff; border: 1px solid #e0d8c8; padding: 40px;">
    <h1 style="color: #0D0A06; font-size: 24px; margin: 0 0 32px;">IrishPubSign.com</h1>
    <h2 style="color: #C9A84C;">Your print is on its way 📦</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Great news ${name ? name.split(' ')[0] : ''} — your personalised pub sign has been shipped.
    </p>
    <a href="${trackingUrl}" style="display:inline-block;background:#C9A84C;color:#0D0A06;padding:12px 24px;text-decoration:none;font-family:Georgia,serif;margin:16px 0;border-radius:2px;">
      Track Your Order →
    </a>
    <hr style="border: none; border-top: 1px solid #e0d8c8; margin: 32px 0;">
    <p style="color: #bbb; font-size: 12px; text-align: center;">IrishPubSign.com · Dublin, Ireland</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Your IrishPubSign print has shipped!',
    html,
  });
}

module.exports = { sendOrderConfirmation, sendShippingNotification };

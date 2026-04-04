const axios = require('axios');

const GELATO_BASE_URL = 'https://order.gelatoapis.com';

const gelatoClient = axios.create({
  baseURL: GELATO_BASE_URL,
  headers: {
    'X-API-KEY': process.env.GELATO_API_KEY,
    'Content-Type': 'application/json',
  },
});

// Create a print order in Gelato
async function createOrder({ orderReference, customerEmail, customerName, shippingAddress, productUid, imageUrl, quantity }) {

  // Ensure country is always a valid ISO code — fall back to IE if blank
  const countryCode = shippingAddress.country && shippingAddress.country.length === 2
    ? shippingAddress.country.toUpperCase()
    : 'IE';

  const payload = {
    orderReferenceId: orderReference,
    customerReferenceId: customerEmail,
    currency: 'EUR',
    items: [
      {
        itemReferenceId: `item-${orderReference}`,
        productUid,
        files: [
          {
            type: 'default',
            url: imageUrl,
          }
        ],
        quantity,
      }
    ],
    shipmentMethodUid: 'normal',
    shippingAddress: {
      firstName: shippingAddress.name?.split(' ')[0] || customerName?.split(' ')[0] || 'Customer',
      lastName: shippingAddress.name?.split(' ').slice(1).join(' ') || customerName?.split(' ').slice(1).join(' ') || '',
      addressLine1: shippingAddress.line1 || '',
      addressLine2: shippingAddress.line2 || '',
      city: shippingAddress.city || '',
      postCode: shippingAddress.postcode || '',
      country: countryCode,
      email: customerEmail,
    },
    returnAddress: {
      companyName: 'IrishPubSign.com',
      addressLine1: 'Dublin',
      country: 'IE',
      email: process.env.FROM_EMAIL,
    },
  };

  // Log the payload for debugging
  console.log('Gelato order payload:', JSON.stringify({
    orderReferenceId: payload.orderReferenceId,
    shippingAddress: payload.shippingAddress,
    productUid,
    imageUrl,
  }, null, 2));

  try {
    const response = await gelatoClient.post('/v4/orders', payload);
    console.log('Gelato order created:', response.data.id);
    return response.data;
  } catch (err) {
    console.error('Gelato API error:', err.response?.data || err.message);
    throw new Error('Failed to create Gelato order: ' + (err.response?.data?.message || err.message));
  }
}

// Get order status from Gelato
async function getOrder(orderId) {
  try {
    const response = await gelatoClient.get(`/v4/orders/${orderId}`);
    return response.data;
  } catch (err) {
    console.error('Gelato get order error:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { createOrder, getOrder };

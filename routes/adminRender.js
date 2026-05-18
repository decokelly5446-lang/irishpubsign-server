const express = require('express');
const router = express.Router();
const { generatePrintImage } = require('../services/imageGenerator');

router.post('/render', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { surname, est, pub, size } = req.body;

  if (!surname || !pub) {
    return res.status(400).json({ error: 'surname and pub are required' });
  }

  try {
    console.log('Admin render requested:', { surname, est, pub, size });
    const imageUrl = await generatePrintImage({
      surname: surname.trim(),
      est: est || '1845',
      pub: pub.toLowerCase(),
      size: size || 'A3'
    });
    console.log('Admin render complete:', imageUrl);
    res.json({ url: imageUrl });
  } catch (err) {
    console.error('Admin render error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

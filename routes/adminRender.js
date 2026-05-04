const express = require('express');
const router = express.Router();
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

registerFont(
  path.join(__dirname, '../assets/fonts/VastShadow-Regular.ttf'),
  { family: 'Vast Shadow' }
);

function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

const R2_BASE = 'https://pub-631a8059a22f4421be19fe52ea93b20e.r2.dev';

const STYLES = {
  city: {
    imageUrl: `${R2_BASE}/City_Pub.png`,
    fasciaX: 0.5067,
    fasciaY: 0.596,
    estX:    0.5039,
    estY:    0.640,
  },
  seaside: {
    imageUrl: `${R2_BASE}/Sea_Side.png`,
    fasciaX: 0.4917,
    fasciaY: 0.497,
    estX:    0.556,
    estY:    0.5403,
  },
};

const FASCIA_FONT_RATIO = 0.048;
const EST_FONT_RATIO    = 0.018;

const SIZES = {
  full:   null,
  social: { w: 1080, h: 1350 },
  story:  { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

const BG_COLOUR = '#1a1a1a';
const WATERMARK = 'irishpubsign.com';

async function renderFull(cfg, name, est) {
  const img = await loadImage(cfg.imageUrl);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  const fasciaSize = Math.round(H * FASCIA_FONT_RATIO);
  ctx.font = `${fasciaSize}px "Vast Shadow"`;
  ctx.fillStyle = '#F5E6C8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, W * cfg.fasciaX, H * cfg.fasciaY);

  const estSize = Math.round(H * EST_FONT_RATIO);
  ctx.font = `${estSize}px "Vast Shadow"`;
  ctx.fillStyle = '#F5E6C8';
  ctx.fillText(`EST. ${est}`, W * cfg.estX, H * cfg.estY);

  return canvas;
}

async function renderSized(cfg, name, est, size) {
  const pubCanvas = await renderFull(cfg, name, est);
  const pubW = pubCanvas.width;
  const pubH = pubCanvas.height;

  const { w: OUT_W, h: OUT_H } = size;
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  const PADDING = 0.06;
  const maxW = OUT_W * (1 - PADDING * 2);
  const maxH = OUT_H * (1 - PADDING * 2) - 60;

  const scale = Math.min(maxW / pubW, maxH / pubH);
  const drawW = pubW * scale;
  const drawH = pubH * scale;

  const drawX = (OUT_W - drawW) / 2;
  const drawY = (OUT_H - drawH) / 2 - 20;

  ctx.drawImage(pubCanvas, drawX, drawY, drawW, drawH);

  const wmSize = Math.round(OUT_W * 0.028);
  ctx.font = `${wmSize}px "Vast Shadow"`;
  ctx.fillStyle = 'rgba(245, 230, 200, 0.45)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(WATERMARK, OUT_W / 2, OUT_H - Math.round(OUT_H * 0.025));

  return canvas;
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const name    = (req.query.name  || 'KELLY').toUpperCase();
    const style   = (req.query.style || 'city').toLowerCase();
    const est     = req.query.est  || '1845';
    const sizeKey = (req.query.size || 'full').toLowerCase();

    const cfg = STYLES[style];
    if (!cfg) return res.status(400).json({ error: 'style must be: city | seaside' });
    if (!(sizeKey in SIZES)) return res.status(400).json({ error: 'size must be: full | social | story | square' });

    const size = SIZES[sizeKey];
    const canvas = size
      ? await renderSized(cfg, name, est, size)
      : await renderFull(cfg, name, est);

    const filename = `${name.toLowerCase()}-${style}-${sizeKey}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    canvas.createPNGStream().pipe(res);

  } catch (err) {
    console.error('Admin render error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

registerFont(
  path.join(__dirname, '../assets/fonts/VastShadow-Regular.ttf'),
  { family: 'Vast Shadow' }
);

function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

const R2_BASE = 'https://pub-631a8059a22f4421be19fe52ea93b20e.r2.dev';

const STYLES = {
  city: {
    imageUrl: `${R2_BASE}/City_Pub.png`,
    fasciaX: 0.5067,
    fasciaY: 0.596,
    estX:    0.5039,
    estY:    0.652,
  },
  seaside: {
    imageUrl: `${R2_BASE}/Sea_Side.png`,
    fasciaX: 0.4917,
    fasciaY: 0.497,
    estX:    0.556,
    estY:    0.5403,
  },
};

const FASCIA_FONT_RATIO = 0.048;
const EST_FONT_RATIO    = 0.022;

const SIZES = {
  full:   null,
  social: { w: 1080, h: 1350 },
  story:  { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

const BG_COLOUR = '#1a1a1a';
const WATERMARK = 'irishpubsign.com';

async function renderFull(cfg, name, est) {
  const img = await loadImage(cfg.imageUrl);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  const fasciaSize = Math.round(H * FASCIA_FONT_RATIO);
  ctx.font = `${fasciaSize}px "Vast Shadow"`;
  ctx.fillStyle = '#F5E6C8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, W * cfg.fasciaX, H * cfg.fasciaY);

  const estSize = Math.round(H * EST_FONT_RATIO);
  ctx.font = `${estSize}px "Vast Shadow"`;
  ctx.fillStyle = '#F5E6C8';
  ctx.fillText(`EST. ${est}`, W * cfg.estX, H * cfg.estY);

  return canvas;
}

async function renderSized(cfg, name, est, size) {
  const pubCanvas = await renderFull(cfg, name, est);
  const pubW = pubCanvas.width;
  const pubH = pubCanvas.height;

  const { w: OUT_W, h: OUT_H } = size;
  const canvas = createCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  const PADDING = 0.06;
  const maxW = OUT_W * (1 - PADDING * 2);
  const maxH = OUT_H * (1 - PADDING * 2) - 60;

  const scale = Math.min(maxW / pubW, maxH / pubH);
  const drawW = pubW * scale;
  const drawH = pubH * scale;

  const drawX = (OUT_W - drawW) / 2;
  const drawY = (OUT_H - drawH) / 2 - 20;

  ctx.drawImage(pubCanvas, drawX, drawY, drawW, drawH);

  const wmSize = Math.round(OUT_W * 0.028);
  ctx.font = `${wmSize}px "Vast Shadow"`;
  ctx.fillStyle = 'rgba(245, 230, 200, 0.45)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(WATERMARK, OUT_W / 2, OUT_H - Math.round(OUT_H * 0.025));

  return canvas;
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const name    = (req.query.name  || 'KELLY').toUpperCase();
    const style   = (req.query.style || 'city').toLowerCase();
    const est     = req.query.est  || '1845';
    const sizeKey = (req.query.size || 'full').toLowerCase();

    const cfg = STYLES[style];
    if (!cfg) return res.status(400).json({ error: 'style must be: city | seaside' });
    if (!(sizeKey in SIZES)) return res.status(400).json({ error: 'size must be: full | social | story | square' });

    const size = SIZES[sizeKey];
    const canvas = size
      ? await renderSized(cfg, name, est, size)
      : await renderFull(cfg, name, est);

    const filename = `${name.toLowerCase()}-${style}-${sizeKey}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    canvas.createPNGStream().pipe(res);

  } catch (err) {
    console.error('Admin render error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Print dimensions at 300dpi
// A4: 2480x3508, A3: 3508x4961, A2: 4961x7016
// Our master PSD is 3600x4800 — closest to A3
// We'll generate at 3600x4800 and let Gelato handle final sizing

const PUB_CONFIG = {
  city: {
    imageFile: 'City_Pub.png',
    // Fascia — exact coords from Emmet (3600x4800 canvas)
    fasciaX: 0.5067,
    fasciaY: 0.596,
    fasciaMaxWidth: 0.586,
    fasciaFontSize: 0.058,
    fasciaColor: '#E8C96A',
    // Est plate
    estX: 0.5039,
    estY: 0.652,
    estFontSize: 0.019,
    estColor: '#E8C96A',
  },
  seaside: {
    imageFile: 'Sea_Side.png',
    fasciaX: 0.4917,
    fasciaY: 0.497,
    fasciaMaxWidth: 0.494,
    fasciaFontSize: 0.044,
    fasciaColor: '#1C3A48',
    estX: 0.556,
    estY: 0.5403,
    estFontSize: 0.016,
    estColor: '#3A5A6A',
  }
};

// Generates a personalised pub image and returns a publicly accessible URL
// In production: uploads to S3/Cloudflare R2 and returns the URL
// For now: saves locally and serves via express static
async function generatePrintImage({ surname, est, pub, size }) {
  const cfg = PUB_CONFIG[pub];
  const canvasW = 3600;
  const canvasH = 4800;

  const displayName = surname.toUpperCase().endsWith("'S") || surname.toUpperCase().endsWith('S')
    ? surname.toUpperCase()
    : surname.toUpperCase() + "'S";

  const estText = est || '';

  // Font sizes scaled to full resolution canvas
  const fasciaFontPx = Math.round(cfg.fasciaFontSize * canvasW);
  const estFontPx = Math.round(cfg.estFontSize * canvasW);

  // Calculate auto-shrink for long names
  let actualFontSize = fasciaFontPx;
  if (displayName.length > 12) actualFontSize = Math.round(fasciaFontPx * 0.72);
  else if (displayName.length > 9) actualFontSize = Math.round(fasciaFontPx * 0.86);

  // Pixel coordinates
  const fasciaX = Math.round(cfg.fasciaX * canvasW);
  const fasciaY = Math.round(cfg.fasciaY * canvasH);
  const estX = Math.round(cfg.estX * canvasW);
  const estY = Math.round(cfg.estY * canvasH);
  const maxW = Math.round(cfg.fasciaMaxWidth * canvasW);

  // Output filename
  const outputFilename = `print_${Date.now()}_${pub}_${surname.replace(/[^a-zA-Z]/g, '')}.png`;
  const outputPath = path.join(__dirname, '../public/generated', outputFilename);

  // Ensure output directory exists
  fs.mkdirSync(path.join(__dirname, '../public/generated'), { recursive: true });

  // Source image path
  const sourcePath = path.join(__dirname, '../assets', cfg.imageFile);

  // Generate image using Python + Pillow (more reliable than node-canvas in production)
  // This script is generated and executed server-side
  const pythonScript = `
from PIL import Image, ImageDraw, ImageFont
import textwrap, os

img = Image.open("${sourcePath}").convert("RGBA")
draw = ImageDraw.Draw(img)

canvas_w, canvas_h = ${canvasW}, ${canvasH}

# Try to load Vast Shadow font, fall back to default
try:
    font_path = "${path.join(__dirname, '../assets/fonts/VastShadow-Regular.ttf')}"
    font_name = ImageFont.truetype(font_path, ${actualFontSize})
    font_est = ImageFont.truetype(font_path, ${estFontPx})
except:
    font_name = ImageFont.load_default()
    font_est = ImageFont.load_default()

# Draw surname on fascia
name_color = "${cfg.fasciaColor}"
bbox = draw.textbbox((0, 0), "${displayName}", font=font_name)
text_w = bbox[2] - bbox[0]
x = ${fasciaX} - text_w // 2
draw.text((x, ${fasciaY} - (bbox[3] - bbox[1]) // 2), "${displayName}", fill=name_color, font=font_name)

# Draw est year if provided
if "${estText}":
    est_color = "${cfg.estColor}"
    est_bbox = draw.textbbox((0, 0), "${estText}", font=font_est)
    est_w = est_bbox[2] - est_bbox[0]
    ex = ${estX} - est_w // 2
    draw.text((ex, ${estY} - (est_bbox[3] - est_bbox[1]) // 2), "${estText}", fill=est_color, font=font_est)

# Save as RGB PNG
img.convert("RGB").save("${outputPath}", "PNG", dpi=(300, 300))
print("OK")
`;

  const scriptPath = `/tmp/gen_${Date.now()}.py`;
  fs.writeFileSync(scriptPath, pythonScript);

  try {
    const result = execSync(`python3 ${scriptPath}`, { timeout: 30000 }).toString().trim();
    if (result !== 'OK') throw new Error('Image generation failed: ' + result);
  } finally {
    fs.unlinkSync(scriptPath);
  }

  // Return public URL
  const publicUrl = `${process.env.BASE_URL}/generated/${outputFilename}`;
  return publicUrl;
}

module.exports = { generatePrintImage };

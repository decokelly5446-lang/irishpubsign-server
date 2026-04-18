const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const PUB_CONFIG = {
  city: {
    imageUrl: 'https://pub-631a8059a22f4421be19fe52ea93b20e.r2.dev/CITY.png',
    fasciaX: 0.5071, fasciaY: 0.5991, fasciaMaxWidth: 0.6135,
    fasciaFontSize: 0.058, fasciaColor: '#E8C96A',
    estX: 0.5051, estY: 0.6557, estFontSize: 0.019, estColor: '#E8C96A',
  },
  seaside: {
    imageUrl: 'https://pub-631a8059a22f4421be19fe52ea93b20e.r2.dev/SEASIDE.png',
    fasciaX: 0.4957, fasciaY: 0.528, fasciaMaxWidth: 0.5000,
    fasciaFontSize: 0.044, fasciaColor: '#1C3A48',
    estX: 0.5630, estY: 0.5547, estFontSize: 0.016, estColor: '#3A5A6A',
  }
};

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function uploadToR2(filePath, filename) {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY;
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  const uploadScript = `
import boto3
from botocore.config import Config

s3 = boto3.client(
    's3',
    endpoint_url='${endpoint}',
    aws_access_key_id='${accessKey}',
    aws_secret_access_key='${secretKey}',
    config=Config(signature_version='s3v4'),
    region_name='auto'
)
s3.upload_file('${filePath}', '${bucket}', '${filename}', ExtraArgs={'ContentType': 'image/png'})
print('UPLOADED')
`;

  const scriptPath = `/tmp/upload_${Date.now()}.py`;
  fs.writeFileSync(scriptPath, uploadScript);
  try {
    const result = execSync(`python3 ${scriptPath}`, { timeout: 60000 }).toString().trim();
    if (!result.includes('UPLOADED')) throw new Error('Upload failed: ' + result);
    return `${publicUrl}/${filename}`;
  } finally {
    try { fs.unlinkSync(scriptPath); } catch(e) {}
  }
}

async function generatePrintImage({ surname, est, pub, size }) {
  const cfg = PUB_CONFIG[pub];
  const canvasW = 3508;
  const canvasH = 4961;

  const displayName = surname.toUpperCase().endsWith("'S") || surname.toUpperCase().endsWith('S')
    ? surname.toUpperCase()
    : surname.toUpperCase() + "'S";

  const estText = est || '';
  const fasciaFontPx = Math.round(cfg.fasciaFontSize * canvasW);
  const estFontPx = Math.round(cfg.estFontSize * canvasW);

  let actualFontSize = fasciaFontPx;
  if (displayName.length > 12) actualFontSize = Math.round(fasciaFontPx * 0.72);
  else if (displayName.length > 9) actualFontSize = Math.round(fasciaFontPx * 0.86);

  const fasciaX = Math.round(cfg.fasciaX * canvasW);
  const fasciaY = Math.round(cfg.fasciaY * canvasH);
  const estX = Math.round(cfg.estX * canvasW);
  const estY = Math.round(cfg.estY * canvasH);

  const tmpDir = '/tmp';
  const sourceImagePath = path.join(tmpDir, `source_${pub}_${Date.now()}.png`);
  const outputFilename = `print_${Date.now()}_${pub}_${surname.replace(/[^a-zA-Z]/g, '')}.png`;
  const outputPath = path.join(tmpDir, outputFilename);
  const fontPath = path.join(__dirname, '../assets/fonts/VastShadow-Regular.ttf');

  console.log(`Downloading source image for ${pub} pub...`);
  await downloadFile(cfg.imageUrl, sourceImagePath);

  const pythonScript = `
from PIL import Image, ImageDraw, ImageFont
import sys

try:
    img = Image.open("${sourceImagePath}").convert("RGBA")
    draw = ImageDraw.Draw(img)

    try:
        font_name = ImageFont.truetype("${fontPath}", ${actualFontSize})
        font_est  = ImageFont.truetype("${fontPath}", ${estFontPx})
    except Exception as e:
        print(f"Font load failed: {e}, using default", file=sys.stderr)
        font_name = ImageFont.load_default()
        font_est  = ImageFont.load_default()

    name_color = "${cfg.fasciaColor}"
    bbox = draw.textbbox((0, 0), "${displayName}", font=font_name)
    x = ${fasciaX} - (bbox[2] - bbox[0]) // 2
    y = ${fasciaY} - (bbox[3] - bbox[1]) // 2
    draw.text((x, y), "${displayName}", fill=name_color, font=font_name)

    est_text = "${estText}"
    if est_text:
        est_color = "${cfg.estColor}"
        est_bbox = draw.textbbox((0, 0), est_text, font=font_est)
        ex = ${estX} - (est_bbox[2] - est_bbox[0]) // 2
        ey = ${estY} - (est_bbox[3] - est_bbox[1]) // 2
        draw.text((ex, ey), est_text, fill=est_color, font=font_est)

    img.convert("RGB").save("${outputPath}", "PNG", dpi=(300, 300))
    print("OK")

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
`;

  const scriptPath = `/tmp/gen_${Date.now()}.py`;
  fs.writeFileSync(scriptPath, pythonScript);

  try {
    console.log('Generating personalised image...');
    const result = execSync(`python3 ${scriptPath}`, { timeout: 120000 }).toString().trim();
    if (!result.includes('OK')) throw new Error('Image generation failed: ' + result);
    console.log('Image generated.');
  } finally {
    try { fs.unlinkSync(scriptPath); } catch(e) {}
    try { fs.unlinkSync(sourceImagePath); } catch(e) {}
  }

  console.log('Uploading to R2...');
  const publicUrl = await uploadToR2(outputPath, outputFilename);
  try { fs.unlinkSync(outputPath); } catch(e) {}

  console.log('Done:', publicUrl);
  return publicUrl;
}

module.exports = { generatePrintImage };

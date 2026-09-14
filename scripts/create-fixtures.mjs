import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const destination = new URL('../tests/fixtures/images/', import.meta.url);
await mkdir(destination, { recursive: true });
const manifest = [];

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, body, checksum]);
}

async function png(name, width, height, depth, type, transparency) {
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const rowBytes = Math.ceil(width * channels * depth / 8);
  const rows = Buffer.alloc((rowBytes + 1) * height);
  const maximum = 2 ** depth - 1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    for (let c = 0; c < channels; c++) {
      const value = type === 3 ? x % 4 : Math.round(((x + y + c * 5) % 17) * maximum / 16);
      const row = y * (rowBytes + 1) + 1;
      const sample = x * channels + c;
      if (depth < 8) rows[row + Math.floor(sample * depth / 8)] |= value << (8 - depth - (sample * depth) % 8);
      else if (depth === 8) rows[row + sample] = value;
      else rows.writeUInt16BE(value, row + sample * 2);
    }
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header[8] = depth; header[9] = type;
  const pieces = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header)];
  if (type === 3) pieces.push(chunk('PLTE', Buffer.from([0, 0, 0, 255, 0, 0, 0, 255, 0, 255, 255, 255])));
  if (transparency) pieces.push(chunk('tRNS', type === 3 ? Buffer.from([0, 128, 255, 255]) : Buffer.from([0, 0])));
  pieces.push(chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)));
  await writeFile(new URL(name, destination), Buffer.concat(pieces));
  const alpha = type === 4 || type === 6;
  manifest.push({ name, format: 'PNG', width, height, colorBits: (channels - Number(alpha)) * depth,
    alphaBits: alpha ? depth : 0, transparency: alpha ? 'alpha' : transparency ? (type === 3 ? 'palette' : 'key') : 'none' });
}

await png('gray-1bit.png', 17, 13, 1, 0);
await png('gray-16bit.png', 17, 13, 16, 0);
await png('gray-key.png', 17, 13, 8, 0, true);
await png('gray-alpha.png', 17, 13, 8, 4);
await png('palette-2bit.png', 17, 13, 2, 3);
await png('palette-transparent.png', 17, 13, 2, 3, true);
await png('rgb-16bit.png', 17, 13, 16, 2);
await png('rgba-16bit.png', 17, 13, 16, 6);
await png('one-pixel.png', 1, 1, 8, 2);
await png('wide.png', 3072, 1, 8, 2);
await png('tall.png', 1, 3072, 8, 2);
await png('large-4k.png', 3840, 2160, 8, 2);

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
try {
  const page = await browser.newPage();
  for (const [name, width, height] of [['small.jpg', 120, 80], ['large-4k.jpg', 3840, 2160]]) {
    const base64 = await page.evaluate(({ width, height }) => {
      // This callback executes inside Chromium.
      // eslint-disable-next-line no-undef
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#256f4d'); gradient.addColorStop(1, '#e6ac4d');
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    }, { width, height });
    const bytes = Buffer.from(base64, 'base64');
    await writeFile(new URL(name, destination), bytes);
    manifest.push({ name, format: 'JPEG', width, height, colorBits: 24, alphaBits: 0, transparency: 'none' });
    if (name === 'small.jpg') {
      const exif = Buffer.from([255, 225, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0,
        1, 0, 18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0]);
      await writeFile(new URL('rotated-exif.jpg', destination), Buffer.concat([bytes.subarray(0, 2), exif, bytes.subarray(2)]));
      manifest.push({ name: 'rotated-exif.jpg', format: 'JPEG', width, height, colorBits: 24, alphaBits: 0,
        transparency: 'none', displayWidth: height, displayHeight: width });
    }
  }
} finally { await browser.close(); }
await writeFile(new URL('manifest.json', destination), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Created ${manifest.length} test images`);

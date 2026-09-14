import { test, expect } from '@playwright/test';
import { deflateSync } from 'node:zlib';

function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}

/** Synthetic images with known pixels; no image-processing dependency. */
function png(width: number, height: number, alpha = false) {
  const channels = alpha ? 4 : 3;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = alpha ? 6 : 2;
  const rows = Buffer.alloc(height * (1 + width * channels));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = y * (1 + width * channels) + 1 + x * channels;
    rows[at] = 230; rows[at + 1] = x % 256; rows[at + 2] = y % 256;
    if (alpha) rows[at + 3] = x % 2 === 0 ? 0 : 255;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

test('empty state, source depth, actual pixels, repeat loading and corrupt input', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Начать с изображения' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  const input = page.getByLabel('Выбрать изображение', { exact: true });
  const file = { name: 'renamed.jpg', mimeType: 'image/jpeg', buffer: png(64, 32) };
  await input.setInputFiles(file);
  const status = page.getByLabel('Сведения об исходном изображении');
  await expect(status).toContainText('PNG');
  await expect(status).toContainText('Ширина: 64 px');
  await expect(status).toContainText('Высота: 32 px');
  await expect(status).toContainText('Глубина цвета: 24 бит');
  await expect(status).not.toContainText('Альфа-канал');
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
    Array.from(canvas.getContext('2d')!.getImageData(1, 1, 1, 1).data))).toEqual([230, 1, 1, 255]);
  await input.setInputFiles(file);
  await expect(status).toContainText('Ширина: 64 px');
  await input.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not png') });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(status).toContainText('Ширина: 64 px');
  await input.setInputFiles({ name: 'transparent.png', mimeType: 'image/png', buffer: png(20, 10, true) });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(status).toContainText('Альфа-канал: 8 бит');
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
    canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data[3])).toBe(0);
  expect(errors).toEqual([]);
});

test('large image fits viewport without changing its pixels; 100% scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({
    name: 'large.png', mimeType: 'image/png', buffer: png(2500, 1600),
  });
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('width', '2500');
  expect((await canvas.boundingBox())!.width).toBeLessThan(1280);
  await page.getByRole('button', { name: '100%', exact: true }).click();
  expect((await canvas.boundingBox())!.width).toBe(2500);
  expect(await page.locator('.viewport').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Вписать', exact: true }).click();
  await page.setViewportSize({ width: 360, height: 740 });
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThan(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByLabel('Сведения об исходном изображении')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile.png' });
});

test('JPEG decoded through the browser, no fictitious alpha', async ({ page }) => {
  await page.goto('/');
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
    const context = canvas.getContext('2d')!; context.fillStyle = '#ba673b'; context.fillRect(0, 0, 120, 80);
    return canvas.toDataURL('image/jpeg').split(',')[1]!;
  });
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({
    name: 'photo.jpeg', mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64'),
  });
  const status = page.getByLabel('Сведения об исходном изображении');
  await expect(status).toContainText('JPEG');
  await expect(status).toContainText('Глубина цвета: 24 бит');
  await expect(status).not.toContainText('Альфа-канал');
  await expect(page.locator('canvas')).toHaveAttribute('width', '120');
  await page.screenshot({ path: 'test-results/desktop.png' });
});

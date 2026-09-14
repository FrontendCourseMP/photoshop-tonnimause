import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { readMetadata } from '../../src/image/metadata';
import { decodeGb7 } from '../../src/image/gb7';

function gb7(mask = true) {
  // 2 rows of 2 pixels: transparent white, opaque black, opaque middle gray, opaque white.
  return Buffer.from([71, 66, 55, 29, 1, mask ? 1 : 0, 0, 2, 0, 2, 0, 0,
    ...(mask ? [127, 128, 192, 255] : [0, 1, 64, 127])]);
}

async function sourceFile(page: Page, format: 'png' | 'jpg' | 'gb7') {
  if (format === 'gb7') return gb7();
  const encoded = await page.evaluate(format => {
    const canvas = document.createElement('canvas'); canvas.width = 24; canvas.height = 16;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#48ae63'; context.fillRect(0, 0, 12, 16);
    context.fillStyle = 'rgba(100, 20, 220, 0.5)'; context.fillRect(12, 0, 6, 16);
    return canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png').split(',')[1]!;
  }, format);
  return Buffer.from(encoded, 'base64');
}

async function save(page: Page, format: string, mask?: boolean) {
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByLabel('Формат файла').selectOption(format);
  if (mask !== undefined) await page.getByLabel('Сохранить бинарную маску').setChecked(mask);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  const buffer = await readFile(path!);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  return { buffer, name: download.suggestedFilename() };
}

for (const input of ['png', 'jpg', 'gb7'] as const) for (const output of ['png', 'jpg', 'gb7'] as const) {
  test(`${input} -> ${output} downloaded and reopened`, async ({ page }) => {
    await page.goto('/');
    const buffer = await sourceFile(page, input);
    const expectedWidth = input === 'gb7' ? 2 : 24;
    const fileInput = page.getByLabel('Выбрать изображение', { exact: true });
    await fileInput.setInputFiles({ name: `sample.${input}`, mimeType: 'application/octet-stream', buffer });
    const status = page.getByLabel('Сведения об исходном изображении');
    await expect(status).toContainText(`Ширина: ${expectedWidth} px`);
    const before = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
      Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
    // Saving from the fitted/100% view must not resize the exported raster.
    await page.getByRole('button', { name: '100%', exact: true }).click();
    const result = await save(page, output);
    expect(result.name).toBe(`sample.${output}`);
    expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
      Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data))).toEqual(before);
    const metadata = readMetadata(result.buffer.buffer.slice(result.buffer.byteOffset, result.buffer.byteOffset + result.buffer.byteLength) as ArrayBuffer);
    expect(metadata.width).toBe(expectedWidth);
    await fileInput.setInputFiles({ name: result.name, mimeType: 'application/octet-stream', buffer: result.buffer });
    await expect(status).toContainText(output === 'jpg' ? 'JPEG' : output.toUpperCase());
    await expect(page.locator('canvas')).toHaveAttribute('width', String(expectedWidth));
    if (output === 'png') {
      expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
        Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data))).toEqual(before);
    }
    if (output === 'jpg') await expect(status).not.toContainText('Альфа-канал');
    if (output === 'gb7') await expect(status).toContainText('Глубина цвета: 7 бит');
  });
}

test('mask label and all GB7 bytes survive reopening including hidden gray', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'mask.gb7', mimeType: 'application/octet-stream', buffer: gb7() });
  const status = page.getByLabel('Сведения об исходном изображении');
  await expect(status).toContainText('Маска: 1 бит');
  await expect(status).not.toContainText('Альфа-канал');
  const result = await save(page, 'gb7');
  expect(result.buffer).toEqual(gb7());
  const flat = await save(page, 'gb7', false);
  expect(flat.buffer[5]).toBe(0);
  expect(flat.buffer[12]).toBe(127);
  expect(decodeGb7(flat.buffer.buffer.slice(flat.buffer.byteOffset, flat.buffer.byteOffset + flat.buffer.byteLength) as ArrayBuffer).source.transparency).toBe('none');
});

test('JPEG export fills transparent pixels with white', async ({ page }) => {
  await page.goto('/');
  // Entirely transparent image, avoiding JPEG ringing at opaque boundaries.
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    return c.toDataURL('image/png').split(',')[1]!;
  });
  const input = page.getByLabel('Выбрать изображение', { exact: true });
  await input.setInputFiles({ name: 'clear.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  const jpg = await save(page, 'jpg');
  await input.setInputFiles({ name: jpg.name, mimeType: 'image/jpeg', buffer: jpg.buffer });
  await expect(page.getByLabel('Сведения об исходном изображении')).toContainText('JPEG');
  expect(await page.locator('canvas').evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(8, 8, 1, 1).data)))
    .toEqual([255, 255, 255, 255]);
});

test('dialog is keyboard accessible and fits on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled();
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'test.gb7', mimeType: 'application/octet-stream', buffer: gb7(false) });
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByLabel('Формат файла').selectOption('gb7');
  await expect(page.getByLabel('Сохранить бинарную маску')).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Скачать файл' })).toBeInViewport();
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds!.width).toBeLessThan(360);
  await page.screenshot({ path: 'test-results/export-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeFocused();
});

test('bad GB7 does not replace the open image and encoding failure stays in the dialog', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('Выбрать изображение', { exact: true });
  await input.setInputFiles({ name: 'test.gb7', mimeType: 'application/octet-stream', buffer: gb7() });
  await expect(page.locator('canvas')).toHaveAttribute('width', '2');
  const bad = gb7(); bad[4] = 2;
  await input.setInputFiles({ name: 'broken.gb7', mimeType: 'application/octet-stream', buffer: bad });
  await expect(page.getByRole('alert')).toContainText('версия 1');
  await expect(page.locator('canvas')).toHaveAttribute('width', '2');
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); }; });
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('не смог сохранить');
  await expect(page.getByRole('button', { name: 'Скачать файл', exact: true })).toBeEnabled();
});

for (const sample of [
  { name: 'vertical-kapibara.gb7', width: 1080, height: 1920, transparent: 0 },
  { name: 'kapibara-mask.gb7', width: 1200, height: 1010, transparent: 1185636 },
  { name: 'gradient-half-mask.gb7', width: 32, height: 32, transparent: 512 },
]) {
  test(`provided sample ${sample.name} displays and downloads unchanged`, async ({ page }) => {
    const original = await readFile(new URL(`../fixtures/gb7/${sample.name}`, import.meta.url));
    await page.goto('/');
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({
      name: sample.name, mimeType: 'application/octet-stream', buffer: original,
    });
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('width', String(sample.width));
    await expect(canvas).toHaveAttribute('height', String(sample.height));
    expect(await canvas.evaluate((canvas: HTMLCanvasElement) => {
      const bytes = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let at = 3; at < bytes.length; at += 4) if (bytes[at] === 0) count++;
      return count;
    })).toBe(sample.transparent);
    const status = page.getByLabel('Сведения об исходном изображении');
    await expect(status).not.toContainText('Альфа-канал');
    if (sample.transparent) await expect(status).toContainText('Маска: 1 бит');
    else await expect(status).not.toContainText('Маска');
    await page.screenshot({ path: `test-results/${sample.name}.png` });
    const result = await save(page, 'gb7');
    expect(result.name).toBe(sample.name);
    expect(result.buffer.equals(original)).toBe(true);
  });
}

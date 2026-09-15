import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

for (const viewport of [{ width: 320, height: 568 }, { width: 640, height: 360 }, { width: 1440, height: 900 }]) {
  test(`channels and pipette together at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/rgba-16bit.png'));
    await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
    const canvas = page.locator('canvas');
    await canvas.click();
    const info = page.getByLabel('Исходный цвет пикселя');
    const sampled = await info.textContent();
    for (const channel of ['Красный', 'Зелёный', 'Синий']) {
      await page.getByRole('complementary').getByRole('button', { name: channel, exact: true }).click();
      await expect(info).toHaveText(sampled!);
    }
    await expect.poll(async () => {
      const box = (await canvas.boundingBox())!;
      return box.width > 0 && box.height > 0;
    }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = (await info.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `test-results/tools-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Скачать файл', exact: true })).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(info).toHaveText(sampled!);
  });
}

test('all sixteen channel combinations preserve original sampling and have exact preview pixels', async ({ page }) => {
  await page.goto('/');
  const base64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 8;
    const ctx = c.getContext('2d')!;
    const pixels = ctx.createImageData(8, 8);
    for (let i = 0; i < pixels.data.length; i += 4) pixels.data.set([80, 120, 200, 255], i);
    ctx.putImageData(pixels, 0, 0);
    return c.toDataURL().split(',')[1]!;
  });
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'rgba.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
  const canvas = page.locator('canvas');
  const names = ['Красный', 'Зелёный', 'Синий', 'Альфа'];
  for (let mask = 0; mask < 16; mask++) {
    for (let channel = 0; channel < 4; channel++) {
      const button = page.getByRole('complementary').getByRole('button', { name: names[channel]!, exact: true });
      if ((await button.getAttribute('aria-pressed') === 'true') !== Boolean(mask & (1 << channel))) await button.click();
    }
    const expected = mask === 8 ? [255, 255, 255, 255] : mask === 0 ? [0, 0, 0, 0]
      : [mask & 1 ? 80 : 0, mask & 2 ? 120 : 0, mask & 4 ? 200 : 0, 255];
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data))).toEqual(expected);
    await canvas.click();
    await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('R: 80 · G: 120 · B: 200');
  }
});

test('pipette selects distinct source pixels after CSS scaling and viewport changes', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/large-4k.png'));
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
  for (const width of [1280, 360, 768]) {
    await page.setViewportSize({ width, height: 800 });
    const canvas = page.locator('canvas');
    // Wait for ResizeObserver and layout before taking the click's geometry.
    await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThan(width);
    for (const fraction of [0.2, 0.7]) {
      const point = await canvas.evaluate((c: HTMLCanvasElement, fraction) => {
        const rect = c.getBoundingClientRect();
        const clientX = Math.floor(rect.left + rect.width * fraction);
        const clientY = Math.floor(rect.top + rect.height * fraction);
        const x = Math.floor((clientX - rect.left) * c.width / rect.width);
        const y = Math.floor((clientY - rect.top) * c.height / rect.height);
        const rgb = Array.from(c.getContext('2d')!.getImageData(x, y, 1, 1).data).slice(0, 3);
        return { clientX, clientY, x, y, rgb };
      }, fraction);
      await page.mouse.click(point.clientX, point.clientY);
      const info = page.getByLabel('Исходный цвет пикселя');
      await expect(info).toContainText(`X: ${point.x} · Y: ${point.y}`);
      await expect(info).toContainText(`R: ${point.rgb[0]} · G: ${point.rgb[1]} · B: ${point.rgb[2]}`);
    }
  }
});

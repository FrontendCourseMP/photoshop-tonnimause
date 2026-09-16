import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
async function zoom(page: Page, percent: number) {
  await page.getByRole('slider', { name: 'Масштаб просмотра' }).evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, percent);
  await expect(page.locator('canvas')).toHaveAttribute('data-zoom', String(percent));
}

test('own interpolation is used for zoom and source dimensions are preserved', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'edge.gb7', mimeType: 'application/octet-stream',
    buffer: Buffer.from([71, 66, 55, 29, 1, 0, 0, 2, 0, 1, 0, 0, 0, 127]) });
  await expect(page.getByLabel('Интерполяция просмотра')).toHaveValue('bilinear');
  await zoom(page, 300);
  await expect(page.locator('canvas')).toHaveAttribute('width', '6');
  const values = () => page.locator('canvas').evaluate((c: HTMLCanvasElement) =>
    Array.from(c.getContext('2d')!.getImageData(0, 0, 6, 1).data).filter((_, i) => i % 4 === 0));
  await expect.poll(values).toEqual([0, 0, 85, 170, 255, 255]);
  await page.getByLabel('Интерполяция просмотра').selectOption('nearest');
  await expect.poll(values).toEqual([0, 0, 0, 255, 255, 255]);
  await expect(page.getByLabel('Сведения об исходном изображении')).toContainText('Ширина: 2 px');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByLabel('Формат файла').selectOption('gb7');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
  const download = await pending;
  expect(Array.from(await readFile((await download.path())!))).toEqual([71, 66, 55, 29, 1, 0, 0, 2, 0, 1, 0, 0, 0, 127]);
  await zoom(page, 12);
  await expect(page.locator('canvas')).toHaveAttribute('width', '1');
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('width', '2');
});

test('fit centers the raster with fifty pixel margins and minimum zoom allows scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/large-4k.png'));
  await expect.poll(() => page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(460);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const margins = await page.locator('.image-surface').evaluate(element => {
    const r = element.getBoundingClientRect(), v = document.querySelector('.viewport')!.getBoundingClientRect();
    return [r.left - v.left, r.top - v.top, v.right - r.right, v.bottom - r.bottom];
  });
  for (const margin of margins) expect(margin).toBeGreaterThanOrEqual(49.5);
  expect(Math.abs(margins[0]! - margins[2]!)).toBeLessThan(1);
  expect(Math.abs(margins[1]! - margins[3]!)).toBeLessThan(1);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('slider', { name: 'Масштаб просмотра' })).toHaveValue('12');
  await expect.poll(() => page.locator('.viewport').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
});

test('4k at 300 percent uses a bounded tile and pipette maps a scrolled location', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/large-4k.png'));
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
  await zoom(page, 300);
  await page.locator('.viewport').evaluate(element => { element.scrollLeft = 6000; element.scrollTop = 3000; });
  await expect.poll(() => page.locator('canvas').evaluate((c: HTMLCanvasElement) => Number.parseFloat(c.style.left))).toBeGreaterThan(5000);
  const point = await page.locator('.image-surface').evaluate(element => {
    const full = element.getBoundingClientRect();
    const viewport = document.querySelector('.viewport')!.getBoundingClientRect();
    const clientX = viewport.left + 100, clientY = viewport.top + 100;
    return { clientX, clientY, x: Math.floor((clientX - full.left) * 3840 / full.width), y: Math.floor((clientY - full.top) * 2160 / full.height) };
  });
  await page.mouse.click(point.clientX, point.clientY);
  await expect(page.getByLabel('Исходный цвет пикселя')).toContainText(`X: ${point.x} · Y: ${point.y}`);
  expect(await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.width * c.height)).toBeLessThan(2_000_000);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/zoom-300-tile.png' });
});

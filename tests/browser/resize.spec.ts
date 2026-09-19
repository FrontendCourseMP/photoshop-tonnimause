import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const bytes = Buffer.from([71, 66, 55, 29, 1, 0, 0, 2, 0, 1, 0, 0, 0, 127]);
async function open(page: Page) {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'edge.gb7', mimeType: 'application/octet-stream', buffer: bytes });
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('width', '2');
  await page.getByRole('button', { name: 'Размер изображения', exact: true }).click();
}
test('linked dimensions, percentage conversion and cancel preserve the source', async ({ page }) => {
  await open(page);
  const width = page.getByRole('spinbutton', { name: 'Новая ширина' });
  const height = page.getByRole('spinbutton', { name: 'Новая высота' });
  await width.fill('8'); await expect(height).toHaveValue('4');
  await height.fill('2'); await expect(width).toHaveValue('4');
  await page.getByLabel('Единицы размера').selectOption('percent');
  await expect(width).toHaveValue('200'); await expect(height).toHaveValue('200');
  await width.fill('150'); await expect(height).toHaveValue('150');
  await expect(page.getByRole('dialog')).toContainText('После: 3 × 2 · 6 пикселей');
  await page.getByLabel('Сохранить пропорции').uncheck();
  await height.fill('100');
  await expect(page.getByRole('dialog')).toContainText('После: 3 × 1');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-source-width', '2');
  await expect(page.getByRole('button', { name: 'Размер изображения', exact: true })).toBeFocused();
});
for (const method of ['bilinear', 'nearest']) {
  test(`${method} resize is committed and exported at current zoom`, async ({ page }) => {
    await open(page);
    await expect(page.getByLabel('Алгоритм изменения размера')).toHaveValue('bilinear');
    await page.getByLabel('Сохранить пропорции').uncheck();
    await page.getByRole('spinbutton', { name: 'Новая ширина' }).fill('4');
    await page.getByLabel('Алгоритм изменения размера').selectOption(method);
    await page.getByRole('button', { name: 'Об алгоритме интерполяции' }).focus();
    await expect(page.getByRole('tooltip')).toContainText(method === 'nearest' ? 'ближайший пиксель' : 'четыре');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Изменить размер', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveAttribute('width', '4');
    await expect(page.getByRole('slider', { name: 'Масштаб просмотра' })).toHaveValue('100');
    await expect.poll(() => page.locator('canvas').evaluate((c: HTMLCanvasElement) =>
      Array.from(c.getContext('2d')!.getImageData(0, 0, 4, 1).data).filter((_, i) => i % 4 === 0)))
      .toEqual(method === 'nearest' ? [0, 0, 255, 255] : [0, 64, 191, 255]);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await page.getByLabel('Формат файла').selectOption('gb7');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
    const result = await readFile((await (await pending).path())!);
    expect(result.readUInt16BE(6)).toBe(4); expect(result.readUInt16BE(8)).toBe(1);
    expect(Array.from(result.subarray(12))).toEqual(method === 'nearest' ? [0, 0, 127, 127] : [0, 32, 95, 127]);
  });
}
test('invalid fields prevent resize and mobile dialog remains accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page);
  const width = page.getByRole('spinbutton', { name: 'Новая ширина' });
  for (const value of ['', '0', '-2', '2.5', '16385']) {
    await width.fill(value);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Изменить размер', exact: true })).toBeDisabled();
  }
  await width.fill('4');
  await expect(page.getByRole('button', { name: 'Изменить размер', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/resize-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

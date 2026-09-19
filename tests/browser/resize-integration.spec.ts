import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { readMetadata } from '../../src/image/metadata';

async function load(page: Page) {
  await page.goto('/');
  const buffer = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 4;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'rgb(20 40 80)'; context.fillRect(0, 0, 8, 4);
    return canvas.toDataURL().split(',')[1]!;
  });
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'solid.png', mimeType: 'image/png', buffer: Buffer.from(buffer, 'base64') });
  await expect(page.locator('canvas')).toHaveAttribute('data-source-width', '8');
}

test('resize retains zoom and channel selection after levels and updates pipette and previews', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Белая точка', exact: true }).fill('128');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await page.getByRole('complementary').getByRole('button', { name: 'Зелёный', exact: true }).click();
  await page.getByRole('slider', { name: 'Масштаб просмотра' }).evaluate((input: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '200');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Размер изображения', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Новая ширина' }).fill('16');
  await page.getByRole('button', { name: 'Изменить размер', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('width', '32');
  await expect(page.locator('canvas')).toHaveAttribute('height', '16');
  await expect(page.getByRole('slider', { name: 'Масштаб просмотра' })).toHaveValue('200');
  await expect(page.getByRole('complementary').getByRole('button', { name: 'Зелёный', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
    Array.from(canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data))).toEqual([40, 0, 159, 255]);
  await expect.poll(() => page.getByAltText('Канал Зелёный').evaluate((image: HTMLImageElement) => {
    const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
    c.getContext('2d')!.drawImage(image, 0, 0);
    return c.getContext('2d')!.getImageData(0, 0, 1, 1).data[0];
  })).toBe(80);
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
  await page.locator('canvas').click({ position: { x: 21, y: 9 } });
  await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('X: 10 · Y: 4');
  await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('R: 40 · G: 80 · B: 159');
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Всего пикселей: 128');
  await page.getByRole('spinbutton', { name: 'Гамма', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-source-width', '16');
});

for (const format of ['png', 'jpg', 'gb7']) {
  test(`repeated resizing exports current dimensions to ${format}`, async ({ page }) => {
    await load(page);
    for (const size of [16, 6]) {
      await page.getByRole('button', { name: 'Размер изображения', exact: true }).click();
      await expect(page.getByRole('spinbutton', { name: 'Новая ширина' })).toHaveValue(size === 16 ? '8' : '16');
      await page.getByLabel('Единицы размера').selectOption('percent');
      await expect(page.getByRole('spinbutton', { name: 'Новая ширина' })).toHaveValue('100');
      await page.getByRole('spinbutton', { name: 'Новая ширина' }).fill(size === 16 ? '200' : '37.5');
      await page.getByRole('button', { name: 'Изменить размер', exact: true }).click();
      await expect(page.locator('canvas')).toHaveAttribute('data-source-width', String(size));
    }
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await page.getByLabel('Формат файла').selectOption(format);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
    const download = await pending;
    const bytes = await readFile((await download.path())!);
    expect(readMetadata(new Uint8Array(bytes).buffer)).toMatchObject({ width: 6, height: 3 });
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/octet-stream', buffer: bytes });
    await expect(page.getByLabel('Сведения об исходном изображении')).toContainText('Ширина: 6 px');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('resize controls remain reachable in a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await load(page);
  await page.getByRole('button', { name: 'Размер изображения', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Изменить размер', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Об алгоритме интерполяции' }).focus();
  await expect(page.getByRole('tooltip')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

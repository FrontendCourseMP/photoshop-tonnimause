import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

async function open(page: Page) {
  await page.goto('/');
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
    const context = canvas.getContext('2d')!;
    const data = context.createImageData(8, 8);
    for (let at = 0; at < data.data.length; at += 4) data.data.set([64, 128, 192, 255], at);
    context.putImageData(data, 0, 0);
    return canvas.toDataURL().split(',')[1]!;
  });
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'levels.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  await expect(page.locator('canvas')).toHaveAttribute('width', '8');
}
const pixel = (page: Page) => page.locator('canvas').evaluate((c: HTMLCanvasElement) =>
  Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data));

test('preview toggles, resets and cancels without cumulative changes', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  const preview = page.getByRole('checkbox', { name: 'Предпросмотр' });
  await expect(preview).toBeChecked();
  await page.getByRole('spinbutton', { name: 'Белая точка', exact: true }).fill('128');
  await expect.poll(() => pixel(page)).toEqual([128, 255, 255, 255]);
  for (let i = 0; i < 3; i++) {
    await preview.uncheck(); await expect.poll(() => pixel(page)).toEqual([64, 128, 192, 255]);
    await preview.check(); await expect.poll(() => pixel(page)).toEqual([128, 255, 255, 255]);
  }
  await page.getByRole('button', { name: 'Сброс', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => pixel(page)).toEqual([64, 128, 192, 255]);
  await page.getByRole('spinbutton', { name: 'Гамма', exact: true }).fill('2');
  await expect.poll(() => pixel(page)).not.toEqual([64, 128, 192, 255]);
  await page.keyboard.press('Escape');
  await expect.poll(() => pixel(page)).toEqual([64, 128, 192, 255]);
  await expect(page.getByRole('button', { name: 'Уровни', exact: true })).toBeFocused();
});

test('apply uses settings with preview off and becomes the next baseline and exported image', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Предпросмотр' }).uncheck();
  await page.getByLabel('Канал коррекции').selectOption('red');
  await page.getByRole('spinbutton', { name: 'Белая точка', exact: true }).fill('128');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([128, 128, 192, 255]);
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
  await page.locator('canvas').click();
  await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('R: 128 · G: 128 · B: 192');
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Белая точка', exact: true })).toHaveValue('255');
  await page.getByRole('spinbutton', { name: 'Гамма', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([128, 128, 192, 255]);
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles((await (await pending).path())!);
  await expect.poll(() => pixel(page)).toEqual([128, 128, 192, 255]);
});

test('alpha levels leave RGB alone and preserve channel visibility after apply', async ({ page }) => {
  await open(page);
  await page.getByRole('complementary').getByRole('button', { name: 'Зелёный', exact: true }).click();
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByLabel('Канал коррекции').selectOption('alpha');
  // Gamma cannot change fully opaque alpha endpoints.
  await page.getByRole('spinbutton', { name: 'Гамма', exact: true }).fill('9.9');
  await expect.poll(() => pixel(page)).toEqual([64, 0, 192, 255]);
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.getByRole('complementary').getByRole('button', { name: 'Зелёный', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => pixel(page)).toEqual([64, 0, 192, 255]);
});

test('alpha midtones change transparency without changing decoded RGB', async ({ page }) => {
  await page.goto('/');
  const base64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 4;
    const context = c.getContext('2d')!;
    context.fillStyle = 'rgba(255, 0, 0, 0.5)'; context.fillRect(0, 0, 4, 4);
    return c.toDataURL().split(',')[1]!;
  });
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'alpha.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
  await expect.poll(() => pixel(page)).toEqual([255, 0, 0, 128]);
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByLabel('Канал коррекции').selectOption('alpha');
  await page.getByRole('spinbutton', { name: 'Гамма', exact: true }).fill('0.5');
  await expect.poll(() => pixel(page)).toEqual([255, 0, 0, 64]);
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([255, 0, 0, 64]);
});

test('4k preview can be cancelled immediately with no delayed correction', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/large-4k.png'));
  await expect(page.locator('canvas')).toHaveAttribute('data-source-width', '3840');
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('width', '3840');
  const before = await pixel(page);
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Чёрная точка', exact: true }).fill('100');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await pixel(page)).toEqual(before);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

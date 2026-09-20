import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('pipette reads original pixel with scaling and scroll and ignores inactive or right clicks', async ({ page }) => {
  await page.goto('/');
  const tool = page.getByRole('button', { name: 'Пипетка', exact: true });
  await expect(tool).toBeDisabled();
  const file = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 2400; c.height = 1600;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgb(255 0 0)'; ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL().split(',')[1]!;
  });
  const input = page.getByLabel('Выбрать изображение', { exact: true });
  await input.setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: Buffer.from(file, 'base64') });
  const canvas = page.locator('canvas');
  await canvas.click();
  const info = page.getByLabel('Исходный цвет пикселя');
  await expect(info).toHaveCount(0);
  await tool.click();
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await expect(info).toContainText('выбрать пиксель');
  await page.getByRole('complementary').getByRole('button', { name: 'Красный', exact: true }).click();
  await canvas.click({ button: 'right' });
  await expect(info).toContainText('выбрать пиксель');
  // Панель информации меняет доступную высоту, поэтому координаты вычисляются заново.
  const click = async () => {
    const bounds = (await canvas.boundingBox())!;
    const viewport = (await page.getByLabel('Область изображения', { exact: true }).boundingBox())!;
    const x = Math.max(bounds.x, viewport.x) + 51;
    const y = Math.max(bounds.y, viewport.y) + 41;
    await page.mouse.click(x, y);
    await expect(info).toContainText(`X: ${Math.floor((x - bounds.x) * 2400 / bounds.width)} · Y: ${Math.floor((y - bounds.y) * 1600 / bounds.height)}`);
    await expect(info).toContainText('R: 255 · G: 0 · B: 0');
    await expect(info).toContainText('L*: 54.29');
  };
  await click();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(canvas).toHaveAttribute('width', '2400');
  await expect(canvas).toHaveAttribute('height', '1600');
  await page.locator('.viewport').evaluate(element => { element.scrollLeft = 750; element.scrollTop = 450; });
  await click();
  await input.setInputFiles(resolve('tests/fixtures/images/small.jpg'));
  await expect(info).toContainText('выбрать пиксель');
});

test('pipette reports hidden GB7 gray rather than alpha-only preview', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'hidden.gb7', mimeType: 'application/octet-stream',
    buffer: Buffer.from([71, 66, 55, 29, 1, 1, 0, 1, 0, 1, 0, 0, 127]) });
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
  await page.getByRole('complementary').getByRole('button', { name: 'Серый', exact: true }).click();
  await page.locator('canvas').click();
  const info = page.getByLabel('Исходный цвет пикселя');
  await expect(info).toContainText('X: 0 · Y: 0');
  await expect(info).toContainText('R: 255 · G: 255 · B: 255');
  await expect(info).toContainText('Прозрачный пиксель');
});

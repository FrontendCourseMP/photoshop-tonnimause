import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('channels affect canvas independently and preserve source for export', async ({ page }) => {
  await page.goto('/');
  const file = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 1;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray([10, 20, 30, 255, 0, 0, 0, 0]), 2, 1), 0, 0);
    return canvas.toDataURL().split(',')[1]!;
  });
  const input = page.getByLabel('Выбрать изображение', { exact: true });
  await input.setInputFiles({ name: 'channels.png', mimeType: 'image/png', buffer: Buffer.from(file, 'base64') });
  const panel = page.getByRole('complementary', { name: 'Панель каналов' });
  await expect(panel.getByRole('button')).toHaveCount(4);
  const pixel = () => page.locator('canvas').evaluate((c: HTMLCanvasElement) =>
    Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data));
  for (const [name, level] of [['Красный', 10], ['Зелёный', 20], ['Синий', 30], ['Альфа', 255]] as const) {
    const preview = await panel.getByAltText(`Канал ${name}`).evaluate((img: HTMLImageElement) => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      return Array.from(c.getContext('2d')!.getImageData(0, 0, 1, 1).data);
    });
    expect(preview).toEqual([level, level, level, 255]);
  }
  await panel.getByRole('button', { name: 'Зелёный', exact: true }).click();
  await expect.poll(pixel).toEqual([10, 0, 30, 255]);
  await panel.getByRole('button', { name: 'Красный', exact: true }).click();
  await panel.getByRole('button', { name: 'Синий', exact: true }).click();
  await expect.poll(pixel).toEqual([255, 255, 255, 255]);
  await panel.getByRole('button', { name: 'Альфа', exact: true }).click();
  await expect.poll(pixel).toEqual([0, 0, 0, 0]);
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
  const download = await pending;
  await input.setInputFiles((await download.path())!);
  await expect.poll(pixel).toEqual([10, 20, 30, 255]);
  for (const button of await panel.getByRole('button').all()) await expect(button).toHaveAttribute('aria-pressed', 'true');
});

for (const [file, count, mask] of [
  ['images/gray-1bit.png', 1, null], ['images/gray-alpha.png', 2, 'Альфа'],
  ['images/small.jpg', 3, null], ['images/rgba-16bit.png', 4, 'Альфа'],
  ['images/palette-transparent.png', 4, 'Прозрачность PNG'],
  ['gb7/gradient-half-mask.gb7', 2, 'Маска GB7'], ['gb7/vertical-kapibara.gb7', 1, null],
] as const) {
  test(`channel composition ${file}`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures', file));
    const panel = page.getByRole('complementary', { name: 'Панель каналов' });
    await expect(panel.getByRole('button')).toHaveCount(count);
    if (mask) await expect(panel.getByRole('button', { name: mask, exact: true })).toBeVisible();
    else await expect(panel.getByRole('button', { name: 'Альфа', exact: true })).toHaveCount(0);
    await panel.getByRole('button').first().focus();
    await page.keyboard.press('Space');
    await expect(panel.getByRole('button').first()).toHaveAttribute('aria-pressed', 'false');
  });
}

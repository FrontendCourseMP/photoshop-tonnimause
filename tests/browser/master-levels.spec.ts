import { expect, test } from '@playwright/test';

for (const [name, rgb, bin] of [
  ['серый', [128, 128, 128], 55], ['красный', [255, 0, 0], 54],
] as const) {
  test(`пороги Master соответствуют гистограмме для цвета ${name}`, async ({ page }) => {
    await page.goto('/');
    const base64 = await page.evaluate(rgb => {
      const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
      const context = canvas.getContext('2d')!;
      context.fillStyle = `rgb(${rgb.join(',')})`; context.fillRect(0, 0, 8, 8);
      return canvas.toDataURL().split(',')[1]!;
    }, rgb);
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'master.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
    const pixel = () => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
      Array.from(canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data));
    await expect.poll(pixel).toEqual([...rgb, 255]);
    await page.getByRole('button', { name: 'Уровни', exact: true }).click();
    await expect(page.locator('.histogram rect').nth(bin)).toHaveAttribute('data-count', '64');
    await page.getByRole('spinbutton', { name: 'Чёрная точка', exact: true }).fill(String(bin));
    await expect.poll(pixel).toEqual([0, 0, 0, 255]);
    const preview = page.getByRole('checkbox', { name: 'Предпросмотр' });
    await preview.uncheck(); await expect.poll(pixel).toEqual([...rgb, 255]);
    await preview.check(); await expect.poll(pixel).toEqual([0, 0, 0, 255]);
    await page.getByLabel('Канал коррекции').selectOption('red');
    await page.getByLabel('Канал коррекции').selectOption('master');
    await expect(page.getByRole('spinbutton', { name: 'Чёрная точка', exact: true })).toHaveValue(String(bin));
    await page.getByRole('button', { name: 'Сброс', exact: true }).click();
    await expect.poll(pixel).toEqual([...rgb, 255]);
    await page.getByRole('spinbutton', { name: 'Белая точка', exact: true }).fill(String(bin));
    await expect.poll(pixel).toEqual([255, 255, 255, 255]);
    await preview.uncheck();
    await page.getByRole('button', { name: 'Применить', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(pixel).toEqual([255, 255, 255, 255]);
    await page.getByRole('button', { name: 'Уровни', exact: true }).click();
    await expect(page.locator('.histogram rect').last()).toHaveAttribute('data-count', '64');
    await page.keyboard.press('Escape');
  });
}

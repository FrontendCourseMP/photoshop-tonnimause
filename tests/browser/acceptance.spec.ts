import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import fixtures from '../fixtures/images/manifest.json' with { type: 'json' };

for (const fixture of fixtures) {
  test(`source metadata and browser decoding of ${fixture.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(
      resolve('tests/fixtures/images', fixture.name));
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-source-width', String(fixture.displayWidth ?? fixture.width));
    await expect(canvas).toHaveAttribute('data-source-height', String(fixture.displayHeight ?? fixture.height));
    const status = page.getByLabel('Сведения об исходном изображении');
    await expect(status).toContainText(`Ширина: ${fixture.width} px`);
    await expect(status).toContainText(`Высота: ${fixture.height} px`);
    await expect(status).toContainText(`Глубина цвета: ${fixture.colorBits} бит`);
    if (fixture.alphaBits) await expect(status).toContainText(`Альфа-канал: ${fixture.alphaBits} бит`);
    else await expect(status).not.toContainText('Альфа-канал:');
    if (fixture.transparency === 'key' || fixture.transparency === 'palette') {
      await expect(status).toContainText('Прозрачность: без альфа-канала');
      expect(await canvas.evaluate((element: HTMLCanvasElement) =>
        element.getContext('2d')!.getImageData(0, 0, 1, 1).data[3])).toBe(0);
    }
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const viewport of [{ width: 320, height: 568 }, { width: 640, height: 360 },
  { width: 768, height: 1024 }, { width: 1920, height: 1080 }]) {
  test(`layout at ${viewport.width} by ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(
      resolve('tests/fixtures/images/large-4k.png'));
    await expect(page.locator('canvas')).toHaveAttribute('data-source-width', '3840');
    await expect(page.getByRole('slider', { name: 'Масштаб просмотра' })).toHaveAttribute('min', '12');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const status = await page.getByLabel('Сведения об исходном изображении').boundingBox();
    expect(status!.y + status!.height).toBeLessThanOrEqual(viewport.height);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const dialog = await page.getByRole('dialog').boundingBox();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.y).toBeGreaterThanOrEqual(0);
    expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `test-results/layout-${viewport.width}.png` });
  });
}

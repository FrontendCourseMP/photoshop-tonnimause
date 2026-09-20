import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

for (const size of [{ width: 320, height: 360 }, { width: 320, height: 568 }, { width: 640, height: 360 }]) {
  test(`холст остаётся доступным с пипеткой при ${size.width} на ${size.height}`, async ({ page }) => {
    await page.setViewportSize(size); await page.goto('/');
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/large-4k.png'));
    await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
    const viewport = page.getByLabel('Область изображения', { exact: true });
    await expect.poll(async () => (await viewport.boundingBox())!.height).toBeGreaterThanOrEqual(140);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(async () => {
      const status = (await page.getByLabel('Сведения об исходном изображении').boundingBox())!;
      return status.y + status.height;
    }).toBeLessThanOrEqual(size.height);
    await page.locator('canvas').click({ position: { x: 15, y: 15 } });
    await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('X:');
    await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });
}

test('близкие маркеры уровней можно захватить мышью по отдельности', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/small.jpg'));
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Чёрная точка', exact: true }).fill('254');
  await page.getByRole('spinbutton', { name: 'Гамма', exact: true }).fill('9.9');
  for (const name of ['Маркер чёрной точки', 'Маркер полутонов', 'Маркер белой точки']) {
    const input = page.getByRole('slider', { name, exact: true });
    const box = (await input.boundingBox())!;
    const value = Number(await input.inputValue());
    const x = box.x + 7 + (box.width - 14) * value / 255, y = box.y + box.height / 2;
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('aria-label'), { x, y })).toBe(name);
  }
  const black = page.getByRole('slider', { name: 'Маркер чёрной точки', exact: true });
  const box = (await black.boundingBox())!;
  await page.mouse.move(box.x + 7 + (box.width - 14) * 254 / 255, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 }); await page.mouse.up();
  await expect.poll(async () => Number(await black.inputValue())).toBeLessThan(200);
});

test('единицы размера переключаются даже с пустым или ошибочным полем', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/small.jpg'));
  await page.getByRole('button', { name: 'Размер изображения', exact: true }).click();
  const width = page.getByRole('spinbutton', { name: 'Новая ширина' });
  const unit = page.getByLabel('Единицы размера');
  await width.fill(''); await unit.selectOption('percent');
  await expect(unit).toHaveValue('percent'); await expect(width).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Изменить размер', exact: true })).toBeDisabled();
  await width.fill('50');
  await expect(page.getByRole('spinbutton', { name: 'Новая высота' })).toHaveValue('50');
  await expect(page.getByRole('button', { name: 'Изменить размер', exact: true })).toBeEnabled();
  await width.fill('-5'); await unit.selectOption('pixels');
  await expect(unit).toHaveValue('pixels');
  await expect(page.getByRole('button', { name: 'Изменить размер', exact: true })).toBeDisabled();
});

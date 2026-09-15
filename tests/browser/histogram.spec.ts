import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('levels dialog histogram switches channels and scale without changing the image', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Уровни', exact: true });
  await expect(button).toBeDisabled();
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/gb7/gradient-half-mask.gb7'));
  const before = await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Уровни' })).toBeVisible();
  await expect(page.locator('.histogram rect')).toHaveCount(128);
  await page.getByLabel('Канал коррекции').selectOption('alpha');
  expect(await page.locator('.histogram rect').first().getAttribute('data-count')).toBe('512');
  expect(await page.locator('.histogram rect').last().getAttribute('data-count')).toBe('512');
  await page.getByLabel('Шкала гистограммы').selectOption('log');
  await expect(page.getByRole('dialog')).toContainText('log(1 + количество пикселей)');
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('button', { name: 'Отмена', exact: true })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  expect(await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(before);
});

import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('input levels persist per channel, constrain values, reset and support keyboard markers', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/rgba-16bit.png'));
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  const black = page.getByRole('spinbutton', { name: 'Чёрная точка', exact: true });
  const white = page.getByRole('spinbutton', { name: 'Белая точка', exact: true });
  const gamma = page.getByRole('spinbutton', { name: 'Гамма', exact: true });
  await black.fill('40'); await white.fill('200'); await gamma.fill('2');
  const channel = page.getByLabel('Канал коррекции');
  await channel.selectOption('red');
  await expect(black).toHaveValue('0');
  await black.fill('10');
  await channel.selectOption('master');
  await expect(black).toHaveValue('40'); await expect(white).toHaveValue('200'); await expect(gamma).toHaveValue('2');
  await black.fill('250'); await expect(black).toHaveValue('199');
  await white.fill('1'); await expect(white).toHaveValue('200');
  await page.getByRole('button', { name: 'Сброс', exact: true }).click();
  await expect(black).toHaveValue('0'); await expect(white).toHaveValue('255'); await expect(gamma).toHaveValue('1');
  await channel.selectOption('red'); await expect(black).toHaveValue('0');
  await page.getByRole('slider', { name: 'Маркер чёрной точки', exact: true }).focus();
  await page.keyboard.press('ArrowRight'); await expect(black).toHaveValue('1');
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.getByRole('button', { name: 'Закрыть', exact: true })).toBeInViewport();
  await page.screenshot({ path: 'test-results/input-levels-mobile.png' });
});

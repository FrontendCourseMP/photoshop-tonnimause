import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const pixel = (page: Page) => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data));

async function open(page: Page) {
  await page.goto('/');
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'rgb(60, 120, 180)'; context.fillRect(0, 0, 8, 8);
    return canvas.toDataURL().split(',')[1]!;
  });
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'filter.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  await expect.poll(() => pixel(page)).toEqual([60, 120, 180, 255]);
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
}

test('предпросмотр фильтра не накапливается а сброс и закрытие возвращают исходное изображение', async ({ page }) => {
  await open(page);
  await page.getByLabel('Коэффициент 2 2').fill('2');
  await expect.poll(() => pixel(page)).toEqual([120, 240, 255, 255]);
  const preview = page.getByRole('checkbox', { name: 'Предпросмотр' });
  await preview.uncheck(); await expect.poll(() => pixel(page)).toEqual([60, 120, 180, 255]);
  await preview.check(); await expect.poll(() => pixel(page)).toEqual([120, 240, 255, 255]);
  await page.getByRole('button', { name: 'Сброс', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => pixel(page)).toEqual([60, 120, 180, 255]);
  await page.getByLabel('Коэффициент 2 2').fill('0');
  await expect.poll(() => pixel(page)).toEqual([0, 0, 0, 0]);
  await page.keyboard.press('Escape');
  await expect.poll(() => pixel(page)).toEqual([60, 120, 180, 255]);
  await expect(page.getByRole('button', { name: 'Фильтры', exact: true })).toBeFocused();
});

test('применение без предпросмотра меняет только выбранный канал и сохраняется в png', async ({ page }) => {
  await open(page);
  await page.getByRole('checkbox', { name: 'Предпросмотр' }).uncheck();
  for (const name of ['Зелёный', 'Синий', 'Альфа']) await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page.getByLabel('Коэффициент 2 2').fill('2');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => pixel(page)).toEqual([120, 120, 180, 255]);
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click(); await page.locator('canvas').click();
  await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('R: 120 · G: 120 · B: 180');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles((await (await download).path())!);
  await expect.poll(() => pixel(page)).toEqual([120, 120, 180, 255]);
});

test('предустановки заполняют сетку а разные края дают правильный результат', async ({ page }) => {
  await open(page);
  await page.getByRole('checkbox', { name: 'Альфа', exact: true }).uncheck();
  await page.getByLabel('Фильтр', { exact: true }).selectOption('box');
  for (const input of await page.getByRole('spinbutton').all()) await expect(input).toHaveValue(String(1 / 9));
  await page.getByLabel('Обработка краёв').selectOption('black');
  await expect.poll(() => pixel(page)).toEqual([27, 53, 80, 255]);
  await page.getByLabel('Обработка краёв').selectOption('white');
  await expect.poll(() => pixel(page)).toEqual([168, 195, 222, 255]);
  await page.getByLabel('Обработка краёв').selectOption('copy');
  await expect.poll(() => pixel(page)).toEqual([60, 120, 180, 255]);
  await page.getByLabel('Фильтр', { exact: true }).selectOption('median');
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await page.getByLabel('Обработка краёв').selectOption('white');
  await expect.poll(() => pixel(page)).toEqual([255, 255, 255, 255]);
});

test('ошибки ввода блокируют применение и отменяют предпросмотр', async ({ page }) => {
  await open(page);
  await page.getByLabel('Коэффициент 2 2').fill('');
  await expect(page.getByRole('alert')).toContainText('9 конечных чисел');
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeDisabled();
  await page.getByLabel('Коэффициент 2 2').fill('1001');
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeDisabled();
  await page.getByLabel('Коэффициент 2 2').fill('1');
  for (const name of ['Красный', 'Зелёный', 'Синий', 'Альфа']) await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await expect(page.getByRole('alert')).toContainText('хотя бы один канал');
  await expect.poll(() => pixel(page)).toEqual([60, 120, 180, 255]);
});

test('jpeg не получает фиктивную альфу а окно доступно на узком экране', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/small.jpg'));
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Альфа', exact: true })).toHaveCount(0);
  const box = await page.getByRole('dialog').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('большой расчёт можно закрыть без позднего применения результата', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/large-4k.png'));
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await page.getByLabel('Фильтр', { exact: true }).selectOption('median');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await expect(page.getByLabel('Фильтр', { exact: true })).toHaveValue('identity');
  await page.keyboard.press('Escape');
});

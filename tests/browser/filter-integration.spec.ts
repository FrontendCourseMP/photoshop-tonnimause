import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readMetadata } from '../../src/image/metadata';

const pixel = (page: Page) => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data));

async function load(page: Page) {
  await page.goto('/');
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 4;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'rgb(20, 40, 80)'; context.fillRect(0, 0, 8, 4);
    return canvas.toDataURL().split(',')[1]!;
  });
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'solid.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  await expect.poll(() => pixel(page)).toEqual([20, 40, 80, 255]);
}

async function doubleRed(page: Page) {
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Предпросмотр' }).uncheck();
  for (const name of ['Зелёный', 'Синий', 'Альфа']) await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page.getByLabel('Коэффициент 2 2').fill('2');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('фильтр работает после уровней и размера сохраняя масштаб каналы и исходные данные пипетки', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Белая точка', exact: true }).fill('128');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await page.getByRole('button', { name: 'Размер изображения', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Новая ширина' }).fill('16');
  await page.getByRole('button', { name: 'Изменить размер', exact: true }).click();
  await page.getByRole('slider', { name: 'Масштаб просмотра' }).fill('200');
  const green = page.getByRole('complementary').getByRole('button', { name: 'Зелёный', exact: true });
  await green.click();
  await doubleRed(page);
  await expect(green).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('canvas')).toHaveAttribute('width', '32');
  await expect(page.locator('canvas')).toHaveAttribute('height', '16');
  await expect.poll(() => pixel(page)).toEqual([80, 0, 159, 255]);
  await page.getByRole('button', { name: 'Пипетка', exact: true }).click();
  await page.locator('canvas').click({ position: { x: 21, y: 9 } });
  await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('X: 10 · Y: 4');
  await expect(page.getByLabel('Исходный цвет пикселя')).toContainText('R: 80 · G: 80 · B: 159');
  await expect.poll(() => page.getByAltText('Канал Красный').evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    return canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data[0];
  })).toBe(80);
  await page.getByRole('button', { name: 'Уровни', exact: true }).click();
  await page.getByLabel('Канал коррекции').selectOption('red');
  await expect(page.locator('.histogram rect').nth(80)).toHaveAttribute('data-count', '128');
  await page.keyboard.press('Escape');
});

for (const format of ['png', 'jpg', 'gb7']) {
  test(`повторная фильтрация сохраняет текущие пиксели в ${format} независимо от видимости каналов`, async ({ page }) => {
    await load(page); await doubleRed(page); await doubleRed(page);
    await expect.poll(() => pixel(page)).toEqual([80, 40, 80, 255]);
    await page.getByRole('complementary').getByRole('button', { name: 'Красный', exact: true }).click();
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await page.getByLabel('Формат файла').selectOption(format);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
    const download = await pending;
    const bytes = await readFile((await download.path())!);
    expect(readMetadata(new Uint8Array(bytes).buffer)).toMatchObject({ width: 8, height: 4 });
    await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/octet-stream', buffer: bytes });
    if (format === 'png') await expect.poll(() => pixel(page)).toEqual([80, 40, 80, 255]);
    else if (format === 'gb7') await expect.poll(() => pixel(page)).toEqual([56, 56, 56, 255]);
    else await expect.poll(async () => {
      const values = await pixel(page);
      return values.slice(0, 3).every((value, index) => Math.abs(value - [80, 40, 80][index]!) <= 3) && values[3] === 255;
    }).toBe(true);
  });
}

test('серый канал gb7 и маска фильтруются независимо', async ({ page }) => {
  await page.goto('/');
  const bytes = Buffer.from([0x47, 0x42, 0x37, 0x1d, 1, 1, 0, 2, 0, 1, 0, 0, 0x94, 0xa8]);
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles({ name: 'gray.gb7', mimeType: 'application/octet-stream', buffer: bytes });
  await expect.poll(() => pixel(page)).toEqual([40, 40, 40, 255]);
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Красный', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Маска GB7', exact: true }).uncheck();
  await page.getByLabel('Коэффициент 2 2').fill('2');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([80, 80, 80, 255]);
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Серый', exact: true }).uncheck();
  await page.getByLabel('Коэффициент 2 2').fill('0');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([0, 0, 0, 0]);
  await page.getByRole('complementary').getByRole('button', { name: 'Маска GB7', exact: true }).click();
  await expect.poll(() => pixel(page)).toEqual([80, 80, 80, 255]);
});

test('закрытие активного worker не меняет скачиваемое изображение', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Выбрать изображение', { exact: true }).setInputFiles(resolve('tests/fixtures/images/large-4k.png'));
  async function save() {
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать файл', exact: true }).click();
    return readFile((await (await pending).path())!);
  }
  const before = await save();
  await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
  await page.getByLabel('Фильтр', { exact: true }).selectOption('median');
  await page.getByRole('button', { name: 'Применить', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Расчёт фильтра' })).toBeVisible();
  await page.keyboard.press('Escape');
  const after = await save();
  expect(after.equals(before)).toBe(true);
});

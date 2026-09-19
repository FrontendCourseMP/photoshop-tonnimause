import { expect, test } from '@playwright/test';

test('real worker matches kernel and median results without detaching the source', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/image/filterClient.ts';
    const { FilterRunner } = await import(path) as typeof import('../../src/image/filterClient');
    const runner = new FilterRunner();
    const source = { width: 1, height: 1, data: new Uint8ClampedArray([90, 20, 40, 128]) };
    const progress: number[] = [];
    const output = await runner.run(source, { mode: 'kernel', kernel: Array(9).fill(1 / 9), channels: ['red'], padding: 'black' }, value => progress.push(value));
    const median = await runner.run(source, { mode: 'median', channels: ['red'], padding: 'white' });
    return { output: Array.from(output.data), median: Array.from(median.data), source: Array.from(source.data), progress };
  });
  expect(result.output).toEqual([10, 20, 40, 128]);
  expect(result.median).toEqual([255, 20, 40, 128]);
  expect(result.source).toEqual([90, 20, 40, 128]);
  expect(result.progress[0]).toBe(0); expect(result.progress.at(-1)).toBe(1);
});

test('large job keeps the window responsive and can be cancelled after progress starts', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/image/filterClient.ts';
    const { FilterRunner } = await import(path) as typeof import('../../src/image/filterClient');
    const runner = new FilterRunner();
    const source = { width: 2048, height: 2048, data: new Uint8ClampedArray(2048 * 2048 * 4).fill(80) };
    let ticks = 0, progress = false;
    const timer = setInterval(() => ticks++, 0);
    const outcome = await runner.run(source, { mode: 'median', channels: ['red', 'green', 'blue'], padding: 'copy' }, fraction => {
      if (fraction > 0 && fraction < 1) { progress = true; runner.cancel(); }
    }).then(() => 'completed', (error: Error) => error.name);
    clearInterval(timer);
    return { outcome, ticks, progress, length: source.data.length, first: source.data[0] };
  });
  expect(result.outcome).toBe('AbortError'); expect(result.progress).toBe(true);
  expect(result.ticks).toBeGreaterThan(0);
  expect(result.length).toBe(2048 * 2048 * 4); expect(result.first).toBe(80);
});

test('replacing a job rejects the previous promise and accepts only the new result', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/image/filterClient.ts';
    const { FilterRunner } = await import(path) as typeof import('../../src/image/filterClient');
    const runner = new FilterRunner();
    const config = { mode: 'median', padding: 'copy', channels: ['red'] } as const;
    const old = runner.run({ width: 1024, height: 1024, data: new Uint8ClampedArray(1024 * 1024 * 4) }, config)
      .then(() => 'completed', (error: Error) => error.name);
    const fresh = await runner.run({ width: 1, height: 1, data: new Uint8ClampedArray([50, 60, 70, 255]) }, config);
    runner.cancel(); runner.cancel();
    return { old: await old, fresh: Array.from(fresh.data) };
  });
  expect(result).toEqual({ old: 'AbortError', fresh: [50, 60, 70, 255] });
});

test('worker validation errors are reported and another job can run afterwards', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/image/filterClient.ts';
    const { FilterRunner } = await import(path) as typeof import('../../src/image/filterClient');
    const runner = new FilterRunner();
    const source = { width: 1, height: 1, data: new Uint8ClampedArray([50, 60, 70, 255]) };
    const failure = await runner.run(source, { mode: 'kernel', kernel: [], channels: ['red'], padding: 'copy' })
      .then(() => '', (error: Error) => error.message);
    const output = await runner.run(source, { mode: 'median', channels: ['red'], padding: 'copy' });
    return { failure, output: Array.from(output.data) };
  });
  expect(result.failure).toContain('9 конечных чисел');
  expect(result.output).toEqual([50, 60, 70, 255]);
});

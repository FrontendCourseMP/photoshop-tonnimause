import type { FilterOptions } from './filters';
import type { FilterRequest, FilterResponse } from './filterProtocol';
import type { Raster } from './types';

/** Один активный расчёт на диалог. Замена или отмена завершает его worker. */
export class FilterRunner {
  private active: { worker: Worker; reject: (reason: Error) => void } | null = null;

  cancel(): void {
    const previous = this.active;
    this.active = null;
    if (previous) {
      previous.worker.terminate();
      previous.reject(new DOMException('Расчёт отменён.', 'AbortError'));
    }
  }

  run(source: Raster, options: FilterOptions, onProgress?: (fraction: number) => void): Promise<Raster> {
    this.cancel();
    return new Promise((resolve, reject) => {
      let worker: Worker;
      try { worker = new Worker(new URL('./filter.worker.ts', import.meta.url), { type: 'module' }); }
      catch { reject(new Error('Не удалось запустить фоновую обработку.')); return; }
      const task = { worker, reject };
      this.active = task;
      const fail = (message: string) => {
        if (this.active !== task) return;
        this.active = null; worker.terminate(); reject(new Error(message));
      };
      worker.onmessage = ({ data }: MessageEvent<FilterResponse>) => {
        if (this.active !== task) return;
        if (data.type === 'progress') onProgress?.(data.total ? data.completed / data.total : 0);
        else if (data.type === 'error') fail(data.message);
        else {
          this.active = null; worker.terminate(); resolve(data.raster);
        }
      };
      worker.onerror = event => { event.preventDefault(); fail('Ошибка фоновой обработки изображения.'); };
      worker.onmessageerror = () => fail('Не удалось получить результат фоновой обработки.');
      try {
        // Передаём копию: буфер документа остаётся доступным в главном потоке.
        worker.postMessage({ source, options } satisfies FilterRequest);
      } catch { fail('Не удалось передать изображение для обработки.'); }
    });
  }
}

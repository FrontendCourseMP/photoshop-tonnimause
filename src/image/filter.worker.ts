import { prepareFilter } from './filters';
import type { FilterRequest, FilterResponse } from './filterProtocol';

// Модуль выполняется только в отдельном worker, не в главном потоке.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<FilterRequest>) => void) | null;
  postMessage: (message: FilterResponse, transfer?: Transferable[]) => void;
};
scope.onmessage = async ({ data: { source, options } }) => {
  try {
    const job = prepareFilter(source, options);
    let row = 0;
    scope.postMessage({ type: 'progress', completed: 0, total: source.height });
    while (row < source.height) {
      const deadline = performance.now() + 12;
      do {
        const end = Math.min(source.height, row + 4);
        job.renderRows(row, end);
        row = end;
      } while (row < source.height && performance.now() < deadline);
      scope.postMessage({ type: 'progress', completed: row, total: source.height });
      if (row < source.height) await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    scope.postMessage({ type: 'result', raster: job.result }, [job.result.data.buffer]);
  } catch (error) {
    scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Не удалось обработать изображение.' });
  }
};

import { useEffect, useMemo, useRef, useState } from 'react';
import { imageChannels, type ChannelId } from '../image/channels';
import { FilterRunner } from '../image/filterClient';
import { kernelPresets, validateKernel, type FilterOptions, type KernelPreset, type Padding } from '../image/filters';
import type { ImageDocument, Raster } from '../image/types';
import { Modal } from './Modal';

export function FilterDialog({ image, onClose, onPreview, onApply }: {
  image: ImageDocument; onClose: () => void; onPreview: (pixels: Raster | null) => void; onApply: (pixels: Raster) => void;
}) {
  const available = useMemo(() => imageChannels(image.source), [image.source]);
  const [preset, setPreset] = useState<KernelPreset | 'custom' | 'median'>('identity');
  const [fields, setFields] = useState(() => kernelPresets.identity.values.map(String));
  const [channels, setChannels] = useState<ChannelId[]>(() => available.map(item => item.id));
  const [padding, setPadding] = useState<Padding>('copy');
  const [preview, setPreview] = useState(true);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [runner] = useState(() => new FilterRunner());
  const [applyRunner] = useState(() => new FilterRunner());
  const revision = useRef(0);
  const parsed = useMemo((): { options?: FilterOptions; error?: string } => {
    if (!channels.length) return { error: 'Выбрать хотя бы один канал.' };
    if (preset === 'median') return { options: { mode: 'median', channels, padding } };
    try {
      const kernel = fields.map(value => value.trim() === '' ? NaN : Number(value));
      validateKernel(kernel);
      return { options: { mode: 'kernel', kernel, channels, padding } };
    } catch (failure) { return { error: (failure as Error).message }; }
  }, [fields, channels, padding, preset]);

  function stop() {
    revision.current++;
    runner.cancel(); applyRunner.cancel();
    setProgress(null); setError(''); setApplying(false);
    onPreview(null);
  }
  function close() { stop(); onClose(); }

  useEffect(() => () => { revision.current++; runner.cancel(); applyRunner.cancel(); }, [runner, applyRunner]);
  useEffect(() => {
    if (!preview || !parsed.options || applying) return;
    const id = revision.current;
    let active = true;
    // Небольшая задержка объединяет быстрый ввод нескольких цифр в один расчёт.
    const timer = setTimeout(() => {
      setProgress(0);
      void runner.run(image.pixels, parsed.options!, value => {
        if (active && id === revision.current) setProgress(value);
      }).then(result => {
        if (active && id === revision.current) { onPreview(result); setProgress(null); }
      }).catch((failure: Error) => {
        if (active && id === revision.current && failure.name !== 'AbortError') {
          setError(failure.message); setProgress(null);
        }
      });
    }, 80);
    return () => { active = false; clearTimeout(timer); runner.cancel(); };
  }, [image, parsed, preview, applying, runner, onPreview]);

  async function apply() {
    if (!parsed.options || applying) return;
    stop();
    const id = revision.current;
    setApplying(true); setProgress(0);
    try {
      const result = await applyRunner.run(image.pixels, parsed.options, value => {
        if (id === revision.current) setProgress(value);
      });
      if (id === revision.current) onApply(result);
    } catch (failure) {
      if (id === revision.current && (failure as Error).name !== 'AbortError') {
        setError((failure as Error).message); setApplying(false); setProgress(null);
      }
    }
  }

  return <Modal title="Фильтры" titleId="filter-title" onClose={close}>
    <fieldset className="filter-settings" disabled={applying}>
      <label className="field-label" htmlFor="filter-preset">Фильтр</label>
      <select id="filter-preset" value={preset} onChange={event => {
        stop();
        const next = event.target.value as KernelPreset | 'median';
        setPreset(next);
        if (next !== 'median') setFields(kernelPresets[next].values.map(String));
      }}>
        {Object.entries(kernelPresets).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
        <option value="median">Медианный 3 × 3</option>
        {preset === 'custom' && <option value="custom" disabled>Пользовательское ядро</option>}
      </select>
      {preset !== 'median' && <>
        <div className="kernel-grid" role="group" aria-label="Ядро 3 на 3">
          {fields.map((value, index) => <input key={index} type="number" min="-1000" max="1000" step="any"
            aria-label={`Коэффициент ${Math.floor(index / 3) + 1} ${index % 3 + 1}`} value={value}
            onChange={event => {
              stop(); setPreset('custom');
              setFields(previous => previous.map((old, at) => at === index ? event.target.value : old));
            }} />)}
        </div>
        <p className="export-hint">Коэффициенты от −1000 до 1000. Ядро не нормируется автоматически. При свёртке оно разворачивается на 180°.</p>
      </>}
      {preset === 'median' && <p className="export-hint">Каждое значение заменяется медианой соседних значений в области 3 × 3.</p>}
      <fieldset className="filter-channels"><legend>Каналы фильтрации</legend>
        {available.map(item => <label className="checkbox-label" key={item.id}>
          <input type="checkbox" checked={channels.includes(item.id)} onChange={event => {
            stop(); setChannels(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id));
          }} />{item.label}</label>)}
      </fieldset>
      <label className="field-label" htmlFor="filter-padding">Обработка краёв</label>
      <select id="filter-padding" value={padding} onChange={event => { stop(); setPadding(event.target.value as Padding); }}>
        <option value="copy">Копирование граничного пикселя</option>
        <option value="black">Заполнение чёрным</option><option value="white">Заполнение белым</option>
      </select>
      <p className="export-hint">За границей изображения чёрный означает 0, белый — 255 для каждого выбранного канала, включая альфу.</p>
      <label className="checkbox-label"><input type="checkbox" checked={preview} onChange={event => {
        stop(); setPreview(event.target.checked);
      }} />Предпросмотр</label>
    </fieldset>
    {progress !== null && <div role="status" className="filter-progress">
      {applying ? 'Применение' : 'Предпросмотр'}: {Math.round(progress * 100)}%
      <progress aria-label="Расчёт фильтра" value={progress} max="1" />
    </div>}
    {(parsed.error || error) && <p role="alert" className="export-error">{parsed.error || error}</p>}
    <div className="dialog-actions filter-actions">
      <button onClick={() => {
        stop(); setPreset('identity'); setFields(kernelPresets.identity.values.map(String));
        setChannels(available.map(item => item.id)); setPadding('copy');
      }}>Сброс</button>
      <button onClick={close}>Закрыть</button>
      <button className="primary" disabled={!parsed.options || applying} onClick={() => void apply()}>Применить</button>
    </div>
  </Modal>;
}

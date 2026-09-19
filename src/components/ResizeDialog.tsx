import { useState } from 'react';
import type { ImageDocument, Raster } from '../image/types';
import { interpolationMethods, resizeRaster, type InterpolationMethod } from '../image/resample';
import { linkedDimension, resizeTarget, type ResizeUnit, type Size } from '../image/resizeOptions';
import { Modal } from './Modal';

export function ResizeDialog({ image, onClose, onApply }: {
  image: ImageDocument; onClose: () => void; onApply: (pixels: Raster) => void;
}) {
  const original = image.pixels;
  const [unit, setUnit] = useState<ResizeUnit>('pixels');
  const [width, setWidth] = useState(String(original.width));
  const [height, setHeight] = useState(String(original.height));
  const [linked, setLinked] = useState(true);
  const [method, setMethod] = useState<InterpolationMethod>('bilinear');
  const [hint, setHint] = useState(false);
  const [failure, setFailure] = useState('');
  let target: Size | null = null, error = '';
  try { target = resizeTarget(original, width, height, unit); }
  catch (problem) { error = problem instanceof Error ? problem.message : 'Проверить размеры.'; }
  const change = (value: string, axis: keyof Size) => {
    setFailure('');
    if (axis === 'width') setWidth(value); else setHeight(value);
    const other = linked ? linkedDimension(original, value, axis, unit) : null;
    if (other !== null) { if (axis === 'width') setHeight(other); else setWidth(other); }
  };
  const switchUnit = (next: ResizeUnit) => {
    if (!target) return;
    setWidth(String(next === 'pixels' ? target.width : Number((target.width * 100 / original.width).toPrecision(12))));
    setHeight(String(next === 'pixels' ? target.height : Number((target.height * 100 / original.height).toPrecision(12))));
    setUnit(next);
  };
  return <Modal title="Изменить размер" titleId="resize-title" onClose={onClose}>
    <form noValidate onSubmit={event => {
      event.preventDefault();
      if (!target) return;
      try { onApply(resizeRaster(original, target.width, target.height, method)); }
      catch (problem) { setFailure(problem instanceof Error ? problem.message : 'Не удалось изменить размер.'); }
    }}>
      <p className="export-hint">До: {original.width} × {original.height} · {original.width * original.height} пикселей · {(original.width * original.height / 1e6).toFixed(3)} Мп</p>
      <p className="export-hint" aria-live="polite">После: {target ? `${target.width} × ${target.height} · ${target.width * target.height} пикселей · ${(target.width * target.height / 1e6).toFixed(3)} Мп` : '—'}</p>
      <label className="field-label" htmlFor="resize-unit">Единицы размера</label>
      <select id="resize-unit" value={unit} onChange={event => switchUnit(event.target.value as ResizeUnit)}>
        <option value="pixels">Пиксели</option><option value="percent">Проценты</option>
      </select>
      <div className="resize-fields">
        <label>Ширина<input type="number" aria-label="Новая ширина" value={width} min={unit === 'pixels' ? 1 : 0.01}
          max={unit === 'pixels' ? 16384 : 10000} step={unit === 'pixels' ? 1 : 'any'} aria-invalid={Boolean(error)}
          onChange={event => change(event.target.value, 'width')} /></label>
        <label>Высота<input type="number" aria-label="Новая высота" value={height} min={unit === 'pixels' ? 1 : 0.01}
          max={unit === 'pixels' ? 16384 : 10000} step={unit === 'pixels' ? 1 : 'any'} aria-invalid={Boolean(error)}
          onChange={event => change(event.target.value, 'height')} /></label>
      </div>
      <label className="checkbox-label"><input type="checkbox" checked={linked} onChange={event => {
        setLinked(event.target.checked);
        if (event.target.checked) { const other = linkedDimension(original, width, 'width', unit); if (other !== null) setHeight(other); }
      }} />Сохранить пропорции</label>
      <label className="field-label" htmlFor="resize-method">Алгоритм изменения размера</label>
      <select id="resize-method" value={method} onChange={event => setMethod(event.target.value as InterpolationMethod)}>
        {Object.entries(interpolationMethods).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
      </select>
      <div className="interpolation-help" onMouseEnter={() => setHint(true)} onMouseLeave={() => setHint(false)}>
        <button type="button" aria-label="Об алгоритме интерполяции" aria-describedby={hint ? 'resize-tooltip' : undefined}
          onFocus={() => setHint(true)} onBlur={() => setHint(false)} onClick={() => setHint(true)}
          onKeyDown={event => { if (event.key === 'Escape' && hint) { event.preventDefault(); event.stopPropagation(); setHint(false); } }}>Об алгоритме</button>
        {hint && <span role="tooltip" id="resize-tooltip">{interpolationMethods[method].description}</span>}
      </div>
      <p className="export-hint">До 24 Мп и 16 384 пикселей по стороне. Проценты отсчитываются от размера при открытии окна. Итог округляется до целого пикселя.</p>
      {(error || failure) && <p className="export-error" role="alert">{error || failure}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>Отмена</button>
        <button className="primary" type="submit" disabled={!target}>Изменить размер</button></div>
    </form>
  </Modal>;
}

import { useLayoutEffect, useRef, useState } from 'react';
import { downloadBlob, downloadName, encodeImage } from '../image/saveImage';
import type { ExportFormat } from '../image/saveImage';
import type { ImageDocument } from '../image/types';

export function ExportDialog({ image, onClose }: { image: ImageDocument; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(90);
  const [includeMask, setIncludeMask] = useState(image.source.transparency !== 'none');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  async function save() {
    setSaving(true); setError('');
    try {
      const blob = await encodeImage(image, { format, quality: quality / 100, includeMask });
      downloadBlob(blob, downloadName(image.name, format));
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось сохранить файл.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="export-dialog" aria-labelledby="export-title"
      onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <h2 id="export-title">Сохранить изображение</h2>
        <p className="export-source">{image.pixels.width} × {image.pixels.height} px · исходное изображение</p>
        <fieldset disabled={saving}>
          <label className="field-label" htmlFor="export-format">Формат файла</label>
          <select id="export-format" value={format} onChange={event => setFormat(event.target.value as ExportFormat)}>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="gb7">GB7</option>
          </select>
          {format === 'png' && <p className="export-hint">Сохранение без потерь из текущих пикселей. Прозрачность сохраняется.</p>}
          {format === 'jpg' && <>
            <label className="field-label" htmlFor="export-quality">Качество JPG: {quality}%</label>
            <input id="export-quality" type="range" min="1" max="100" value={quality}
              onChange={event => setQuality(Number(event.target.value))} />
            <p className="export-hint">Сжатие с потерями. Прозрачные участки будут объединены с белым фоном.</p>
          </>}
          {format === 'gb7' && <>
            <p className="export-hint">Изображение будет переведено в 128 оттенков серого.</p>
            <label className="checkbox-label"><input type="checkbox" checked={includeMask}
              onChange={event => setIncludeMask(event.target.checked)} />Сохранить бинарную маску</label>
            <p className="export-hint">{includeMask
              ? 'Альфа меньше 128 станет прозрачной, от 128 — непрозрачной. Плавные переходы прозрачности не сохраняются.'
              : 'Прозрачные участки будут объединены с белым фоном.'}</p>
          </>}
          {format !== 'gb7' && image.source.bitsPerSample > 8 && <p className="export-hint">
            Браузер преобразовал исходные {image.source.bitsPerSample} бит в 8 бит на компоненту. Файл сохранится с этой разрядностью.
          </p>}
        </fieldset>
        <p className="export-name">Файл: <strong>{downloadName(image.name, format)}</strong></p>
        {error && <p className="export-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" disabled={saving} onClick={onClose}>Отмена</button>
          <button className="primary" disabled={saving} type="submit">{saving ? 'Сохранение…' : 'Скачать файл'}</button>
        </div>
      </form>
    </dialog>
  );
}

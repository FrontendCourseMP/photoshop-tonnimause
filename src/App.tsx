import { useRef, useState } from 'react';
import { ImageWorkspace } from './components/ImageWorkspace';
import { ExportDialog } from './components/ExportDialog';
import { LevelsDialog } from './components/LevelsDialog';
import { PixelInfo } from './components/PixelInfo';
import type { PixelSample } from './image/pipette';
import { openImage } from './image/openImage';
import type { ImageDocument, Raster } from './image/types';

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const [image, setImage] = useState<ImageDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fit, setFit] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [levelsPreview, setLevelsPreview] = useState<Raster | null>(null);
  const [pipette, setPipette] = useState(false);
  const [picked, setPicked] = useState<{ image: ImageDocument; sample: PixelSample } | null>(null);

  async function load(file?: File) {
    if (!file) return;
    const id = ++requestId.current;
    setError('');
    setLoading(true);
    try {
      const next = await openImage(file);
      if (id === requestId.current) { setImage(next); setFit(true); }
    } catch (failure) {
      if (id === requestId.current) setError(failure instanceof Error ? failure.message : 'Не удалось открыть файл.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  const source = image?.source;
  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">▧</span><h1>Изображения</h1></div>
        <div className="toolbar-actions">
          <button className="primary" onClick={() => inputRef.current?.click()}>Открыть файл</button>
          <button disabled={!image || loading} onClick={() => setExportOpen(true)}>Сохранить</button>
          <button disabled={!image || loading} aria-pressed={pipette} onClick={() => setPipette(value => !value)}>Пипетка</button>
          <button disabled={!image || loading} onClick={() => setLevelsOpen(true)}>Уровни</button>
          <input ref={inputRef} type="file" className="file-input" accept=".png,.jpg,.jpeg,.gb7"
            aria-label="Выбрать изображение" onChange={event => {
              void load(event.target.files?.[0]); event.target.value = '';
            }} />
          <div className="view-switch" aria-label="Режим просмотра">
            <button disabled={!image} aria-pressed={fit} onClick={() => setFit(true)}>Вписать</button>
            <button disabled={!image} aria-pressed={!fit} onClick={() => setFit(false)}>100%</button>
          </div>
        </div>
        <span className="file-name" title={image?.name}>{image?.name ?? 'Нет открытого файла'}</span>
      </header>
      {error && <div className="error" role="alert"><span>{error}</span>
        <button aria-label="Закрыть сообщение" onClick={() => setError('')}>×</button></div>}
      <main className={`workspace ${dragging ? 'is-dragging' : ''}`} aria-busy={loading}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); void load(event.dataTransfer.files[0]); }}>
        {image ? <ImageWorkspace image={image} preview={levelsPreview} fit={fit} pipette={pipette} onPick={sample => setPicked({ image, sample })} /> : <section className="empty-state">
          <div className="empty-symbol" aria-hidden="true">▧</div>
          <p className="eyebrow">ПРОСМОТР ИЗОБРАЖЕНИЙ</p>
          <h2>Начать с изображения</h2>
          <p>Перетащить файл в эту область<br />или выбрать его на компьютере.</p>
          <button className="primary" onClick={() => inputRef.current?.click()}>Выбрать изображение</button>
          <span className="format-hint">PNG · JPG · GB7</span>
        </section>}
        {loading && <div className="loading" role="status">Загрузка изображения…</div>}
      </main>
      {pipette && <PixelInfo sample={picked?.image === image ? picked?.sample ?? null : null} />}
      <footer className="statusbar" aria-label="Сведения об исходном изображении">
        {source ? <>
          <span className="format-badge">{source.format}</span>
          <span>Ширина: <strong>{source.width} px</strong></span>
          <span>Высота: <strong>{source.height} px</strong></span>
          <span title={`${source.colorModel}; ${source.bitsPerSample} бит на компоненту или индекс палитры`}>
            Глубина цвета: <strong>{source.colorBits} бит</strong>
          </span>
          {source.alphaBits > 0 && <span>Альфа-канал: <strong>{source.alphaBits} бит</strong></span>}
          {source.transparency === 'mask' && <span>Маска: <strong>1 бит</strong></span>}
          {(source.transparency === 'key' || source.transparency === 'palette') && <span>Прозрачность: без альфа-канала</span>}
        </> : <span>Изображение не открыто</span>}
        <span className="status-note">{image ? (fit ? 'По размеру окна' : '1 пиксель = 1 CSS px') : 'Файлы обрабатываются в браузере'}</span>
      </footer>
      {exportOpen && image && <ExportDialog image={image} onClose={() => setExportOpen(false)} />}
      {levelsOpen && image && <LevelsDialog image={image} onPreview={setLevelsPreview}
        onClose={() => { setLevelsPreview(null); setLevelsOpen(false); }}
        onApply={pixels => {
          setImage({ ...image, pixels: new ImageData(pixels.data, pixels.width, pixels.height) });
          setLevelsPreview(null); setLevelsOpen(false);
        }} />}
    </div>
  );
}

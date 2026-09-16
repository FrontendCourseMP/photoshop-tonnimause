import { useEffect, useRef, useState } from 'react';
import type { ImageDocument, Raster } from '../image/types';
import { pixelAtPoint, type PixelSample } from '../image/pipette';
import { resizeRaster, resizeRegion, type InterpolationMethod } from '../image/resample';
import { fitZoom } from '../image/zoom';

export function ImageViewport({ image, pixels, fit, zoom, method, onZoom, pipette, onPick }: {
  image: ImageDocument; pixels: Raster; fit: boolean; zoom: number; method: InterpolationMethod;
  onZoom: (zoom: number) => void; pipette: boolean; onPick: (sample: PixelSample) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [available, setAvailable] = useState({ width: 1, height: 1 });
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  const percent = fit ? fitZoom(pixels.width, pixels.height, available.width, available.height) : zoom;
  const width = Math.max(1, Math.floor(pixels.width * percent / 100));
  const height = Math.max(1, Math.floor(pixels.height * percent / 100));
  const frameWidth = Math.max(available.width, width + 100), frameHeight = Math.max(available.height, height + 100);
  const left = (frameWidth - width) / 2, top = (frameHeight - height) / 2;
  const tiled = width * height > 24_000_000 || Math.max(width, height) > 16_384;
  const x = tiled ? Math.min(width - 1, Math.max(0, Math.floor(scroll.x - left))) : 0;
  const y = tiled ? Math.min(height - 1, Math.max(0, Math.floor(scroll.y - top))) : 0;
  const tileWidth = tiled ? Math.min(width - x, Math.ceil(available.width) + 1) : width;
  const tileHeight = tiled ? Math.min(height - y, Math.ceil(available.height) + 1) : height;
  useEffect(() => { onZoom(percent); }, [percent, onZoom]);
  useEffect(() => {
    viewportRef.current?.scrollTo(0, 0);
    setScroll({ x: 0, y: 0 });
  }, [image.source, percent]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const rendered = tiled ? resizeRegion(pixels, width, height, { x, y, width: tileWidth, height: tileHeight }, method)
          : resizeRaster(pixels, width, height, method);
        canvas.width = rendered.width; canvas.height = rendered.height;
        canvas.getContext('2d')?.putImageData(new ImageData(rendered.data, rendered.width, rendered.height), 0, 0);
        setError('');
      } catch { setError('Не удалось отобразить изображение в выбранном масштабе.'); }
    });
    return () => cancelAnimationFrame(frame);
  }, [pixels, width, height, method, tiled, x, y, tileWidth, tileHeight]);
  return <div className="viewport" ref={viewportRef} tabIndex={0} aria-label="Область изображения"
    onScroll={event => setScroll({ x: event.currentTarget.scrollLeft, y: event.currentTarget.scrollTop })}>
    {error && <p role="alert">{error}</p>}
    <div className="canvas-frame" style={{ width: frameWidth, height: frameHeight, position: 'relative', display: 'block', padding: 0 }}>
      <div ref={surfaceRef} className="image-surface" style={{ position: 'absolute', left, top, width, height }}>
        <canvas ref={canvasRef} aria-label={`Изображение ${image.name}`}
          data-source-width={pixels.width} data-source-height={pixels.height} data-zoom={percent}
          className={pipette ? 'pipette-active' : undefined}
          onClick={event => {
            if (!pipette || event.button !== 0 || !surfaceRef.current) return;
            const sample = pixelAtPoint(image.pixels, surfaceRef.current.getBoundingClientRect(), event.clientX, event.clientY);
            if (sample) onPick(sample);
          }} style={{ position: 'absolute', left: x, top: y }} />
      </div>
    </div>
  </div>;
}

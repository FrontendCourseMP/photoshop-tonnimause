import { useEffect, useRef, useState } from 'react';
import type { ImageDocument, Raster } from '../image/types';

export function ImageViewport({ image, pixels, fit }: { image: ImageDocument; pixels: Raster; fit: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [available, setAvailable] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = image.pixels.width;
    canvas.height = image.pixels.height;
    canvas.getContext('2d')?.putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
  }, [image, pixels]);
  const scale = fit ? Math.min(1, Math.max(1, available.width - 40) / image.pixels.width,
    Math.max(1, available.height - 40) / image.pixels.height) : 1;
  return (
    <div className="viewport" ref={viewportRef} tabIndex={0} aria-label="Область изображения">
      <div className="canvas-frame" style={{ width: Math.max(available.width, image.pixels.width * scale + 40),
        height: Math.max(available.height, image.pixels.height * scale + 40) }}>
        <canvas ref={canvasRef} aria-label={`Изображение ${image.name}`}
          style={{ width: image.pixels.width * scale, height: image.pixels.height * scale }} />
      </div>
    </div>
  );
}

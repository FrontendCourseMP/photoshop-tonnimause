import { forwardRef, useEffect, useRef, useState } from 'react';
import s from './Canvas.module.scss';
import { useImage } from '../../contexts/ImageContext';
import { useTools } from '../../contexts/ToolContext';
import { useHandTool } from '../InstrumentsPanel/tools/HandTool';
import { useColorPicker } from '../../contexts/ColorPickerContext';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const thubnailSize = 40;

export const Canvas = forwardRef<HTMLCanvasElement>((_, ref) => {
  const {
    setCanvasRef,
    setOffsetX,
    setOffsetY,
    offsetX,
    offsetY,
    scaledImageData: scalledImageData,
  } = useImage();
  const { activeTool } = useTools();
  const { setFirstColor, setSecondColor } = useColorPicker();
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const actualCanvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalCanvasRef;
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const draggingRef = useRef<null | {
    axis: 'x' | 'y';
    start: number;
    startScroll: number;
  }>(null);

  const handTool = useHandTool();

  function getCursor(activeToolID: string | null) {
    switch (activeToolID) {
      case 'hand':
        return 'grab';
      case 'pipette':
        return 'crosshair';
      default:
        return 'default';
    }
  }

  const startDragging = (e: React.MouseEvent, axis: 'x' | 'y') => {
    e.preventDefault();
    const start = axis === 'x' ? e.clientX : e.clientY;
    const currentScroll = axis === 'x' ? scrollX : scrollY;
    draggingRef.current = { axis, start, startScroll: currentScroll };
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', stopDragging);
  };

  const handleDrag = (e: MouseEvent) => {
    if (!draggingRef.current) return;

    const { axis, start, startScroll } = draggingRef.current;
    const delta = (axis === 'x' ? e.clientX : e.clientY) - start + startScroll;
    const trackSize =
      axis === 'x'
        ? (actualCanvasRef.current?.clientWidth ?? 1)
        : (actualCanvasRef.current?.clientHeight ?? 1);

    const newScroll = clamp(
      startScroll + delta / (trackSize - thubnailSize),
      0,
      1,
    );
    if (axis === 'x') {
      setScrollX(newScroll);
      updateOffsetX(newScroll);
    } else {
      setScrollY(newScroll);
      updateOffsetY(newScroll);
    }
  };

  const stopDragging = () => {
    draggingRef.current = null;
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', stopDragging);
  };

  const updateOffsetX = (value: number) => {
    if (!scalledImageData || !actualCanvasRef.current) return;
    const imageWidth = scalledImageData.width;
    const canvasWidth = actualCanvasRef.current.clientWidth;
    const min = -imageWidth + 100;
    const max = canvasWidth - 100;
    const offset = min + (max - min) * value;
    setOffsetX(clamp(offset, min, max));
  };

  const updateOffsetY = (value: number) => {
    if (!scalledImageData || !actualCanvasRef.current) return;
    const imageHeight = scalledImageData.height;
    const canvasHeight = actualCanvasRef.current.clientHeight;
    const min = -imageHeight + 100;
    const max = canvasHeight - 100;
    const offset = min + (max - min) * value;
    setOffsetY(clamp(offset, min, max));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'hand') {
      handTool.handleMouseDown(e);
    } else if (activeTool === 'pipette' && scalledImageData) {
      const canvas = actualCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const imageX = canvasX - offsetX;
      const imageY = canvasY - offsetY;

      const pixelX = Math.floor(imageX);
      const pixelY = Math.floor(imageY);

      const pixel = getPixelColor(e.clientX, e.clientY);
      if (pixel) {
        const coords = { x: pixelX, y: pixelY };
        if (e.altKey || e.ctrlKey || e.shiftKey) {
          setSecondColor(pixel, coords);
        } else {
          setFirstColor(pixel, coords);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'hand') {
      handTool.handleMouseMove(e);
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'hand') {
      handTool.handleMouseUp();
    }
  };

  const handleMouseLeave = () => {
    if (activeTool === 'hand') {
      const canvas = actualCanvasRef.current;
      if (canvas) {
        canvas.style.cursor = 'grab';
      }
    }
  };

  const handleMouseEnter = () => {
    const canvas = actualCanvasRef.current;
    if (!canvas) return;

    if (activeTool === 'hand') {
      canvas.style.cursor = handTool.isDragging ? 'grabbing' : 'grab';
    } else if (activeTool === 'pipette') {
      canvas.style.cursor = 'crosshair';
    }
  };

  const getPixelColor = (clientX: number, clientY: number): [number, number, number, number] | null => {
    const canvas = actualCanvasRef.current;
    if (!canvas || !scalledImageData) return null;

    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const imageX = canvasX - offsetX;
    const imageY = canvasY - offsetY;

    const pixelX = Math.floor(imageX);
    const pixelY = Math.floor(imageY);

    if (pixelX < 0 || pixelX >= scalledImageData.width || 
        pixelY < 0 || pixelY >= scalledImageData.height) {
      return null;
    }

    const index = (pixelY * scalledImageData.width + pixelX) * 4;
    return [
      scalledImageData.data[index],
      scalledImageData.data[index + 1],
      scalledImageData.data[index + 2],
      scalledImageData.data[index + 3]
    ];
  };

  useEffect(() => {
    if (!scalledImageData || !actualCanvasRef.current) return;

    const imageWidth = scalledImageData.width;
    const canvasWidth = actualCanvasRef.current.clientWidth;
    const min = -imageWidth + 100;
    const max = canvasWidth - 100;
    setScrollX((offsetX - min) / (max - min));
  }, [offsetX]);

  useEffect(() => {
    if (!scalledImageData || !actualCanvasRef.current) return;

    const imageHeight = scalledImageData.height;
    const canvasHeight = actualCanvasRef.current.clientHeight;
    const min = -imageHeight + 100;
    const max = canvasHeight - 100;
    setScrollY((offsetY - min) / (max - min));
  }, [offsetY]);

  useEffect(() => {
    if (!actualCanvasRef.current) return;
    const canvas = actualCanvasRef.current;

    const updateCanvasSize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    updateCanvasSize();
    setCanvasRef(actualCanvasRef);
  }, [actualCanvasRef, setCanvasRef, actualCanvasRef.current?.clientWidth]);

  useEffect(() => {
    const canvas = actualCanvasRef.current;
    if (!canvas) return;

    if (activeTool === 'hand') {
      canvas.style.cursor = handTool.isDragging ? 'grabbing' : 'grab';
    } else if (activeTool === 'pipette') {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'default';
    }
  }, [activeTool, handTool.isDragging]);

  return (
    <div className={s.canvasContainer}>
      <canvas
        className={s.canvas}
        ref={actualCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        style={{
          imageRendering: 'auto',
        }}
      />

      {/* Горизонтальный скролл */}
      <div className={s.scrollTrackX}>
        <div
          className={s.scrollThumbX}
          style={{
            left: `max(calc(${scrollX * 100}% - ${thubnailSize}px), 0px)`,
          }}
          onMouseDown={(e) => startDragging(e, 'x')}
        />
      </div>

      {/* Вертикальный скролл */}
      <div className={s.scrollTrackY}>
        <div
          className={s.scrollThumbY}
          style={{
            top: `max(calc(${scrollY * 100}% - ${thubnailSize}px), 0px)`,
          }}
          onMouseDown={(e) => startDragging(e, 'y')}
        />
      </div>
    </div>
  );
}); 
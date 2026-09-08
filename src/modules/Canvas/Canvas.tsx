import { forwardRef, useEffect, useRef, useState } from 'react';
import s from './Canvas.module.scss';
import { useImage } from '../../contexts/ImageContext';
import { useTools } from '../../contexts/ToolContext';
import { useHandTool } from '../InstrumentsPanel/tools/HandTool';

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
  const { activeTool: activeToolID } = useTools();
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
    if (activeToolID === 'hand') {
      if (handTool.isDragging) {
        return 'move';
      }
      return 'grab';
    }

    if (activeToolID === 'pipette') {
      return 'crosshair';
    }

    return 'default';
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeToolID === 'hand') {
      handTool.handleMouseDown(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeToolID === 'hand') {
      handTool.handleMouseMove(e);
    }
  };

  const handleMouseUp = () => {
    if (activeToolID === 'hand') {
      handTool.handleMouseUp();
    }
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

  return (
    <div className={s.canvasContainer}>
      <canvas
        className={s.canvas}
        ref={actualCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          imageRendering: 'auto',
          cursor: getCursor(activeToolID),
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
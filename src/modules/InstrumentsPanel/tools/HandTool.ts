import { useEffect, useState } from 'react';
import { useImage } from '../../../contexts/ImageContext';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface HandToolState {
  isDragging: boolean;
  lastPos: { x: number; y: number } | null;
}

export function useHandTool() {
  const { setOffsetX, setOffsetY, scaledImageData: scalledImageData, canvasRef } = useImage();
  const [state, setState] = useState<HandToolState>({
    isDragging: false,
    lastPos: null,
  });

  // Скорость перемещения стрелками (в пикселях)
  const ARROW_MOVE_SPEED = 10;

  const handleMouseDown = (e: React.MouseEvent) => {
    setState({
      isDragging: true,
      lastPos: { x: e.clientX, y: e.clientY },
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!state.isDragging || !state.lastPos || !canvasRef?.current || !scalledImageData) return;

    const dx = e.clientX - state.lastPos.x;
    const dy = e.clientY - state.lastPos.y;

    updateOffset(dx, dy);
    setState({
      ...state,
      lastPos: { x: e.clientX, y: e.clientY },
    });
  };

  const handleMouseUp = () => {
    setState({
      isDragging: false,
      lastPos: null,
    });
  };

  const updateOffset = (dx: number, dy: number) => {
    if (!canvasRef?.current || !scalledImageData) return;

    const imageWidth = scalledImageData.width;
    const imageHeight = scalledImageData.height;
    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;

    setOffsetX((prevX: number) => {
      const newX = prevX + dx;
      const minX = -imageWidth + 100;
      const maxX = canvasWidth - 100;
      return clamp(newX, minX, maxX);
    });

    setOffsetY((prevY: number) => {
      const newY = prevY + dy;
      const minY = -imageHeight + 100;
      const maxY = canvasHeight - 100;
      return clamp(newY, minY, maxY);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!scalledImageData) return;

      switch (e.key) {
        case 'ArrowLeft':
          updateOffset(-ARROW_MOVE_SPEED, 0);
          break;
        case 'ArrowRight':
          updateOffset(ARROW_MOVE_SPEED, 0);
          break;
        case 'ArrowUp':
          updateOffset(0, -ARROW_MOVE_SPEED);
          break;
        case 'ArrowDown':
          updateOffset(0, ARROW_MOVE_SPEED);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scalledImageData, canvasRef, ARROW_MOVE_SPEED, updateOffset]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isDragging: state.isDragging,
  };
} 
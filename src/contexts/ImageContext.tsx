import React, { createContext, useContext, useEffect, useState } from "react";
import { resizeImageByMethod } from "../utils/resizeImage";

interface ImageContextProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null> | null;
  setCanvasRef: (ref: React.RefObject<HTMLCanvasElement | null> | null) => void;

  imageData: ImageData | null;
  scaledImageData: ImageData | null;
  width: number;
  height: number;
  colorDepth: number | null;
  scaleValue: number;
  offsetX: number;
  offsetY: number;

  setOffsetX: (value: React.SetStateAction<number>) => void;
  setOffsetY: (value: React.SetStateAction<number>) => void;
  setScaleValue: (value: number) => void;
  setImageData: (data: ImageData, colorDepth?: number) => void;

  clearImage: () => void;
  drawImageOnCanvas: (data: ImageData) => void;
}

const ImageContext = createContext<ImageContextProps | null>(null);

export function useImage() {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error("useImage must be used within an ImageProvider");
  }
  return context;
}

const padding = 50;

export function ImageProvider({ children }: { children: React.ReactNode }) {
  const [canvasRef, setCanvasRef] = useState<React.RefObject<HTMLCanvasElement | null> | null>(null);
  const [imageData, setImageDataState] = useState<ImageData | null>(null);
  const [scaledImageData, setScaledImageData] = useState<ImageData | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [colorDepth, setColorDepth] = useState<number | null>(null);
  const [scaleValue, setScaleValue] = useState(1);

  // Очистка изображения
  function clearImage() {
    const canvas = canvasRef?.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      setImageDataState(null);
      setScaledImageData(null);
      setWidth(0);
      setHeight(0);
      setOffsetX(0);
      setOffsetY(0);
      setColorDepth(null);
    }
  }

  function drawImageOnCanvas(data: ImageData) {
    const canvas = canvasRef?.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(data, offsetX, offsetY);
  }

  // Эффект для обновления размеров при изменении изображения
  useEffect(() => {
    if (!imageData || !canvasRef?.current) return;

    setWidth(imageData.width);
    setHeight(imageData.height);

    // Вычисляем начальный масштаб для вписывания в экран
    const canvas = canvasRef.current;
    const scaleX = (canvas.width - padding * 2) / imageData.width;
    const scaleY = (canvas.height - padding * 2) / imageData.height;
    const scale = Math.min(scaleX, scaleY, 1);
    setScaleValue(scale);
  }, [imageData, canvasRef]);

  // Эффект для масштабирования изображения
  useEffect(() => {
    if (!imageData || !canvasRef?.current) return;

    const canvas = canvasRef.current;
    const newWidth = Math.round(imageData.width * scaleValue);
    const newHeight = Math.round(imageData.height * scaleValue);

    // Создаем масштабированное изображение методом ближайшего соседа
    resizeImageByMethod(
      imageData,
      newWidth,
      newHeight,
      "nearest"
    ).then((scaledImage) => {
      if (scaledImage) {
        setScaledImageData(scaledImage);
        
        // Центрируем изображение
        setOffsetX((canvas.width - newWidth) / 2);
        setOffsetY((canvas.height - newHeight) / 2);
      }
    });
  }, [imageData, scaleValue]);

  // Эффект для отрисовки масштабированного изображения
  useEffect(() => {
    if (scaledImageData) {
      drawImageOnCanvas(scaledImageData);
    }
  }, [scaledImageData, offsetX, offsetY]);

  const setImageData = (data: ImageData, newColorDepth?: number) => {
    setImageDataState(data);
    if (newColorDepth !== undefined) {
      setColorDepth(newColorDepth);
    }
  };

  return (
    <ImageContext.Provider
      value={{
        canvasRef,
        setCanvasRef,
        imageData,
        scaledImageData,
        width,
        height,
        colorDepth,
        scaleValue,
        offsetX,
        offsetY,
        setOffsetX,
        setOffsetY,
        setScaleValue,
        setImageData,
        clearImage,
        drawImageOnCanvas,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
} 
/**
 * Компонент Canvas для отображения изображений
 * Поддерживает адаптивное масштабирование и высокое качество рендеринга
 */

import { useEffect, useRef, useCallback } from "react";
import styles from "./Canvas.module.scss";

// Типы
interface CanvasProps {
  /** Данные изображения для отображения */
  imageData: ImageData | null;
  /** Callback при готовности canvas */
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

// Константы
const DEFAULT_CANVAS_SIZE = 600;
const CANVAS_PADDING = 32;
const MAX_SCALE = 1.0;

/**
 * Компонент Canvas для отображения изображений
 */
function Canvas({ imageData, onCanvasReady }: CanvasProps): React.JSX.Element {
  // Рефы для DOM элементов
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /**
   * Обновляет размеры canvas в соответствии с размерами контейнера
   * @returns масштаб изображения или undefined при ошибке
   */
  const updateCanvasSize = useCallback((): number | undefined => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    
    if (!canvas || !wrapper) {
      console.warn("⚠️ Canvas или wrapper не найден");
      return undefined;
    }

    // Получаем размеры контейнера
    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;

    console.log("📏 Размеры контейнера:", { wrapperWidth, wrapperHeight });

    // Если изображение не загружено, устанавливаем базовый размер
    if (!imageData) {
      const size = Math.min(DEFAULT_CANVAS_SIZE, wrapperWidth - CANVAS_PADDING);
      canvas.width = size;
      canvas.height = size;
      
      console.log("🎨 Установлен базовый размер canvas:", { width: size, height: size });
      return undefined;
    }

    // Вычисляем масштаб для вписывания изображения
    const availableWidth = wrapperWidth - CANVAS_PADDING;
    const availableHeight = wrapperHeight - CANVAS_PADDING;
    
    const scaleX = availableWidth / imageData.width;
    const scaleY = availableHeight / imageData.height;
    const scale = Math.min(scaleX, scaleY, MAX_SCALE);

    // Устанавливаем размеры canvas
    canvas.width = Math.floor(imageData.width * scale);
    canvas.height = Math.floor(imageData.height * scale);

    console.log("🎨 Canvas настроен:", {
      imageSize: { width: imageData.width, height: imageData.height },
      scale,
      canvasSize: { width: canvas.width, height: canvas.height }
    });

    return scale;
  }, [imageData]);

  /**
   * Рендерит изображение на canvas
   */
  const renderImage = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) {
      console.warn("⚠️ Canvas или imageData недоступны для рендеринга");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("❌ Не удалось получить контекст canvas");
      return;
    }

    console.log("🎨 Начинаем рендеринг изображения...");

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Создаем временный canvas для масштабирования
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) {
      console.error("❌ Не удалось создать временный контекст canvas");
      return;
    }

    // Рисуем оригинальное изображение на временном canvas
    tempCtx.putImageData(imageData, 0, 0);

    // Настройки сглаживания для высокого качества
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Рисуем масштабированное изображение на основном canvas
    ctx.drawImage(
      tempCanvas,
      0, 0, imageData.width, imageData.height,
      0, 0, canvas.width, canvas.height
    );

    console.log("✅ Изображение успешно отрендерено");
  }, [imageData]);

  /**
   * Обработчик изменения размера окна
   */
  const handleResize = useCallback((): void => {
    console.log("🔄 Обработка изменения размера окна...");
    
    if (imageData) {
      updateCanvasSize();
      renderImage();
    } else {
      updateCanvasSize();
    }
  }, [imageData, updateCanvasSize, renderImage]);

  // Инициализация canvas при монтировании
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      console.log("🎨 Canvas инициализирован");
      updateCanvasSize();
      onCanvasReady(canvas);
    }
  }, [onCanvasReady, updateCanvasSize]);

  // Обработка изменения данных изображения
  useEffect(() => {
    console.log("🖼️ Данные изображения изменились:", imageData ? "присутствуют" : "отсутствуют");
    
    if (imageData) {
      updateCanvasSize();
      renderImage();
    } else {
      updateCanvasSize();
    }
  }, [imageData, updateCanvasSize, renderImage]);

  // Обработка изменения размера окна
  useEffect(() => {
    console.log("🔄 Устанавливаем обработчик изменения размера окна");
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      console.log("🔄 Удаляем обработчик изменения размера окна");
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  return (
    <div ref={wrapperRef} className={styles.canvasWrapper}>
      <canvas 
        ref={canvasRef} 
        className={styles.canvas}
        aria-label={imageData ? "Изображение" : "Пустой canvas"}
      />
    </div>
  );
}

export default Canvas;
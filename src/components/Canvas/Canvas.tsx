import { forwardRef, useEffect, useRef } from "react";
import { useImage } from "../../contexts/ImageContext";
import styles from "./Canvas.module.scss";

export const Canvas = forwardRef<HTMLCanvasElement>((_, ref) => {
  const { setCanvasRef, imageData, scaledImageData, offsetX, offsetY } = useImage();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Эффект для инициализации ссылки на canvas
  useEffect(() => {
    if (ref && "current" in ref) {
      setCanvasRef(ref);
    }
  }, [ref, setCanvasRef]);

  // Эффект для обновления размеров canvas при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      const canvas = ref && "current" in ref ? ref.current : null;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return;

      // Устанавливаем размеры canvas равными размерам wrapper
      canvas.width = wrapper.clientWidth;
      canvas.height = wrapper.clientHeight;

      // Если есть масштабированное изображение, перерисовываем его
      if (scaledImageData) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.putImageData(scaledImageData, offsetX, offsetY);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Инициализируем размеры при монтировании

    return () => window.removeEventListener("resize", handleResize);
  }, [ref, scaledImageData, offsetX, offsetY]);

  // Эффект для отрисовки изображения при его изменении
  useEffect(() => {
    const canvas = ref && "current" in ref ? ref.current : null;
    if (!canvas || !scaledImageData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(scaledImageData, offsetX, offsetY);
  }, [ref, scaledImageData, offsetX, offsetY]);

  return (
    <div ref={wrapperRef} className={styles.canvasWrapper}>
      <canvas ref={ref} className={styles.canvas} />
    </div>
  );
}); 

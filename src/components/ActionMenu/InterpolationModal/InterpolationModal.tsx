import { Modal } from "antd";
import { useImage } from "../../../contexts/ImageContext";
import { InterpolationForm } from "../InterpolationForm/InterpolationForm";
import type { InterpolationFormValues } from "../InterpolationForm/InterpolationForm";

interface InterpolationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterpolationModal({ isOpen, onClose }: InterpolationModalProps) {
  const { imageData, width, height, setImageData } = useImage();

  const handleSubmit = async (values: InterpolationFormValues) => {
    if (!imageData) return;

    // Вычисляем новые размеры
    let newWidth = values.width;
    let newHeight = values.height;

    // Если размеры заданы в процентах, пересчитываем в пиксели
    if (values.unit === "percent") {
      newWidth = Math.round((width * values.width) / 100);
      newHeight = Math.round((height * values.height) / 100);
    }

    try {
      // Создаем временный canvas для изменения размера
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");

      if (!tempCtx) {
        throw new Error("Failed to get canvas context");
      }

      // Рисуем исходное изображение
      tempCtx.putImageData(imageData, 0, 0);

      // Создаем новый canvas для результата
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = newWidth;
      resultCanvas.height = newHeight;
      const resultCtx = resultCanvas.getContext("2d");

      if (!resultCtx) {
        throw new Error("Failed to get result canvas context");
      }

      // Настраиваем качество интерполяции
      resultCtx.imageSmoothingEnabled = values.interpolationMethod === "bilinear";
      resultCtx.imageSmoothingQuality = "high";

      // Изменяем размер
      resultCtx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

      // Получаем новые данные изображения
      const newImageData = resultCtx.getImageData(0, 0, newWidth, newHeight);

      // Обновляем изображение в контексте
      setImageData(newImageData);
      onClose();
    } catch (error) {
      console.error("Error resizing image:", error);
    }
  };

  return (
    <Modal
      title="Изменить размер изображения"
      open={isOpen}
      onCancel={onClose}
      okText="Применить"
      cancelText="Отмена"
      okButtonProps={{ form: "interpolationForm", htmlType: "submit" }}
    >
      <InterpolationForm onSubmit={handleSubmit} />
    </Modal>
  );
} 

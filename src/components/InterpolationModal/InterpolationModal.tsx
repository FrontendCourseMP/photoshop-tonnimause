import { Modal, message } from "antd";
import { useImage } from "../../contexts/ImageContext";
import { InterpolationForm } from "../InterpolationForm/InterpolationForm";
import type { InterpolationFormValues } from "../InterpolationForm/InterpolationForm";
import { resizeImageByMethod } from "../../utils/resizeImage";

interface InterpolationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterpolationModal({ isOpen, onClose }: InterpolationModalProps) {
  const { imageData, width, height, setImageData } = useImage();

  const handleSubmit = async (values: InterpolationFormValues) => {
    if (!imageData) return;

    try {
      // Вычисляем новые размеры
      let newWidth = values.width;
      let newHeight = values.height;

      // Если размеры заданы в процентах, пересчитываем в пиксели
      if (values.unit === "percent") {
        newWidth = Math.round((width * values.width) / 100);
        newHeight = Math.round((height * values.height) / 100);
      }

      // Изменяем размер изображения с выбранным методом интерполяции
      const resizedImageData = await resizeImageByMethod(
        imageData,
        newWidth,
        newHeight,
        values.interpolationMethod
      );

      // Обновляем изображение в контексте
      setImageData(resizedImageData);
      message.success("Размер изображения успешно изменен");
      onClose();
    } catch (error) {
      console.error("Error resizing image:", error);
      message.error("Ошибка при изменении размера изображения");
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

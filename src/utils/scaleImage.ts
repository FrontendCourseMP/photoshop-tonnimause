import { resizeImageByMethod } from "./resize";

type ScaleImageProps = {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  scale: number;
};

type ScaleImageResult = {
  scaledImageData: ImageData;
  imageOffsetX: number;
  imageOffsetY: number;
};

export const CScales = [
  0.15, 0.3, 0.45, 0.6, 0.75, 1, 1.15, 1.3, 1.45, 1.6, 1.75, 2, 2.15, 2.3, 2.45,
  2.6, 2.75, 3,
];

const padding = 50;

export function findClosestScaleBelow(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;
  const fitScale = Math.min(scaleX, scaleY);

  // Отфильтровать только те, что меньше или равны fitScale
  const validScales = CScales.filter((scale) => scale <= fitScale);

  if (validScales.length === 0) {
    // Все слишком большие — вернем минимальный
    return Math.min(...CScales);
  }

  // Возьмем ближайший к fitScale из validScales
  return validScales.reduce((prev, curr) =>
    Math.abs(curr - fitScale) < Math.abs(prev - fitScale) ? curr : prev,
  );
}

export async function scaleImage(
  props: ScaleImageProps,
): Promise<ScaleImageResult> {
  const imgWidth = props.imageData.width;
  const imgHeight = props.imageData.height;

  const newImageWidth = Math.floor(imgWidth * props.scale) - padding;
  const newImageHeight = Math.floor(imgHeight * props.scale) - padding;

  const scaledImageData = await resizeImageByMethod(
    props.imageData,
    newImageWidth,
    newImageHeight,
    "bilinear",
  );

  if (!scaledImageData) {
    alert("Не удалось изменить размер изображения");
    return {
      scaledImageData: props.imageData,
      imageOffsetX: 0,
      imageOffsetY: 0,
    };
  }

  const canvasWidth = props.canvas.width;
  const canvasHeight = props.canvas.height;

  // Центрируем изображение на canvas
  const offsetX = (canvasWidth - scaledImageData.width) / 2;
  const offsetY = (canvasHeight - scaledImageData.height) / 2;

  return {
    scaledImageData,
    imageOffsetX: offsetX,
    imageOffsetY: offsetY,
  };
}

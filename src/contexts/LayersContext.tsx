import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useImage } from "./ImageContext";

export type BlendMode = "normal" | "multiply" | "screen" | "overlay";

const PREVIEW_MAX_SIZE = 100; // Максимальный размер превью

export interface Layer {
  id: string;
  originalImageData: ImageData | null;
  editedImageData: ImageData | null;
  offsetX: number;
  offsetY: number;
  blendMode: BlendMode;
  opacity: number; // 0-1
  hasAlphaChannel: boolean;
  alphaChannelVisible: boolean;
  visible: boolean;
  preview: string;
  alphaChannelPreview: string;
  colorDepth: number;
  isGrayscale: boolean;
  name: string;
}

interface LayersContextProps {
  layers: Layer[];
  activeLayerId: string | null;
  setActiveLayerId: (id: string | null) => void;
  addLayer: (imageData?: ImageData) => void;
  removeLayer: (id: string) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, mode: BlendMode) => void;
  updateLayerPreview: (id: string) => void;
  toggleAlphaVisibility: (id: string) => void;
  deleteAlphaChannel: (id: string) => void;
  setColorDepth: (id: string, depth: number) => void;
  setIsGrayscale: (id: string, isGrayscale: boolean) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
}

const LayersContext = createContext<LayersContextProps | null>(null);

export function useLayers() {
  const context = useContext(LayersContext);
  if (!context) {
    throw new Error("useLayers must be used within a LayersProvider");
  }
  return context;
}

// Кэшированные canvas для переиспользования
let previewCanvas: HTMLCanvasElement | null = null;
let alphaPreviewCanvas: HTMLCanvasElement | null = null;
let blendCanvas: HTMLCanvasElement | null = null;

// Функция для создания пустого слоя
function createEmptyLayer(id: string): Layer {
  return {
    id,
    originalImageData: null,
    editedImageData: null,
    offsetX: 0,
    offsetY: 0,
    blendMode: "normal",
    opacity: 1,
    hasAlphaChannel: true,
    alphaChannelVisible: true,
    visible: true,
    preview: "",
    alphaChannelPreview: "",
    colorDepth: 0,
    isGrayscale: false,
    name: `Слой ${id}`
  };
}

// Функция для создания превью слоя с масштабированием
function createPreview(imageData: ImageData): string {
  if (!previewCanvas) {
    previewCanvas = document.createElement("canvas");
  }
  
  // Масштабируем превью для экономии памяти
  const scale = Math.min(1, PREVIEW_MAX_SIZE / Math.max(imageData.width, imageData.height));
  const width = Math.floor(imageData.width * scale);
  const height = Math.floor(imageData.height * scale);
  
  previewCanvas.width = width;
  previewCanvas.height = height;
  const ctx = previewCanvas.getContext("2d");
  if (!ctx) return "";
  
  // Создаем временный canvas для масштабирования
  if (!blendCanvas) {
    blendCanvas = document.createElement("canvas");
  }
  blendCanvas.width = imageData.width;
  blendCanvas.height = imageData.height;
  const tempCtx = blendCanvas.getContext("2d");
  if (!tempCtx) return "";
  
  tempCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(blendCanvas, 0, 0, width, height);
  
  const preview = previewCanvas.toDataURL("image/jpeg", 0.8);
  
  // Очищаем canvas
  ctx.clearRect(0, 0, width, height);
  tempCtx.clearRect(0, 0, blendCanvas.width, blendCanvas.height);
  
  return preview;
}

// Функция для создания превью альфа-канала
function createAlphaPreview(imageData: ImageData): string {
  if (!alphaPreviewCanvas) {
    alphaPreviewCanvas = document.createElement("canvas");
  }
  
  // Масштабируем превью
  const scale = Math.min(1, PREVIEW_MAX_SIZE / Math.max(imageData.width, imageData.height));
  const width = Math.floor(imageData.width * scale);
  const height = Math.floor(imageData.height * scale);
  
  alphaPreviewCanvas.width = width;
  alphaPreviewCanvas.height = height;
  const ctx = alphaPreviewCanvas.getContext("2d");
  if (!ctx) return "";

  const alphaData = ctx.createImageData(width, height);
  
  // Масштабируем и копируем альфа-канал
  const scaleX = imageData.width / width;
  const scaleY = imageData.height / height;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * imageData.width + srcX) * 4;
      const destIdx = (y * width + x) * 4;
      
      const alpha = imageData.data[srcIdx + 3];
      alphaData.data[destIdx] = alpha;
      alphaData.data[destIdx + 1] = alpha;
      alphaData.data[destIdx + 2] = alpha;
      alphaData.data[destIdx + 3] = 255;
    }
  }

  ctx.putImageData(alphaData, 0, 0);
  const preview = alphaPreviewCanvas.toDataURL("image/jpeg", 0.8);
  
  // Очищаем canvas
  ctx.clearRect(0, 0, width, height);
  
  return preview;
}

// Функция для удаления альфа-канала
function removeAlphaChannel(imageData: ImageData): ImageData {
  const newData = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    newData.data[i] = imageData.data[i];
    newData.data[i + 1] = imageData.data[i + 1];
    newData.data[i + 2] = imageData.data[i + 2];
    newData.data[i + 3] = 255;
  }
  return newData;
}

// Оптимизированная функция для применения режима наложения
const blendBuffer = {
  imageData: null as ImageData | null,
  width: 0,
  height: 0
};

function applyBlendMode(bottom: ImageData, top: ImageData, mode: BlendMode, opacity: number): ImageData {
  const maxWidth = Math.max(bottom.width, top.width);
  const maxHeight = Math.max(bottom.height, top.height);
  
  // Создаем новый буфер для результата
  const result = new ImageData(maxWidth, maxHeight);
  
  // Копируем нижний слой
  for (let y = 0; y < maxHeight; y++) {
    for (let x = 0; x < maxWidth; x++) {
      const i = (y * maxWidth + x) * 4;
      if (x < bottom.width && y < bottom.height) {
        const bottomI = (y * bottom.width + x) * 4;
        result.data[i] = bottom.data[bottomI];
        result.data[i + 1] = bottom.data[bottomI + 1];
        result.data[i + 2] = bottom.data[bottomI + 2];
        result.data[i + 3] = bottom.data[bottomI + 3];
      }
    }
  }

  // Накладываем верхний слой
  for (let y = 0; y < top.height; y++) {
    for (let x = 0; x < top.width; x++) {
      const i = (y * maxWidth + x) * 4;
      const topI = (y * top.width + x) * 4;

      const r1 = result.data[i];
      const g1 = result.data[i + 1];
      const b1 = result.data[i + 2];
      const a1 = result.data[i + 3] / 255;

      const r2 = top.data[topI];
      const g2 = top.data[topI + 1];
      const b2 = top.data[topI + 2];
      const a2 = (top.data[topI + 3] / 255) * opacity;

      let r, g, b;

      // Применяем режим наложения только к видимым пикселям
      if (a2 > 0) {
        switch (mode) {
          case "multiply":
            r = (r1 * r2) / 255;
            g = (g1 * g2) / 255;
            b = (b1 * b2) / 255;
            break;
          case "screen":
            r = 255 - ((255 - r1) * (255 - r2)) / 255;
            g = 255 - ((255 - g1) * (255 - g2)) / 255;
            b = 255 - ((255 - b1) * (255 - b2)) / 255;
            break;
          case "overlay":
            r = r1 < 128 ? (2 * r1 * r2) / 255 : 255 - (2 * (255 - r1) * (255 - r2)) / 255;
            g = g1 < 128 ? (2 * g1 * g2) / 255 : 255 - (2 * (255 - g1) * (255 - g2)) / 255;
            b = b1 < 128 ? (2 * b1 * b2) / 255 : 255 - (2 * (255 - b1) * (255 - b2)) / 255;
            break;
          default: // normal
            r = r2;
            g = g2;
            b = b2;
        }

        // Смешиваем цвета с учетом прозрачности
        const finalAlpha = a1 + a2 - a1 * a2;
        const a1Mix = a1 * (1 - a2);
        const a2Mix = a2;

        result.data[i] = (r1 * a1Mix + r * a2Mix) / finalAlpha;
        result.data[i + 1] = (g1 * a1Mix + g * a2Mix) / finalAlpha;
        result.data[i + 2] = (b1 * a1Mix + b * a2Mix) / finalAlpha;
        result.data[i + 3] = finalAlpha * 255;
      }
    }
  }

  return result;
}

export function LayersProvider({ children }: { children: React.ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const { setImageData } = useImage();
  
  // Используем useRef для хранения предыдущего состояния слоев
  const prevLayersRef = useRef<Layer[]>([]);
  
  // Оптимизированное обновление финального изображения
  useEffect(() => {
    // Проверяем, действительно ли нужно обновлять изображение
    console.log('Current layers:', layers.map(l => ({ id: l.id, name: l.name })));
    console.log('Previous layers:', prevLayersRef.current.map(l => ({ id: l.id, name: l.name })));
    
    const hasVisibleChanges = layers.length !== prevLayersRef.current.length || 
      layers.some((layer, index) => {
      const prevLayer = prevLayersRef.current[index];
      const changes = !prevLayer ||
        layer.id !== prevLayer.id || // Проверяем изменение порядка
        layer.visible !== prevLayer.visible ||
        layer.opacity !== prevLayer.opacity ||
        layer.blendMode !== prevLayer.blendMode ||
        layer.editedImageData !== prevLayer.editedImageData;
      
      if (changes) {
        console.log('Layer changed:', { 
          layerId: layer.id, 
          reason: {
            noPrevLayer: !prevLayer,
            idChanged: prevLayer && layer.id !== prevLayer.id,
            visibilityChanged: prevLayer && layer.visible !== prevLayer.visible,
            opacityChanged: prevLayer && layer.opacity !== prevLayer.opacity,
            blendModeChanged: prevLayer && layer.blendMode !== prevLayer.blendMode,
            imageDataChanged: prevLayer && layer.editedImageData !== prevLayer.editedImageData
          }
        });
      }
      return changes;
    });
    
    console.log('Has visible changes:', hasVisibleChanges);
    
    if (!hasVisibleChanges) return;
    
    const updateFinalImage = () => {
      if (layers.length === 0) {
        setImageData(new ImageData(1, 1));
        return;
      }

      // Фильтруем только видимые слои и разворачиваем их для соответствия UI
      const visibleLayers = layers.filter(layer => layer.visible && layer.editedImageData).reverse();
      console.log('Visible layers order for blending:', visibleLayers.map(l => ({ id: l.id, name: l.name })));

      if (visibleLayers.length === 0) {
        setImageData(new ImageData(1, 1));
        return;
      }

      // Находим максимальные размеры
      const maxWidth = Math.max(...visibleLayers.map(layer => layer.editedImageData!.width));
      const maxHeight = Math.max(...visibleLayers.map(layer => layer.editedImageData!.height));

      // Создаем пустой результат
      let result = new ImageData(maxWidth, maxHeight);

      // Накладываем слои в обратном порядке (как в UI)
      for (const layer of visibleLayers) {
        result = applyBlendMode(result, layer.editedImageData!, layer.blendMode, layer.opacity);
      }

      setImageData(result);
    };

    // Запускаем обновление только когда необходимо
    updateFinalImage();
    
    // Сохраняем текущее состояние слоев
    prevLayersRef.current = layers;
  }, [layers, setImageData]);

  // Очистка ресурсов при размонтировании
  useEffect(() => {
    return () => {
      if (previewCanvas) {
        previewCanvas.width = 0;
        previewCanvas.height = 0;
        previewCanvas = null;
      }
      if (alphaPreviewCanvas) {
        alphaPreviewCanvas.width = 0;
        alphaPreviewCanvas.height = 0;
        alphaPreviewCanvas = null;
      }
      if (blendCanvas) {
        blendCanvas.width = 0;
        blendCanvas.height = 0;
        blendCanvas = null;
      }
      blendBuffer.imageData = null;
    };
  }, []);

  const addLayer = (imageData?: ImageData) => {
    if (layers.length >= 2) return; // Максимум 2 слоя

    const id = Date.now().toString();
    const newLayer = {
      ...createEmptyLayer(id),
      originalImageData: imageData || null,
      editedImageData: imageData || null,
      preview: imageData ? createPreview(imageData) : "",
      alphaChannelPreview: imageData ? createAlphaPreview(imageData) : "",
      hasAlphaChannel: !!imageData,
      name: `Слой ${layers.length + 1}`
    };

    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(id);
  };

  const removeLayer = (id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(null);
    }
  };

  const moveLayer = (fromIndex: number, toIndex: number) => {
    console.log('Moving layer:', { fromIndex, toIndex });
    setLayers(prev => {
      const newLayers = [...prev];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      console.log('New layers order:', newLayers.map(l => ({ id: l.id, name: l.name })));
      return newLayers;
    });
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const setLayerOpacity = (id: string, opacity: number) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, opacity: opacity / 100 } : layer
      )
    );
  };

  const setLayerBlendMode = (id: string, mode: BlendMode) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, blendMode: mode } : layer
      )
    );
  };

  const updateLayerPreview = (id: string) => {
    setLayers(prev =>
      prev.map(layer => {
        if (layer.id === id && layer.editedImageData) {
          return {
            ...layer,
            preview: createPreview(layer.editedImageData),
            alphaChannelPreview: createAlphaPreview(layer.editedImageData)
          };
        }
        return layer;
      })
    );
  };

  const toggleAlphaVisibility = (id: string) => {
    setLayers(prev =>
      prev.map(layer => {
        if (layer.id === id) {
          const alphaVisible = !layer.alphaChannelVisible;
          const editedImageData = alphaVisible
            ? layer.originalImageData
            : layer.originalImageData && removeAlphaChannel(layer.originalImageData);

          return {
            ...layer,
            alphaChannelVisible: alphaVisible,
            editedImageData: editedImageData || null
          };
        }
        return layer;
      })
    );
  };

  const deleteAlphaChannel = (id: string) => {
    setLayers(prev =>
      prev.map(layer => {
        if (layer.id === id && layer.originalImageData) {
          const newImageData = removeAlphaChannel(layer.originalImageData);
          return {
            ...layer,
            hasAlphaChannel: false,
            alphaChannelVisible: false,
            originalImageData: newImageData,
            editedImageData: newImageData
          };
        }
        return layer;
      })
    );
  };

  const setColorDepth = (id: string, depth: number) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, colorDepth: depth } : layer
      )
    );
  };

  const setIsGrayscale = (id: string, isGrayscale: boolean) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, isGrayscale } : layer
      )
    );
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(prev =>
      prev.map(layer => {
        if (layer.id === id) {
          const updatedLayer = { ...layer, ...updates };
          if (updates.editedImageData) {
            updatedLayer.preview = createPreview(updates.editedImageData);
            updatedLayer.alphaChannelPreview = createAlphaPreview(updates.editedImageData);
          }
          return updatedLayer;
        }
        return layer;
      })
    );
  };

  return (
    <LayersContext.Provider
      value={{
        layers,
        activeLayerId,
        setActiveLayerId,
        addLayer,
        removeLayer,
        moveLayer,
        toggleLayerVisibility,
        setLayerOpacity,
        setLayerBlendMode,
        updateLayerPreview,
        toggleAlphaVisibility,
        deleteAlphaChannel,
        setColorDepth,
        setIsGrayscale,
        updateLayer
      }}
    >
      {children}
    </LayersContext.Provider>
  );
} 

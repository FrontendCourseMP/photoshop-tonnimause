import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Radio,
  Select,
  InputNumber,
  Button,
  Image,
  Space,
  Typography,
  Divider,
} from "antd";
import { ConvolutionPresets } from "../../utils/convolution";
import { useLayers, type Layer } from "../../contexts/LayersContext";
import ConvolutionWorker from "../../workers/convolution.worker?worker";
import { imageDataToURL } from "../../utils/imageDataToURL";

const { Option } = Select;

type FilterKernelModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ConvolutionPresetsNamesRus = {
  Identity: "Тождественное отображение",
  Sharpen: "Повышение резкости",
  "Gaussian Blur": "Фильтр Гаусса (3 на 3)",
  "Box Blur": "Прямоугольное размытие",
  "Prewitt Horizontal": "Оператор Прюитта по X",
  "Prewitt Vertical": "Оператор Прюитта по Y",
};

function getPresetRusName(name: string) {
  return (
    ConvolutionPresetsNamesRus[
      name as keyof typeof ConvolutionPresetsNamesRus
    ] ?? name
  );
}

export function FilterKernelModal({ isOpen, onClose }: FilterKernelModalProps) {
  const presetNames = Object.keys(ConvolutionPresets);

  const [selectedPresetRGB, setSelectedPresetRGB] = useState(presetNames[0]);
  const [selectedPresetAlpha, setSelectedPresetAlpha] = useState(
    presetNames[0],
  );
  const [matrixRGB, setMatrixRGB] = useState<number[][]>(
    ConvolutionPresets["Identity"],
  );
  const [matrixAlpha, setMatrixAlpha] = useState<number[][]>(
    ConvolutionPresets["Identity"],
  );
  const [mode, setMode] = useState<"rgb" | "alpha">("rgb");

  const [previewImageURL, setPreviewImageURL] = useState<string | null>(null);
  const [layer, setLayer] = useState<Layer | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  const workerRef = useRef<Worker | null>(null);

  const { activeLayerId, layers, setOriginalImageData } = useLayers();

  const matrix = mode === "rgb" ? matrixRGB : matrixAlpha;
  const selectedPreset =
    mode === "rgb" ? selectedPresetRGB : selectedPresetAlpha;

  function handlePresetChange(name: string) {
    if (mode === "rgb") {
      setSelectedPresetRGB(name);
      setMatrixRGB(ConvolutionPresets[name]);
    } else {
      setSelectedPresetAlpha(name);
      setMatrixAlpha(ConvolutionPresets[name]);
    }
  }

  function handleMatrixInput(i: number, j: number, value: number | null) {
    const update = (prev: number[][]) => {
      const updated = prev.map((row) => [...row]);
      updated[i][j] = value ?? 0;
      return updated;
    };
    if (mode === "rgb") {
      setMatrixRGB((prev) => update(prev));
    } else {
      setMatrixAlpha((prev) => update(prev));
    }
  }

  function handleReset() {
    if (mode === "rgb") {
      setSelectedPresetRGB("Identity");
      setMatrixRGB(ConvolutionPresets["Identity"]);
    } else {
      setSelectedPresetAlpha("Identity");
      setMatrixAlpha(ConvolutionPresets["Identity"]);
    }
    setPreviewImageURL(null);
  }

  function createPreview() {
    if (activeLayerId !== null && imageData && workerRef.current) {
      workerRef.current.postMessage({
        imageData,
        kernel: mode === "rgb" ? matrixRGB : matrixAlpha,
        mode,
      });
    }
  }

  function handleApply() {
    if (previewImageURL && activeLayerId !== null && imageData) {
      const worker = new ConvolutionWorker();

      worker.postMessage({
        imageData,
        kernel: mode === "rgb" ? matrixRGB : matrixAlpha,
        mode,
      });

      worker.onmessage = (e) => {
        const newImage: ImageData = e.data;
        setOriginalImageData(activeLayerId, newImage);
        worker.terminate();
      };

      worker.onerror = (err) => {
        console.error("Worker error:", err);
        worker.terminate();
      };
    }
  }

  useEffect(() => {
    const worker = new ConvolutionWorker();
    workerRef.current = worker;

    worker.onmessage = (e: any) => {
      const result: ImageData = e.data;
      setPreviewImageURL(imageDataToURL(result));
    };

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (layer) {
      setImageData(layer.originalImageData);
    } else {
      setImageData(null);
    }
  }, [layer]);

  useEffect(() => {
    if (activeLayerId !== null) {
      const layer = layers.find((l) => l.id === activeLayerId);
      setLayer(layer || null);
    } else {
      setLayer(null);
    }
  }, [activeLayerId, layers]);

  useEffect(() => {
    handleReset();
  }, [isOpen]);

  return (
    <Modal
      title="Фильтрация ядром"
      open={isOpen}
      onCancel={onClose}
      onOk={handleApply}
      width={600}
      footer={[]}
    >
      {activeLayerId === null || !imageData ? (
        <Typography.Text type="warning">Нет активного слоя</Typography.Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="rgb">Цвет</Radio.Button>
            <Radio.Button value="alpha">Альфа-канал</Radio.Button>
          </Radio.Group>

          <Divider />

          <div>
            <span style={{ marginRight: 8 }}>Предустановка:</span>
            <Select
              style={{ width: 250 }}
              value={selectedPreset}
              onChange={handlePresetChange}
            >
              {presetNames.map((name) => (
                <Option key={name} value={name}>
                  {getPresetRusName(name)}
                </Option>
              ))}
            </Select>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 60px)",
              gap: 5,
              justifyContent: "center",
            }}
          >
            {matrix.map((row, i) =>
              row.map((val, j) => (
                <InputNumber
                  key={`${i}-${j}`}
                  value={val}
                  onChange={(val) => handleMatrixInput(i, j, val)}
                  style={{ width: 60, textAlign: "center" }}
                  step={0.1}
                />
              )),
            )}
          </div>
          {previewImageURL && (
            <Image
              src={previewImageURL}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                objectFit: "contain",
              }}
            />
          )}
          <Divider />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button key="reset" onClick={handleReset}>
              Сбросить
            </Button>

            <Button key="preview" onClick={createPreview}>
              Предпросмотр
            </Button>

            <Button key="apply" type="primary" onClick={handleApply}>
              Применить
            </Button>
          </div>
        </Space>
      )}
    </Modal>
  );
}
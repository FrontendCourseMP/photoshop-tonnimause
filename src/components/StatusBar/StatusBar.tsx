import { Select } from "antd";
import { useImage } from "../../contexts/ImageContext";
import styles from "./StatusBar.module.scss";
import { useLayers, type Layer } from "../../contexts/LayersContext";
import { useEffect, useState } from "react";

const scaleOptions = [
  { value: 0.12, label: "12%" },
  { value: 0.25, label: "25%" },
  { value: 0.5, label: "50%" },
  { value: 0.75, label: "75%" },
  { value: 1, label: "100%" },
  { value: 1.5, label: "150%" },
  { value: 2, label: "200%" },
  { value: 3, label: "300%" },
];

export function StatusBar() {
  const { imageData, scaleValue, setScaleValue } = useImage();
  const { activeLayerId, layers } = useLayers();
  const [activeLayer, setActiveLayer] = useState<Layer | null>(null);

  useEffect(() => {
    const layer = layers.find((layer) => layer.id === activeLayerId);
    if (!layer) {
      setActiveLayer(null);
      return;
    } else setActiveLayer(layer);
  }, [activeLayerId, layers]);

  // Получаем полный список опций с текущим значением
  const getScaleOptions = () => {
    const hasCurrentValue = scaleOptions.some(opt => opt.value === scaleValue);
    if (!hasCurrentValue && imageData) {
      return [
        ...scaleOptions,
        { value: scaleValue, label: `${Math.round(scaleValue * 100)}%` }
      ];
    }
    return scaleOptions;
  };

  return (
    <div className={styles.statusBar}>
      <div className={styles.statusItem}>
        <span className={styles.label}>Размер:</span>
        <span className={styles.value}>
          {activeLayer
            ? `${activeLayer.originalImageData?.width} × ${activeLayer.originalImageData?.height} пикселей`
            : "—"}
        </span>
      </div>

      <div className={styles.statusItem}>
        <span className={styles.label}>Глубина цвета:</span>
        <span className={styles.value}>
          {activeLayer && activeLayer.colorDepth
            ? `${activeLayer.colorDepth} бит`
            : "—"}
        </span>
      </div>

      <div className={styles.statusItem}>
        <span className={styles.label}>Масштаб:</span>
        <Select<number>
          value={scaleValue}
          onChange={setScaleValue}
          options={getScaleOptions()}
          className={styles.scaleSelect}
          disabled={!imageData}
          // dropdownMatchSelectWidth={false}
        />
      </div>
    </div>
  );
}

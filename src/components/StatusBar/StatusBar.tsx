import { Select, Space } from "antd";
import { useImage } from "../../contexts/ImageContext";
import styles from "./StatusBar.module.scss";

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
  const { imageData, width, height, colorDepth, scaleValue, setScaleValue } = useImage();

  return (
    <div className={styles.statusBar}>
      <div className={styles.statusItem}>
        <span className={styles.label}>Размер:</span>
        <span className={styles.value}>{imageData ? `${width} × ${height} пикселей` : "—"}</span>
      </div>

      <div className={styles.statusItem}>
        <span className={styles.label}>Глубина цвета:</span>
        <span className={styles.value}>{imageData && colorDepth ? `${colorDepth} бит` : "—"}</span>
      </div>

      <div className={styles.statusItem}>
        <span className={styles.label}>Масштаб:</span>
        <Select
          value={scaleValue}
          onChange={setScaleValue}
          options={scaleOptions}
          className={styles.scaleSelect}
          disabled={!imageData}
          popupMatchSelectWidth={false}
        />
      </div>
    </div>
  );
} 

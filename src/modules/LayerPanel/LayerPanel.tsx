import React from "react";
import { Button, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useLayers } from "../../contexts/LayersContext";
import { LayerInfo } from "./components/LayerInfo/LayerInfo";
import styles from "./LayerPanel.module.scss";

export function LayerPanel() {
  const { layers, addLayer } = useLayers();

  const handleAddLayer = () => {
    if (layers.length < 2) {
      addLayer();
    }
  };

  // Отображаем слои в обратном порядке, чтобы первый слой был сверху
  const displayLayers = [...layers].reverse();

  return (
    <div className={styles.layerPanel}>
      <div className={styles.header}>
        <h3>Слои</h3>
        <Tooltip title={layers.length >= 2 ? "Максимум 2 слоя" : "Добавить слой"}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddLayer}
            disabled={layers.length >= 2}
          />
        </Tooltip>
      </div>
      
      <div className={styles.layerList}>
        {displayLayers.map((layer, index) => (
          <LayerInfo
            key={layer.id}
            layer={layer}
            index={layers.length - 1 - index} // Корректируем индекс для правильной работы кнопок перемещения
          />
        ))}
      </div>
    </div>
  );
} 

import React, { useRef } from "react";
import { Button, Select, Slider, Tooltip } from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeInvisibleFilled,
  EyeOutlined as EyeFilledOutlined,
} from "@ant-design/icons";
import { useLayers } from "../../../../contexts/LayersContext";
import type { BlendMode, Layer } from "../../../../contexts/LayersContext";
import styles from "./LayerInfo.module.scss";

interface LayerInfoProps {
  layer: Layer;
  index: number;
}

const blendModeOptions = [
  { value: "normal", label: "Нормальный" },
  { value: "multiply", label: "Умножение" },
  { value: "screen", label: "Экран" },
  { value: "overlay", label: "Перекрытие" },
];

export function LayerInfo({ layer, index }: LayerInfoProps) {
  const {
    layers,
    activeLayerId,
    setActiveLayerId,
    removeLayer,
    moveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    setLayerBlendMode,
    toggleAlphaVisibility,
    deleteAlphaChannel,
  } = useLayers();

  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = layer.id === activeLayerId;
  const isFirst = index === 0;
  const isLast = index === layers.length - 1;

  const handleClick = () => {
    setActiveLayerId(layer.id);
  };

  const handleVisibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLayerVisibility(layer.id);
  };

  const handleAlphaVisibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleAlphaVisibility(layer.id);
  };

  const handleRemoveAlpha = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAlphaChannel(layer.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeLayer(layer.id);
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLast) {
      moveLayer(layers.length - 1 - index, layers.length - 2 - index);
    }
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFirst) {
      moveLayer(layers.length - 1 - index, layers.length - index);
    }
  };

  const handleOpacityChange = (value: number) => {
    setLayerOpacity(layer.id, value);
  };

  const handleBlendModeChange = (value: BlendMode) => {
    setLayerBlendMode(layer.id, value);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.layerInfo} ${isActive ? styles.active : ""}`}
      onClick={handleClick}
    >
      <div className={styles.nameLine}>
        <div className={styles.name}>{layer.name}</div>
        <div className={styles.nameButtons}>
          <Tooltip title={layer.visible ? "Скрыть слой" : "Показать слой"} getPopupContainer={() => containerRef.current || document.body}>
            <Button
              type="text"
              size="small"
              icon={layer.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={handleVisibilityToggle}
            />
          </Tooltip>
          <Tooltip title="Удалить слой" getPopupContainer={() => containerRef.current || document.body}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
            />
          </Tooltip>
        </div>
      </div>
      <div className={styles.topLine}>
        <div className={styles.previews}>
          <div className={styles.previewContainer}>
            <div className={styles.previewLabel}>RGB</div>
            <div className={styles.preview}>
              {layer.editedImageData ? (
                <img src={layer.preview} alt={layer.name} />
              ) : (
                <div className={styles.emptyPreview} />
              )}
            </div>
          </div>
          {layer.hasAlphaChannel && (
            <div className={styles.previewContainer}>
              <div className={styles.previewLabel}>Alpha</div>
              <div className={`${styles.preview} ${styles.alpha}`}>
                <img src={layer.alphaChannelPreview} alt="Alpha channel" />
              </div>
            </div>
          )}
        </div>
        {layer.hasAlphaChannel && (
          <div className={styles.buttons}>
            <Tooltip title="Видимость альфа-канала" getPopupContainer={() => containerRef.current || document.body}>
              <Button
                type="text"
                size="small"
                icon={
                  layer.alphaChannelVisible ? (
                    <EyeFilledOutlined />
                  ) : (
                    <EyeInvisibleFilled />
                  )
                }
                onClick={handleAlphaVisibilityToggle}
              />
            </Tooltip>
            <Tooltip title="Удалить альфа-канал" getPopupContainer={() => containerRef.current || document.body}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleRemoveAlpha}
              />
            </Tooltip>
          </div>
        )}
      </div>

      <div className={styles.middleLine}>
        <div className={styles.settingGroup}>
          <span>Режим наложения</span>
          <Select
            className={styles.select}
            value={layer.blendMode}
            onChange={handleBlendModeChange}
            options={blendModeOptions}
          />
        </div>
        <div className={styles.settingGroup}>
          <span>Прозрачность</span>
          <Slider
            className={styles.slider}
            min={0}
            max={100}
            value={layer.opacity * 100}
            onChange={handleOpacityChange}
          />
        </div>
      </div>

      <div className={styles.bottomLine}>
        <Tooltip title="Переместить вверх" getPopupContainer={() => containerRef.current || document.body}>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={handleMoveUp}
            disabled={isLast}
          />
        </Tooltip>
        <Tooltip title="Переместить вниз" getPopupContainer={() => containerRef.current || document.body}>
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={handleMoveDown}
            disabled={isFirst}
          />
        </Tooltip>
      </div>
    </div>
  );
}

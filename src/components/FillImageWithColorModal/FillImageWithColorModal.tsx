import { useEffect, useState } from "react";
import { Modal, Button, Typography, Space, Divider } from "antd";
import { ChromePicker } from "react-color";
import { useLayers, type Layer } from "../../contexts/LayersContext";

const { Text } = Typography;

type InterpolationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function FillImageColorModal({
  isOpen,
  onClose,
}: InterpolationModalProps) {
  const { layers, activeLayerId, fillLayerWithColor } = useLayers();
  const [color, setColor] = useState<string>("#000000");
  const [activeLayer, setActiveLayer] = useState<Layer | null>(null);

  function onSubmit() {
    if (activeLayerId !== null && color) {
      fillLayerWithColor(activeLayerId, color);
    }
    onClose();
  }

  useEffect(() => {
    const layer = layers.find((layer) => layer.id === activeLayerId);
    if (!layer) {
      setActiveLayer(null);
      return;
    } else setActiveLayer(layer);
  }, [activeLayerId, layers]);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      onOk={onSubmit}
      title="Залить слой цветом"
      okText="Применить"
      cancelText="Отмена"
    >
      {activeLayerId === null ? (
        <Text type="warning">Активный слой не выбран</Text>
      ) : (
        <Space
          direction="vertical"
          style={{ width: "100%", alignItems: "center" }}
          size="middle"
        >
          <Text>Текущий слой: {activeLayer?.name}</Text>
          <Text>Выберите цвет</Text>
          <ChromePicker color={color} onChange={(e: any) => setColor(e.hex)} />
          <Divider />
        </Space>
      )}
    </Modal>
  );
}
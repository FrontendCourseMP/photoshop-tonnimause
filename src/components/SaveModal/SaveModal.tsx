import { useState } from "react";
import { Modal, Input, Select, Checkbox, Typography, Space } from "antd";
import { useImage } from "../../contexts/ImageContext";
import { saveGB7 } from "../../utils/SaveGB7";

const { Text } = Typography;
const { Option } = Select;

type SaveImageModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type FileType = "png" | "jpeg" | "gb7";

export function SaveImageModal({ isOpen, onClose }: SaveImageModalProps) {
  const [fileName, setFileName] = useState("image");
  const [fileType, setFileType] = useState<FileType>("png");
  const { imageData } = useImage();
  const [gb7UseMask, setGb7UseMask] = useState(false);

  function handleSave() {
    if (!imageData) return;

    if (fileType === "gb7") {
      saveGB7(imageData, fileName, gb7UseMask);
      onClose();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.${fileType}`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      },
      `image/${fileType}`,
      fileType === "jpeg" ? 0.95 : undefined,
    );
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      onOk={handleSave}
      title="Сохранение изображения"
      okText="Сохранить"
      cancelText="Отмена"
    >
      {imageData === null ? (
        <Text type="warning">Нет изображения для сохранения</Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Text>Название файла:</Text>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="image"
            />
          </div>

          <div>
            <Text>Тип файла:</Text>
            <Select
              style={{ width: "100%" }}
              value={fileType}
              onChange={(value) => setFileType(value as FileType)}
            >
              <Option value="png">PNG</Option>
              <Option value="jpeg">JPEG</Option>
              <Option value="gb7">GrayBit-7 (.gb7)</Option>
            </Select>
          </div>

          {fileType === "gb7" && (
            <Checkbox
              checked={gb7UseMask}
              onChange={(e) => setGb7UseMask(e.target.checked)}
            >
              Использовать маску
            </Checkbox>
          )}
        </Space>
      )}
    </Modal>
  );
}
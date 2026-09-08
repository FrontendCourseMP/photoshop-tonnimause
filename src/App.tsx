import { useRef, useState } from "react";
import { Button, Layout, Space, Upload, message } from "antd";
import { UploadOutlined, ExpandOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import { Canvas } from "./modules/Canvas/Canvas";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { InterpolationModal } from "./components/InterpolationModal/InterpolationModal";
import { ImageProvider, useImage } from "./contexts/ImageContext";
import { ToolProvider } from "./contexts/ToolContext";
import { InstrumentsPanel } from "./modules/InstrumentsPanel/InstrumentsPanel";
import { detectImageFormat } from "./utils/ImageTypeGetter";
import { loadGB7Image, loadStandardImage } from "./utils/loadImage";
import { getColorDepthOfImage } from "./utils/ColorDepthGetter";

const { Header, Content, Sider } = Layout;

function AppContent() {
  const { imageData, setImageData } = useImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInterpolationModalOpen, setIsInterpolationModalOpen] = useState(false);

  const handleFileChange = async (file: RcFile) => {
    console.log("Starting image load process...");
    console.log("File:", file.name, file.type);

    try {
      // Определяем формат изображения
      const format = await detectImageFormat(file);
      console.log("Detected format:", format);

      // Загружаем изображение в зависимости от формата
      const newImageData =
        format === "graybit-7"
          ? await loadGB7Image(file)
          : await loadStandardImage(file);

      console.log(
        "Image loaded:",
        newImageData
          ? `${newImageData.width}x${newImageData.height}`
          : "load failed"
      );

      if (!newImageData) {
        throw new Error("Failed to load image");
      }

      // Получаем глубину цвета
      const colorDepth = await getColorDepthOfImage(file, format);
      console.log("Color depth:", colorDepth);

      // Обновляем состояние в контексте
      setImageData(newImageData, colorDepth);

      message.success("Изображение успешно загружено");
      return false; // Prevent default upload behavior
    } catch (error) {
      console.error("Error loading image:", error);
      message.error("Ошибка при загрузке изображения");
      return Upload.LIST_IGNORE;
    }
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header style={{ padding: "0 16px", background: "#fff" }}>
        <Space>
          <Upload
            accept=".png,.jpg,.jpeg,.gb7"
            showUploadList={false}
            beforeUpload={handleFileChange}
          >
            <Button icon={<UploadOutlined />}>Загрузить изображение</Button>
          </Upload>
          <Button 
            icon={<ExpandOutlined />}
            onClick={() => setIsInterpolationModalOpen(true)}
            disabled={!imageData}
          >
            Изменить размер
          </Button>
        </Space>
      </Header>

      <Layout style={{ height: "calc(100vh - 64px)" }}>
        <Sider width={56} theme="light" style={{ borderRight: '1px solid #d9d9d9' }}>
          <InstrumentsPanel />
        </Sider>
        <Layout>
          <Content style={{ 
            display: "flex", 
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
          }}>
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <Canvas ref={canvasRef} />
            </div>
          </Content>
          <StatusBar />
        </Layout>
      </Layout>

      <InterpolationModal
        isOpen={isInterpolationModalOpen}
        onClose={() => setIsInterpolationModalOpen(false)}
      />
    </Layout>
  );
}

function App() {
  return (
    <ToolProvider>
      <ImageProvider>
        <AppContent />
      </ImageProvider>
    </ToolProvider>
  );
}

export default App;
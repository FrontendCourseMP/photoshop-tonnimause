import { Button, Layout, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import { ImageProvider } from "./contexts/ImageContext";
import { LayersProvider, useLayers } from "./contexts/LayersContext";
import { ToolProvider, useTools } from "./contexts/ToolContext";
import { ColorPickerProvider } from "./contexts/ColorPickerContext";
import { Canvas } from "./modules/Canvas/Canvas";
import { LayerPanel } from "./modules/LayerPanel/LayerPanel";
import { InstrumentsPanel } from "./modules/InstrumentsPanel/InstrumentsPanel";
import { ColorPickerWindow } from "./modules/ColorPickerWindow/ColorPickerWindow";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { detectImageFormat } from "./utils/ImageTypeGetter";
import { loadGB7Image, loadStandardImage } from "./utils/loadImage";
import { getColorDepthOfImage } from "./utils/ColorDepthGetter";
import styles from "./App.module.scss";

const { Header, Sider, Content } = Layout;

function AppContent() {
  const { addLayer, layers, activeLayerId, updateLayer } = useLayers();
  const { activeTool } = useTools();

  const handleFileChange = async (file: RcFile) => {
    try {
      const format = await detectImageFormat(file);
      console.log("Detected format:", format);

      const imageData =
        format === "graybit-7"
          ? await loadGB7Image(file)
          : await loadStandardImage(file);

      if (!imageData) {
        throw new Error("Failed to load image");
      }

      const colorDepth = await getColorDepthOfImage(file, format);
      console.log("Color depth:", colorDepth);

      // Если нет активного слоя или слоев вообще нет, создаем новый
      if (!activeLayerId || layers.length === 0) {
        addLayer(imageData);
      } else {
        // Иначе обновляем существующий активный слой
        updateLayer(activeLayerId, {
          originalImageData: imageData,
          editedImageData: imageData,
          name: file.name,
          colorDepth,
          hasAlphaChannel: true,
          alphaChannelVisible: true
        });
      }

      message.success("Изображение успешно загружено");
      return false;
    } catch (error) {
      console.error("Error loading image:", error);
      message.error("Ошибка при загрузке изображения");
      return Upload.LIST_IGNORE;
    }
  };

  return (
    <Layout className={styles.layout}>
      <Layout>
        <Header className={styles.header}>
          <Upload
            accept=".png,.jpg,.jpeg,.gb7"
            showUploadList={false}
            beforeUpload={handleFileChange}
          >
            <Button icon={<UploadOutlined />}>Загрузить изображение</Button>
          </Upload>
        </Header>
        <Layout>
          <Sider width={56} className={styles.leftSider}>
            <InstrumentsPanel />
          </Sider>
          <Content className={styles.content}>
            <Canvas />
            {activeTool === 'pipette' && <ColorPickerWindow />}
          </Content>
          <Sider width={280} className={styles.rightSider}>
            <LayerPanel />
          </Sider>
        </Layout>
        <StatusBar />
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <ToolProvider>
      <ImageProvider>
        <LayersProvider>
          <ColorPickerProvider>
            <AppContent />
          </ColorPickerProvider>
        </LayersProvider>
      </ImageProvider>
    </ToolProvider>
  );
}

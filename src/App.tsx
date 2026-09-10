import React from "react";
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
import { CorrectionModal } from "./modules/Curves/CorrectionModal/CorrectionModal";
import { InterpolationModal } from "./components/InterpolationModal/InterpolationModal";
import { FilterKernelModal } from "./components/FilterModal/FilterModal";
import { SaveImageModal } from "./components/SaveModal/SaveModal";
import { Suspense } from "react";

const LazyFillImageColorModal = React.lazy(async () => {
  const module = await import(
    "./components/FillImageWithColorModal/FillImageWithColorModal"
  );
  return { default: module.FillImageColorModal };
});

const { Header, Sider, Content } = Layout;

function AppContent() {
  const { addLayer, layers, activeLayerId, updateLayer } = useLayers();
  const { activeTool, setActiveTool } = useTools();
  const [isCorrectionModalOpen, setCorrectionModalOpen] = React.useState(false);
  const [isResizeModalOpen, setResizeModalOpen] = React.useState(false);
  const [isFilterModalOpen, setFilterModalOpen] = React.useState(false);
  const [isFillColorModalOpen, setFillColorModalOpen] = React.useState(false);
  const [isSaveModalOpen, setSaveModalOpen] = React.useState(false);

  // Настраиваем позиционирование уведомлений справа сверху над панелью слоев
  React.useEffect(() => {
    message.config({
      top: 64,
      duration: 3,
      maxCount: 3,
      rtl: false,
      getContainer: () => document.body,
    });
  }, []);

  // Открываем модальное окно интерполяции при выборе инструмента resize
  React.useEffect(() => {
    if (activeTool === 'resize') {
      setResizeModalOpen(true);
      setActiveTool(null); // Сбрасываем активный инструмент после открытия модального окна
    }
  }, [activeTool, setActiveTool]);

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
        addLayer(imageData, colorDepth);
      } else {
        // Иначе обновляем существующий активный слой
        updateLayer(activeLayerId, {
          originalImageData: imageData,
          editedImageData: imageData,
          name: file.name,
          colorDepth,
          hasAlphaChannel: true,
          alphaChannelVisible: true,
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
      <CorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
      />

      <InterpolationModal
        isOpen={isResizeModalOpen}
        onClose={() => {
          setResizeModalOpen(false);
          setActiveTool(null);
        }}
      />

      <FilterKernelModal
        isOpen={isFilterModalOpen}
        onClose={() => setFilterModalOpen(false)}
      />

      <Suspense
        fallback={
          <div style={{ color: "black", fontSize: "2rem" }}>Загрузка…</div>
        }
      >
        <LazyFillImageColorModal
          isOpen={isFillColorModalOpen}
          onClose={() => setFillColorModalOpen(false)}
        />
      </Suspense>

      <SaveImageModal
        isOpen={isSaveModalOpen}
        onClose={() => setSaveModalOpen(false)}
      />

      <Layout>
        <Header className={styles.header}>
          <Upload
            accept=".png,.jpg,.jpeg,.gb7"
            showUploadList={false}
            beforeUpload={handleFileChange}
          >
            <Button icon={<UploadOutlined />}>Загрузить изображение</Button>
          </Upload>
          <Button onClick={() => setResizeModalOpen(true)}>Интерполяция</Button>
          <Button onClick={() => setFillColorModalOpen(true)}>
            Залить цветом
          </Button>
          <Button onClick={() => setCorrectionModalOpen(true)}>
            Градационная коррекция
          </Button>
          <Button onClick={() => setFilterModalOpen(true)}>Фильтр ядром</Button>
          <Button onClick={() => setSaveModalOpen(true)}>Сохранить</Button>
        </Header>
        <Layout>
          <Sider width={56} className={styles.leftSider}>
            <InstrumentsPanel />
          </Sider>
          <Content className={styles.content}>
            <Canvas />
            {activeTool === "pipette" && <ColorPickerWindow />}
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

/**
 * Основной компонент приложения для обработки изображений
 * Поддерживает форматы PNG, JPG и кастомный GrayBit-7
 * Лабораторная работа №2: Добавлен функционал масштабирования изображений
 */

import { useState, useCallback } from "react";
import { Button, Layout, Space, Typography, Upload, message, Slider, Select } from "antd";
import { UploadOutlined, ExpandOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";

// Компоненты
import Canvas from "./components/Canvas/Canvas";
import ScaleModal from "./components/ScaleModal/ScaleModal";

// Утилиты
import { detectImageFormat, type SupportedImageFormat } from "./utils/ImageTypeGetter";
import { loadGB7Image, loadStandardImage } from "./utils/loadImage";
import { getColorDepthOfImage } from "./utils/ColorDepthGetter";
import { scaleImage, type ScaleParams, type InterpolationMethod } from "./utils/ImageInterpolation";

// Типы
interface ImageInfo {
  width: number;
  height: number;
  colorDepth: number;
}

// Константы
const SUPPORTED_FORMATS = ".png,.jpg,.jpeg,.gb7";
const UPLOAD_BUTTON_TEXT = {
  loading: "Загрузка...",
  default: "Загрузить изображение"
};

// Деструктуризация компонентов Ant Design
const { Header, Content, Footer } = Layout;
const { Text } = Typography;

/**
 * Главный компонент приложения
 */
function App(): React.JSX.Element {
  // Состояние приложения
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Состояние для масштабирования
  const [scaleModalVisible, setScaleModalVisible] = useState<boolean>(false);
  const [displayScale, setDisplayScale] = useState<number>(100);
  const [interpolationMethod, setInterpolationMethod] = useState<InterpolationMethod>('bilinear');

  /**
   * Обработчик загрузки файла
   * @param file - загружаемый файл
   * @returns false для предотвращения стандартного поведения загрузки
   */
  const handleFileChange = useCallback(async (file: RcFile): Promise<boolean> => {
    console.log("🚀 Начинаем процесс загрузки изображения...");
    console.log("📁 Файл:", file.name, "Тип:", file.type);
    
    // Сброс состояния
    setLoading(true);
    setImageData(null);
    setImageInfo(null);

    try {
      // Определяем формат изображения
      const format: SupportedImageFormat = await detectImageFormat(file);
      console.log("🔍 Определен формат:", format);

      // Загружаем изображение в зависимости от формата
      const newImageData = format === "graybit-7" 
        ? await loadGB7Image(file)
        : await loadStandardImage(file);

      console.log(
        "✅ Изображение загружено:",
        newImageData ? `${newImageData.width}x${newImageData.height}` : "ошибка загрузки"
      );

      if (!newImageData) {
        throw new Error("Не удалось загрузить изображение");
      }

      // Получаем глубину цвета
      const colorDepth = await getColorDepthOfImage(file, format);
      console.log("🎨 Глубина цвета:", colorDepth);

      // Обновляем состояние
      setImageData(newImageData);
      setOriginalImageData(newImageData); // Сохраняем оригинальное изображение
      setImageInfo({
        width: newImageData.width,
        height: newImageData.height,
        colorDepth,
      });
      setDisplayScale(100); // Сбрасываем масштаб отображения

      message.success("✅ Изображение успешно загружено");
      return false; // Предотвращаем стандартное поведение загрузки
    } catch (error) {
      console.error("❌ Ошибка при загрузке изображения:", error);
      message.error("❌ Ошибка при загрузке изображения");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Обработчик готовности canvas
   */
  const handleCanvasReady = useCallback((): void => {
    console.log("🎨 Canvas готов к работе");
  }, []);

  /**
   * Обработчик открытия модального окна масштабирования
   */
  const handleOpenScaleModal = useCallback((): void => {
    if (!originalImageData) {
      message.warning("⚠️ Сначала загрузите изображение");
      return;
    }
    setScaleModalVisible(true);
  }, [originalImageData]);

  /**
   * Обработчик закрытия модального окна масштабирования
   */
  const handleCloseScaleModal = useCallback((): void => {
    setScaleModalVisible(false);
  }, []);

  /**
   * Обработчик применения масштабирования
   */
  const handleApplyScaling = useCallback((params: ScaleParams) => {
    if (!originalImageData) {
      message.error("❌ Нет исходного изображения для масштабирования");
      return;
    }

    try {
      console.log("🔄 Применяем масштабирование:", params);
      
      // Применяем масштабирование
      const scaledImageData = scaleImage(originalImageData, params);
      
      // Обновляем состояние
      setImageData(scaledImageData);
      setImageInfo({
        width: scaledImageData.width,
        height: scaledImageData.height,
        colorDepth: imageInfo?.colorDepth || 24
      });
      
      setScaleModalVisible(false);
      message.success("✅ Изображение успешно масштабировано");
    } catch (error) {
      console.error("❌ Ошибка при масштабировании:", error);
      message.error("❌ Ошибка при масштабировании изображения");
    }
  }, [originalImageData, imageInfo]);

  /**
   * Обработчик изменения масштаба отображения
   */
  const handleDisplayScaleChange = useCallback((value: number) => {
    setDisplayScale(value);
  }, []);

  /**
   * Обработчик изменения метода интерполяции
   */
  const handleInterpolationMethodChange = useCallback((value: InterpolationMethod) => {
    setInterpolationMethod(value);
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Заголовок с кнопками управления */}
      <Header style={{ padding: "0 16px", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <Space wrap>
          <Upload
            accept={SUPPORTED_FORMATS}
            showUploadList={false}
            beforeUpload={handleFileChange}
            disabled={loading}
          >
            <Button 
              type="primary"
              icon={<UploadOutlined />} 
              loading={loading}
              disabled={loading}
              size="large"
            >
              {loading ? UPLOAD_BUTTON_TEXT.loading : UPLOAD_BUTTON_TEXT.default}
            </Button>
          </Upload>
          
          {/* Кнопка масштабирования */}
          <Button
            icon={<ExpandOutlined />}
            onClick={handleOpenScaleModal}
            disabled={!imageData || loading}
            size="large"
          >
            Изменить размер
          </Button>
          
          {/* Элементы управления масштабом отображения */}
          {imageData && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong>Масштаб:</Text>
                <Slider
                  min={12}
                  max={300}
                  value={displayScale}
                  onChange={handleDisplayScaleChange}
                  style={{ width: 120 }}
                  tooltip={{ formatter: (value) => `${value}%` }}
                />
                <Text>{displayScale}%</Text>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong>Интерполяция:</Text>
                <Select
                  value={interpolationMethod}
                  onChange={handleInterpolationMethodChange}
                  style={{ width: 150 }}
                  options={[
                    { value: 'bilinear', label: 'Билинейная' },
                    { value: 'nearest-neighbor', label: 'Ближайший сосед' }
                  ]}
                />
              </div>
            </>
          )}
        </Space>
      </Header>

      {/* Основной контент с canvas */}
      <Content style={{ padding: "16px", display: "flex", flex: 1 }}>
        {imageData && (
          <Canvas 
            imageData={imageData} 
            onCanvasReady={handleCanvasReady}
            displayScale={displayScale}
            interpolationMethod={interpolationMethod}
          />
        )}
      </Content>

      {/* Подвал с информацией об изображении */}
      <Footer style={{ 
        textAlign: "center", 
        padding: "10px 16px", 
        background: "#f5f5f5",
        borderTop: "1px solid #d9d9d9",
        position: 'sticky',
        bottom: 0
      }}>
        {imageInfo ? (
          <Space split={<Text type="secondary">|</Text>}>
            <Text strong>Ширина: {imageInfo.width}px</Text>
            <Text strong>Высота: {imageInfo.height}px</Text>
            <Text strong>Глубина цвета: {imageInfo.colorDepth} бит</Text>
          </Space>
        ) : (
          <Text type="secondary">Выберите изображение для отображения информации</Text>
        )}
      </Footer>

      {/* Модальное окно масштабирования */}
      <ScaleModal
        visible={scaleModalVisible}
        onCancel={handleCloseScaleModal}
        onApply={handleApplyScaling}
        originalImageData={originalImageData}
      />
    </Layout>
  );
}

export default App;
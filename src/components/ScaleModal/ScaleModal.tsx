/**
 * Модальное окно для изменения масштаба изображения
 * Поддерживает различные единицы измерения и алгоритмы интерполяции
 */

import { useState, useEffect, useCallback } from "react";
import { Modal, Form, InputNumber, Select, Checkbox, Button, Space, Typography, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { InterpolationMethod, ScaleParams } from "../../utils/ImageInterpolation";
import { calculateMegapixels, validateScaleParams } from "../../utils/ImageInterpolation";

// Типы
interface ScaleModalProps {
  visible: boolean;
  onCancel: () => void;
  onApply: (params: ScaleParams) => void;
  originalImageData: ImageData | null;
}

type UnitType = 'pixels' | 'percent';

// Константы
const INTERPOLATION_METHODS: { value: InterpolationMethod; label: string; description: string }[] = [
  {
    value: 'nearest-neighbor',
    label: 'Ближайший сосед',
    description: 'Быстрый метод, сохраняет четкость пикселей. Подходит для пиксельной графики.'
  },
  {
    value: 'bilinear',
    label: 'Билинейная',
    description: 'Плавное масштабирование с сглаживанием. Лучше для фотографий.'
  }
];

/**
 * Компонент модального окна для масштабирования
 */
function ScaleModal({ visible, onCancel, onApply, originalImageData }: ScaleModalProps): React.JSX.Element {
  const [form] = Form.useForm();
  
  // Состояние формы
  const [unit, setUnit] = useState<UnitType>('pixels');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [interpolationMethod, setInterpolationMethod] = useState<InterpolationMethod>('bilinear');
  
  // Вычисляемые значения
  const originalWidth = originalImageData?.width || 0;
  const originalHeight = originalImageData?.height || 0;
  const originalMegapixels = calculateMegapixels(originalWidth, originalHeight);
  
  /**
   * Обработчик изменения единиц измерения
   */
  const handleUnitChange = useCallback((value: UnitType) => {
    setUnit(value);
    
    if (value === 'percent') {
      // Переводим в проценты
      form.setFieldsValue({
        width: 100,
        height: 100
      });
    } else {
      // Переводим в пиксели
      form.setFieldsValue({
        width: originalWidth,
        height: originalHeight
      });
    }
  }, [form, originalWidth, originalHeight]);
  
  /**
   * Обработчик изменения ширины с сохранением пропорций
   */
  const handleWidthChange = useCallback((value: number | null) => {
    if (maintainAspectRatio && value && originalWidth > 0) {
      const newHeight = Math.round((value * originalHeight) / originalWidth);
      form.setFieldsValue({ height: newHeight });
    }
  }, [form, maintainAspectRatio, originalWidth, originalHeight]);
  
  /**
   * Обработчик изменения высоты с сохранением пропорций
   */
  const handleHeightChange = useCallback((value: number | null) => {
    if (maintainAspectRatio && value && originalHeight > 0) {
      const newWidth = Math.round((value * originalWidth) / originalHeight);
      form.setFieldsValue({ width: newWidth });
    }
  }, [form, maintainAspectRatio, originalWidth, originalHeight]);
  
  /**
   * Обработчик применения изменений
   */
  const handleApply = useCallback(() => {
    form.validateFields().then((values) => {
      let { width, height } = values;
      
      // Конвертируем проценты в пиксели
      if (unit === 'percent') {
        width = Math.round((width * originalWidth) / 100);
        height = Math.round((height * originalHeight) / 100);
      }
      
      const params: ScaleParams = {
        width,
        height,
        method: interpolationMethod,
        maintainAspectRatio
      };
      
      // Валидация параметров
      const validation = validateScaleParams(params);
      if (!validation.isValid) {
        console.error("❌ Ошибки валидации:", validation.errors);
        return;
      }
      
      console.log("✅ Применяем параметры масштабирования:", params);
      onApply(params);
    }).catch((errorInfo) => {
      console.error("❌ Ошибка валидации формы:", errorInfo);
    });
  }, [form, unit, originalWidth, originalHeight, interpolationMethod, maintainAspectRatio, onApply]);
  
  /**
   * Вычисляет новые мегапиксели на основе текущих значений формы
   */
  const getNewMegapixels = useCallback(() => {
    const values = form.getFieldsValue();
    let { width, height } = values;
    
    if (!width || !height) return 0;
    
    if (unit === 'percent') {
      width = Math.round((width * originalWidth) / 100);
      height = Math.round((height * originalHeight) / 100);
    }
    
    return calculateMegapixels(width, height);
  }, [form, unit, originalWidth, originalHeight]);
  
  // Инициализация формы при открытии модального окна
  useEffect(() => {
    if (visible && originalImageData) {
      form.setFieldsValue({
        width: originalWidth,
        height: originalHeight
      });
    }
  }, [visible, originalImageData, form, originalWidth, originalHeight]);
  
  return (
    <Modal
      title="Изменение размера изображения"
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Отмена
        </Button>,
        <Button key="apply" type="primary" onClick={handleApply}>
          Применить
        </Button>
      ]}
    >
      <Form form={form} layout="vertical" preserve={false}>
        {/* Информация о текущем изображении */}
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <Typography.Text strong>Текущее изображение:</Typography.Text>
          <br />
          <Typography.Text type="secondary">
            {originalWidth} × {originalHeight} пикселей ({originalMegapixels} МП)
          </Typography.Text>
        </div>
        
        {/* Единицы измерения */}
        <Form.Item label="Единицы измерения" name="unit">
          <Select
            value={unit}
            onChange={handleUnitChange}
            options={[
              { value: 'pixels', label: 'Пиксели' },
              { value: 'percent', label: 'Проценты' }
            ]}
          />
        </Form.Item>
        
        {/* Размеры */}
        <Form.Item label="Размеры">
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="width"
              style={{ width: '50%', margin: 0 }}
              rules={[
                { required: true, message: 'Введите ширину' },
                { type: 'number', min: 1, message: 'Ширина должна быть больше 0' },
                { type: 'number', max: 10000, message: 'Ширина не должна превышать 10000' }
              ]}
            >
              <InputNumber
                placeholder="Ширина"
                style={{ width: '100%' }}
                onChange={handleWidthChange}
                min={1}
                max={10000}
                addonAfter={unit === 'percent' ? '%' : 'px'}
              />
            </Form.Item>
            <Form.Item
              name="height"
              style={{ width: '50%', margin: 0 }}
              rules={[
                { required: true, message: 'Введите высоту' },
                { type: 'number', min: 1, message: 'Высота должна быть больше 0' },
                { type: 'number', max: 10000, message: 'Высота не должна превышать 10000' }
              ]}
            >
              <InputNumber
                placeholder="Высота"
                style={{ width: '100%' }}
                onChange={handleHeightChange}
                min={1}
                max={10000}
                addonAfter={unit === 'percent' ? '%' : 'px'}
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>
        
        {/* Сохранение пропорций */}
        <Form.Item>
          <Checkbox
            checked={maintainAspectRatio}
            onChange={(e) => setMaintainAspectRatio(e.target.checked)}
          >
            Сохранить пропорции
          </Checkbox>
        </Form.Item>
        
        {/* Алгоритм интерполяции */}
        <Form.Item label="Алгоритм интерполяции">
          <Select
            value={interpolationMethod}
            onChange={setInterpolationMethod}
            options={INTERPOLATION_METHODS.map(method => ({
              value: method.value,
              label: (
                <Space>
                  {method.label}
                  <Tooltip title={method.description}>
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
              )
            }))}
          />
        </Form.Item>
        
        {/* Предварительный расчет */}
        <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 6 }}>
          <Typography.Text strong>Новое изображение:</Typography.Text>
          <br />
          <Typography.Text type="secondary">
            {getNewMegapixels()} МП
          </Typography.Text>
        </div>
      </Form>
    </Modal>
  );
}

export default ScaleModal;

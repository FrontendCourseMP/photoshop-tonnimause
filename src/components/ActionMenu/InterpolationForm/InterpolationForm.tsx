import { useEffect } from "react";
import { Form, InputNumber, Select, Checkbox, Tooltip, Space, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useImage } from "../../../contexts/ImageContext";
import styles from "./InterpolationForm.module.scss";

const { Text } = Typography;

interface InterpolationFormProps {
  onSubmit: (values: InterpolationFormValues) => void;
}

export interface InterpolationFormValues {
  width: number;
  height: number;
  unit: "pixels" | "percent";
  maintainAspectRatio: boolean;
  interpolationMethod: "nearest" | "bilinear";
}

const interpolationMethods = {
  nearest: {
    label: "Ближайший сосед",
    description: "Быстрый метод, хорош для увеличения пиксельной графики. Может создавать эффект пикселизации.",
  },
  bilinear: {
    label: "Билинейная",
    description: "Сглаженный результат, подходит для фотографий. Может немного размывать детали.",
  },
};

export function InterpolationForm({ onSubmit }: InterpolationFormProps) {
  const { imageData, width: originalWidth, height: originalHeight } = useImage();
  const [form] = Form.useForm<InterpolationFormValues>();

  const originalPixels = originalWidth * originalHeight;
  const currentValues = form.getFieldsValue();
  const newPixels = currentValues.width * currentValues.height;

  // Обработчик изменения ширины
  const handleWidthChange = (newWidth: number | null) => {
    if (!newWidth) return;

    const values = form.getFieldsValue();
    if (values.maintainAspectRatio) {
      const aspectRatio = originalWidth / originalHeight;
      const newHeight = Math.round(newWidth / aspectRatio);
      form.setFieldValue("height", newHeight);
    }
  };

  // Обработчик изменения высоты
  const handleHeightChange = (newHeight: number | null) => {
    if (!newHeight) return;

    const values = form.getFieldsValue();
    if (values.maintainAspectRatio) {
      const aspectRatio = originalWidth / originalHeight;
      const newWidth = Math.round(newHeight * aspectRatio);
      form.setFieldValue("width", newWidth);
    }
  };

  // Обработчик изменения единиц измерения
  const handleUnitChange = (newUnit: "pixels" | "percent") => {
    const values = form.getFieldsValue();
    if (newUnit === "percent") {
      form.setFieldsValue({
        width: Math.round((values.width / originalWidth) * 100),
        height: Math.round((values.height / originalHeight) * 100),
      });
    } else {
      form.setFieldsValue({
        width: Math.round((values.width / 100) * originalWidth),
        height: Math.round((values.height / 100) * originalHeight),
      });
    }
  };

  // Инициализация формы
  useEffect(() => {
    form.setFieldsValue({
      width: originalWidth,
      height: originalHeight,
      unit: "pixels",
      maintainAspectRatio: true,
      interpolationMethod: "bilinear",
    });
  }, [form, originalWidth, originalHeight]);

  const validateDimension = (_: any, value: number) => {
    const unit = form.getFieldValue("unit");
    if (unit === "pixels") {
      if (value < 1) {
        return Promise.reject("Значение должно быть больше 0");
      }
      if (value > 10000) {
        return Promise.reject("Значение не должно превышать 10000 пикселей");
      }
    } else {
      if (value < 1) {
        return Promise.reject("Значение должно быть больше 0%");
      }
      if (value > 1000) {
        return Promise.reject("Значение не должно превышать 1000%");
      }
    }
    return Promise.resolve();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      className={styles.form}
    >
      <div className={styles.pixelInfo}>
        <Text>Исходный размер: {(originalPixels / 1000000).toFixed(2)} Мп</Text>
        <Text>Новый размер: {(newPixels / 1000000).toFixed(2)} Мп</Text>
      </div>

      <Form.Item label="Единицы измерения" name="unit">
        <Select onChange={handleUnitChange}>
          <Select.Option value="pixels">Пиксели</Select.Option>
          <Select.Option value="percent">Проценты</Select.Option>
        </Select>
      </Form.Item>

      <Space className={styles.dimensions}>
        <Form.Item
          label="Ширина"
          name="width"
          rules={[
            { required: true, message: "Введите ширину" },
            { validator: validateDimension },
          ]}
        >
          <InputNumber
            onChange={handleWidthChange}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          label="Высота"
          name="height"
          rules={[
            { required: true, message: "Введите высоту" },
            { validator: validateDimension },
          ]}
        >
          <InputNumber
            onChange={handleHeightChange}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Space>

      <Form.Item
        name="maintainAspectRatio"
        valuePropName="checked"
      >
        <Checkbox>Сохранять пропорции</Checkbox>
      </Form.Item>

      <Form.Item
        label="Метод интерполяции"
        name="interpolationMethod"
      >
        <Select>
          {Object.entries(interpolationMethods).map(([value, { label, description }]) => (
            <Select.Option key={value} value={value}>
              <Tooltip title={description}>
                <Space>
                  {label}
                  <InfoCircleOutlined />
                </Space>
              </Tooltip>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );
} 

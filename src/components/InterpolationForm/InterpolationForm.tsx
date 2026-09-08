import { useEffect, useMemo, useState } from "react";
import { Form, InputNumber, Select, Checkbox, Tooltip, Space, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useImage } from "../../contexts/ImageContext";
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
  const [formValues, setFormValues] = useState<InterpolationFormValues>({
    width: originalWidth,
    height: originalHeight,
    unit: "pixels",
    maintainAspectRatio: true,
    interpolationMethod: "bilinear",
  });

  const originalPixels = originalWidth * originalHeight;

  // Вычисляем новый размер в пикселях
  const newPixels = useMemo(() => {
    if (!formValues.width || !formValues.height) return 0;

    if (formValues.unit === "pixels") {
      return formValues.width * formValues.height;
    } else {
      const newWidth = Math.round((originalWidth * formValues.width) / 100);
      const newHeight = Math.round((originalHeight * formValues.height) / 100);
      return newWidth * newHeight;
    }
  }, [formValues, originalWidth, originalHeight]);

  // Обработчик изменения ширины
  const handleWidthChange = (newWidth: number | null) => {
    if (!newWidth) return;

    const values = form.getFieldsValue();
    let newValues = { ...values, width: newWidth };

    if (values.maintainAspectRatio) {
      if (values.unit === "percent") {
        newValues.height = newWidth;
      } else {
        const aspectRatio = originalWidth / originalHeight;
        const newHeight = Math.round(newWidth / aspectRatio);
        newValues.height = newHeight;
      }
    }

    form.setFieldsValue(newValues);
    setFormValues(newValues);
  };

  // Обработчик изменения высоты
  const handleHeightChange = (newHeight: number | null) => {
    if (!newHeight) return;

    const values = form.getFieldsValue();
    let newValues = { ...values, height: newHeight };

    if (values.maintainAspectRatio) {
      if (values.unit === "percent") {
        newValues.width = newHeight;
      } else {
        const aspectRatio = originalWidth / originalHeight;
        const newWidth = Math.round(newHeight * aspectRatio);
        newValues.width = newWidth;
      }
    }

    form.setFieldsValue(newValues);
    setFormValues(newValues);
  };

  // Обработчик изменения единиц измерения
  const handleUnitChange = (newUnit: "pixels" | "percent") => {
    const newValues = {
      ...form.getFieldsValue(),
      unit: newUnit,
      width: newUnit === "percent" ? 100 : originalWidth,
      height: newUnit === "percent" ? 100 : originalHeight,
    };
    form.setFieldsValue(newValues);
    setFormValues(newValues);
  };

  // Обработчик изменения сохранения пропорций
  const handleMaintainAspectRatioChange = (checked: boolean) => {
    const values = form.getFieldsValue();
    let newValues = { ...values, maintainAspectRatio: checked };

    if (checked && values.unit === "percent") {
      const maxValue = Math.max(values.width, values.height);
      newValues = {
        ...newValues,
        width: maxValue,
        height: maxValue,
      };
      form.setFieldsValue(newValues);
    }
    setFormValues(newValues);
  };

  // Инициализация формы
  useEffect(() => {
    const initialValues: InterpolationFormValues = {
  width: originalWidth,
  height: originalHeight,
  unit: "pixels",
  maintainAspectRatio: true,
  interpolationMethod: "bilinear",
};
    form.setFieldsValue(initialValues);
    setFormValues(initialValues);
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

  // Обработчик изменения любого поля формы
  const handleFormChange = () => {
    setFormValues(form.getFieldsValue());
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      className={styles.form}
      id="interpolationForm"
      onValuesChange={handleFormChange}
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
        <Checkbox onChange={(e) => handleMaintainAspectRatioChange(e.target.checked)}>
          Сохранять пропорции
        </Checkbox>
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

interface GB7Header {
  version: number;
  hasMask: boolean;
  width: number;
  height: number;
}

interface GB7Pixels {
  header: GB7Header;
  pixels: Uint8Array;
}

function parseGB7Header(buffer: ArrayBuffer): GB7Header | null {
  const view = new DataView(buffer);

  // Проверяем сигнатуру
  const signature = new Uint8Array(buffer, 0, 4);
  if (
    signature[0] !== 0x47 || // G
    signature[1] !== 0x42 || // B
    signature[2] !== 0x37 || // 7
    signature[3] !== 0x1d    // разделитель
  ) {
    return null;
  }

  // Читаем версию и флаги
  const version = view.getUint8(4);
  const flags = view.getUint8(5);
  const hasMask = (flags & 0x01) === 0x01;

  // Читаем размеры
  const width = view.getUint16(6, false);  // big-endian
  const height = view.getUint16(8, false); // big-endian

  return {
    version,
    hasMask,
    width,
    height,
  };
}

export function parseGB7Pixels(buffer: ArrayBuffer): GB7Pixels | null {
  const header = parseGB7Header(buffer);
  if (!header) return null;

  const pixels = new Uint8Array(
    buffer,
    12, // размер заголовка
    header.width * header.height,
  );

  return {
    header,
    pixels,
  };
}

export async function getGB7ImageData(
  gb7: GB7Pixels,
): Promise<ImageData | null> {
  const { header, pixels } = gb7;
  const { width, height, hasMask } = header;

  // Создаем ImageData для результата
  const imageData = new ImageData(width, height);
  const data = imageData.data;

  // Конвертируем каждый пиксель
  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    const value = (pixel & 0x7f) * 2; // 7 бит -> 8 бит
    const mask = hasMask ? (pixel & 0x80) !== 0 : true;

    const offset = i * 4;
    data[offset + 0] = value;     // R
    data[offset + 1] = value;     // G
    data[offset + 2] = value;     // B
    data[offset + 3] = mask ? 255 : 0; // A
  }

  return imageData;
}

export async function saveGB7(
  imageData: ImageData,
  fileName: string,
  useMask: boolean = false,
): Promise<void> {
  const { width, height, data } = imageData;

  // Создаем буфер для файла
  const fileSize = 12 + width * height; // заголовок + пиксели
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Записываем сигнатуру
  bytes[0] = 0x47; // G
  bytes[1] = 0x42; // B
  bytes[2] = 0x37; // 7
  bytes[3] = 0x1d; // разделитель

  // Записываем версию и флаги
  view.setUint8(4, 0x01); // версия
  view.setUint8(5, useMask ? 0x01 : 0x00); // флаги

  // Записываем размеры
  view.setUint16(6, width, false);  // big-endian
  view.setUint16(8, height, false); // big-endian

  // Записываем зарезервированные байты
  view.setUint16(10, 0x0000, false);

  // Конвертируем и записываем пиксели
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const r = data[offset + 0];
    const a = data[offset + 3];

    let pixel = Math.round(r / 2) & 0x7f; // 8 бит -> 7 бит
    if (useMask && a >= 128) {
      pixel |= 0x80;
    }

    bytes[12 + i] = pixel;
  }

  // Создаем и скачиваем файл
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.gb7`;
  a.click();
  URL.revokeObjectURL(url);
} 

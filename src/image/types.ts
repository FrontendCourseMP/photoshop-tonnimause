/** Метаданные исходного файла не зависят от 8-битного RGBA-буфера браузера. */
export interface ImageMetadata {
  format: 'PNG' | 'JPEG' | 'GB7';
  width: number;
  height: number;
  bitsPerSample: number;
  colorBits: number;
  alphaBits: number;
  colorModel: string;
  transparency: 'none' | 'alpha' | 'key' | 'palette' | 'mask';
}

/** Несжатые пиксели по строкам. Кодеки не зависят от canvas. */
export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>;
}

export interface ImageDocument {
  name: string;
  source: ImageMetadata;
  pixels: ImageData;
}

/** Source metadata is independent of the browser's 8-bit RGBA display buffer. */
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

/** Uncompressed pixels in row order. Pure codecs do not depend on a DOM canvas. */
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

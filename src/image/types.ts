/** Source metadata is independent of the browser's 8-bit RGBA display buffer. */
export interface ImageMetadata {
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
  bitsPerSample: number;
  colorBits: number;
  alphaBits: number;
  colorModel: string;
  transparency: 'none' | 'alpha' | 'key' | 'palette';
}

export interface ImageDocument {
  name: string;
  source: ImageMetadata;
  pixels: ImageData;
}

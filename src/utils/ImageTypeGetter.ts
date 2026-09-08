export type SupportedImageFormat = "jpeg" | "png" | "graybit-7";

const SIGNATURES: Record<SupportedImageFormat, number[]> = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  "graybit-7": [0x47, 0x42, 0x37, 0x1d],
};

function getExtensionBasedType(file: File): SupportedImageFormat | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  if (ext === "png") return "png";
  if (ext === "gb7") return "graybit-7";
  return null;
}

function getSignatureBasedType(
  buffer: ArrayBuffer,
): SupportedImageFormat | null {
  const bytes = new Uint8Array(buffer);

  for (const [format, signature] of Object.entries(SIGNATURES)) {
    const match = signature.every((byte, index) => bytes[index] === byte);
    if (match) return format as SupportedImageFormat;
  }

  return null;
}

export async function detectImageFormat(
  file: File,
): Promise<SupportedImageFormat> {
  const extType = getExtensionBasedType(file);
  if (!extType) {
    throw new Error("Unknown file extension");
  }

  const buffer = await file.slice(0, 12).arrayBuffer();
  const sigType = getSignatureBasedType(buffer);

  if (!sigType) {
    throw new Error("File signature does not match any known format");
  }

  if (extType !== sigType) {
    throw new Error(
      `File extension (${extType}) does not match signature format (${sigType})`,
    );
  }

  return sigType;
} 
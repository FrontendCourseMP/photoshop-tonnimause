export function fitZoom(width: number, height: number, availableWidth: number, availableHeight: number): number {
  const fit = Math.min(1, Math.max(1, availableWidth - 100) / width, Math.max(1, availableHeight - 100) / height);
  return Math.max(12, Math.min(300, Math.floor(fit * 10000) / 100));
}

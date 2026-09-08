/**
 * Настройка тестовой среды
 */

import '@testing-library/jest-dom'

// Мокаем canvas для тестов
const mockCanvasContext = {
  putImageData: vi.fn(),
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  })),
  createImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  })),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high'
}

// Мокаем HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvasContext)
})

// Мокаем createElement для canvas
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName) => {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement.call(document, tagName)
    canvas.getContext = vi.fn(() => mockCanvasContext)
    return canvas
  }
  return originalCreateElement.call(document, tagName)
})

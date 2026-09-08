/**
 * Базовые тесты для проверки работоспособности
 */

import { describe, it, expect } from 'vitest'
import { calculateMegapixels, validateScaleParams, type ScaleParams } from '../resizeImage'

describe('Basic functionality tests', () => {
  it('should calculate megapixels correctly', () => {
    expect(calculateMegapixels(1000, 1000)).toBe(1)
    expect(calculateMegapixels(2000, 1500)).toBe(3)
    expect(calculateMegapixels(1920, 1080)).toBe(2.07)
  })

  it('should validate scale parameters', () => {
    const validParams: ScaleParams = {
      width: 100,
      height: 100,
      method: 'bilinear',
      maintainAspectRatio: false
    }
    
    const result = validateScaleParams(validParams)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject invalid parameters', () => {
    const invalidParams: ScaleParams = {
      width: -1,
      height: 0,
      method: 'bilinear',
      maintainAspectRatio: false
    }
    
    const result = validateScaleParams(invalidParams)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should handle edge cases', () => {
    expect(calculateMegapixels(0, 0)).toBe(0)
    expect(calculateMegapixels(1, 1)).toBe(0)
  })
})

/**
 * Упрощенные тесты для алгоритмов интерполяции
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateMegapixels,
  validateScaleParams,
  clearInterpolationCache,
  getCacheSize,
  type ScaleParams
} from '../resizeImage'

describe('resizeImage - Simple Tests', () => {
  beforeEach(() => {
    clearInterpolationCache()
  })

  describe('calculateMegapixels', () => {
    it('should calculate megapixels correctly', () => {
      expect(calculateMegapixels(1000, 1000)).toBe(1)
      expect(calculateMegapixels(2000, 1500)).toBe(3)
      expect(calculateMegapixels(1920, 1080)).toBe(2.07)
      expect(calculateMegapixels(100, 100)).toBe(0.01)
    })

    it('should handle edge cases', () => {
      expect(calculateMegapixels(0, 0)).toBe(0)
      expect(calculateMegapixels(1, 1)).toBe(0)
      expect(calculateMegapixels(100, 1)).toBe(0)
    })
  })

  describe('validateScaleParams', () => {
    it('should validate correct parameters', () => {
      const params: ScaleParams = {
        width: 100,
        height: 100,
        method: 'bilinear',
        maintainAspectRatio: false
      }
      
      const result = validateScaleParams(params)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative dimensions', () => {
      const params: ScaleParams = {
        width: -1,
        height: 100,
        method: 'bilinear',
        maintainAspectRatio: false
      }
      
      const result = validateScaleParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Ширина должна быть больше 0')
    })

    it('should reject zero dimensions', () => {
      const params: ScaleParams = {
        width: 100,
        height: 0,
        method: 'bilinear',
        maintainAspectRatio: false
      }
      
      const result = validateScaleParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Высота должна быть больше 0')
    })

    it('should reject too large dimensions', () => {
      const params: ScaleParams = {
        width: 15000,
        height: 100,
        method: 'bilinear',
        maintainAspectRatio: false
      }
      
      const result = validateScaleParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Ширина не должна превышать 10000 пикселей')
    })
  })

  describe('cache management', () => {
    it('should clear cache', () => {
      expect(getCacheSize()).toBe(0)
    })

    it('should return cache size', () => {
      expect(getCacheSize()).toBe(0)
    })
  })
})

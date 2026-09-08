import React, { createContext, useContext, useState } from 'react';
import { rgbToXyz, xyzToLab, rgbaToOklch, getContrast } from '../utils/colorSpaces';

interface ColorInfo {
  rgb: [number, number, number, number]; // [r, g, b, a]
  xyz: [number, number, number];
  lab: [number, number, number];
  oklch: [number, number, number];
  coords: { x: number; y: number };
}

interface ColorPickerContextType {
  firstColor: ColorInfo | null;
  secondColor: ColorInfo | null;
  contrast: number | null;
  setFirstColor: (rgb: [number, number, number, number], coords: { x: number; y: number }) => void;
  setSecondColor: (rgb: [number, number, number, number], coords: { x: number; y: number }) => void;
  clearColors: () => void;
}

const ColorPickerContext = createContext<ColorPickerContextType | null>(null);

export function useColorPicker() {
  const context = useContext(ColorPickerContext);
  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider');
  }
  return context;
}

export function ColorPickerProvider({ children }: { children: React.ReactNode }) {
  const [firstColor, setFirstColorState] = useState<ColorInfo | null>(null);
  const [secondColor, setSecondColorState] = useState<ColorInfo | null>(null);
  const [contrast, setContrast] = useState<number | null>(null);

  const calculateColorInfo = (rgb: [number, number, number, number], coords: { x: number; y: number }): ColorInfo => {
    const [r, g, b] = rgb;
    const xyz = rgbToXyz(r, g, b) as [number, number, number];
    const lab = xyzToLab(xyz[0], xyz[1], xyz[2]) as [number, number, number];
    const oklchResult = rgbaToOklch(r, g, b);
    const oklch: [number, number, number] = [oklchResult.l, oklchResult.c, oklchResult.h];

    return {
      rgb,
      xyz,
      lab,
      oklch,
      coords,
    };
  };

  const setFirstColor = (rgb: [number, number, number, number], coords: { x: number; y: number }) => {
    const colorInfo = calculateColorInfo(rgb, coords);
    setFirstColorState(colorInfo);
    updateContrast(colorInfo, secondColor);
  };

  const setSecondColor = (rgb: [number, number, number, number], coords: { x: number; y: number }) => {
    const colorInfo = calculateColorInfo(rgb, coords);
    setSecondColorState(colorInfo);
    updateContrast(firstColor, colorInfo);
  };

  const updateContrast = (color1: ColorInfo | null, color2: ColorInfo | null) => {
    if (color1 && color2) {
      const [r1, g1, b1] = color1.rgb;
      const [r2, g2, b2] = color2.rgb;
      const contrast = getContrast([r1, g1, b1], [r2, g2, b2]);
      setContrast(contrast);
    } else {
      setContrast(null);
    }
  };

  const clearColors = () => {
    setFirstColorState(null);
    setSecondColorState(null);
    setContrast(null);
  };

  return (
    <ColorPickerContext.Provider
      value={{
        firstColor,
        secondColor,
        contrast,
        setFirstColor,
        setSecondColor,
        clearColors,
      }}
    >
      {children}
    </ColorPickerContext.Provider>
  );
} 
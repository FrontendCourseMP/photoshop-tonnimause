import type { PixelSample } from '../image/pipette';

export function PixelInfo({ sample }: { sample: PixelSample | null }) {
  const number = (value: number) => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2);
  return <section className="pixel-info" aria-label="Исходный цвет пикселя" aria-live="polite">
    {sample ? <>
      <span className="pixel-swatch" aria-hidden="true" style={{ backgroundColor: `rgb(${sample.r} ${sample.g} ${sample.b})` }} />
      <span>X: {sample.x} · Y: {sample.y}</span>
      <span>R: {sample.r} · G: {sample.g} · B: {sample.b}</span>
      <span>CIELAB D50 · L*: {number(sample.lab.l)} · a*: {number(sample.lab.a)} · b*: {number(sample.lab.b)}</span>
      {sample.alpha === 0 && <span>Прозрачный пиксель</span>}
    </> : <span>Пипетка: выбрать пиксель левой кнопкой мыши на изображении</span>}
  </section>;
}

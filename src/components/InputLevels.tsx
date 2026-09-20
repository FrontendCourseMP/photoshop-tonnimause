import { gammaAtPosition, midpoint, type InputLevels as Values } from '../image/levels';

export function InputLevels({ values, maximum, onChange }: {
  values: Values; maximum: number; onChange: (field: keyof Values, value: number) => void;
}) {
  const middle = midpoint(values);
  const crowded = Math.min(middle - values.black, values.white - middle) < maximum * 0.1;
  return <fieldset className="input-levels">
    <legend>Входные уровни</legend>
    <div className={`levels-track${crowded ? ' is-crowded' : ''}`}>
      <input aria-label="Маркер чёрной точки" className="level-marker black-marker" type="range" min="0" max={maximum} step="1"
        value={values.black} onChange={event => onChange('black', Number(event.target.value))} />
      <input aria-label="Маркер полутонов" className="level-marker gamma-marker" type="range" min="0" max={maximum} step="0.001"
        value={middle} onChange={event => onChange('gamma', gammaAtPosition(values, Number(event.target.value)))} />
      <input aria-label="Маркер белой точки" className="level-marker white-marker" type="range" min="0" max={maximum} step="1"
        value={values.white} onChange={event => onChange('white', Number(event.target.value))} />
    </div>
    <div className="levels-numbers">
      <label>Чёрная точка<input aria-label="Чёрная точка" type="number" min="0" max={values.white - 1} value={values.black}
        onChange={event => onChange('black', event.target.valueAsNumber)} /></label>
      <label>Гамма<input aria-label="Гамма" type="number" min="0.1" max="9.9" step="0.01" value={Number(values.gamma.toFixed(2))}
        onChange={event => onChange('gamma', event.target.valueAsNumber)} /></label>
      <label>Белая точка<input aria-label="Белая точка" type="number" min={values.black + 1} max={maximum} value={values.white}
        onChange={event => onChange('white', event.target.valueAsNumber)} /></label>
    </div>
  </fieldset>;
}

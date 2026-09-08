import { useColorPicker } from '../../contexts/ColorPickerContext';
import { colorSpaceDescriptions } from '../../utils/colorSpaces';
import s from './ColorPickerWindow.module.scss';

interface ColorValueProps {
  label: string;
  values: number[];
  format: (value: number, index?: number) => string;
  tooltipInfo: {
    title: string;
    description: string;
    axes: { name: string; range: string; description: string }[];
  };
}

function ColorValue({ label, values, format, tooltipInfo }: ColorValueProps) {
  const tooltipContent = `${tooltipInfo.title}\n${tooltipInfo.description}\n\n${tooltipInfo.axes.map(axis => `${axis.name}: ${axis.range} - ${axis.description}`).join('\n')}`;

  return (
    <div className={s.colorValue}>
      <span className={s.label} title={tooltipContent}>{label}:</span>
      <span className={s.values}>
        {values.map((value, index) => (
          <span key={index}>{format(value, index)}</span>
        )).reduce((prev, curr) => [prev, ', ', curr] as any)}
      </span>
    </div>
  );
}

function ColorSwatch({ color }: { color: [number, number, number, number] | null }) {
  if (!color) return <div className={s.emptySwatch} />;

  const [r, g, b, a] = color;
  return (
    <div
      className={s.swatch}
      style={{
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${a / 255})`,
      }}
    />
  );
}

export function ColorPickerWindow() {
  const { firstColor, secondColor, contrast } = useColorPicker();

  const formatRgb = (value: number) => Math.round(value).toString();
  const formatXyz = (value: number) => value.toFixed(2);
  const formatLab = (value: number) => value.toFixed(2);
  const formatOklch = (value: number, index?: number) => {
    if (index === 2) return value.toFixed(1) + '°';
    return value.toFixed(3);
  };

  return (
    <div className={s.window}>
      <div className={s.colorSection}>
        <h3>Цвет 1</h3>
        <ColorSwatch color={firstColor?.rgb ?? null} />
        {firstColor && (
          <>
            <div className={s.coords}>
              x: {Math.round(firstColor.coords.x)}, y: {Math.round(firstColor.coords.y)}
            </div>
            <ColorValue
              label="RGB"
              values={firstColor.rgb.slice(0, 3) as number[]}
              format={formatRgb}
              tooltipInfo={colorSpaceDescriptions.RGB}
            />
            <ColorValue
              label="XYZ"
              values={firstColor.xyz}
              format={formatXyz}
              tooltipInfo={colorSpaceDescriptions.XYZ}
            />
            <ColorValue
              label="Lab"
              values={firstColor.lab}
              format={formatLab}
              tooltipInfo={colorSpaceDescriptions.Lab}
            />
            <ColorValue
              label="OKLch"
              values={firstColor.oklch}
              format={formatOklch}
              tooltipInfo={colorSpaceDescriptions.OKLch}
            />
          </>
        )}
      </div>

      <div className={s.colorSection}>
        <h3>Цвет 2</h3>
        <ColorSwatch color={secondColor?.rgb ?? null} />
        {secondColor && (
          <>
            <div className={s.coords}>
              x: {Math.round(secondColor.coords.x)}, y: {Math.round(secondColor.coords.y)}
            </div>
            <ColorValue
              label="RGB"
              values={secondColor.rgb.slice(0, 3) as number[]}
              format={formatRgb}
              tooltipInfo={colorSpaceDescriptions.RGB}
            />
            <ColorValue
              label="XYZ"
              values={secondColor.xyz}
              format={formatXyz}
              tooltipInfo={colorSpaceDescriptions.XYZ}
            />
            <ColorValue
              label="Lab"
              values={secondColor.lab}
              format={formatLab}
              tooltipInfo={colorSpaceDescriptions.Lab}
            />
            <ColorValue
              label="OKLch"
              values={secondColor.oklch}
              format={formatOklch}
              tooltipInfo={colorSpaceDescriptions.OKLch}
            />
          </>
        )}
      </div>

      <div className={s.contrastSection}>
        <h3>Контраст</h3>
        {contrast ? (
          <div className={`${s.contrastValue} ${contrast < 4.5 ? s.insufficient : ''}`}>
            {contrast.toFixed(2)}:1
            {contrast < 4.5 && (
              <span className={s.warning}>
                Недостаточный контраст (требуется минимум 4.5:1)
              </span>
            )}
          </div>
        ) : (
          <div className={s.hint}>
            Выберите два цвета для расчета контраста
          </div>
        )}
      </div>
    </div>
  );
} 
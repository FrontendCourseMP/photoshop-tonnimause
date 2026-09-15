import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { imageChannels } from '../image/channels';
import { histogram, histogramHeights, type HistogramScale, type LevelsChannel } from '../image/histogram';
import type { ImageDocument } from '../image/types';
import { InputLevels } from './InputLevels';
import { defaultLevels, updateLevels, type LevelsSettings } from '../image/levels';

export function LevelsDialog({ image, onClose }: { image: ImageDocument; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [channel, setChannel] = useState<LevelsChannel>('master');
  const [scale, setScale] = useState<HistogramScale>('linear');
  const maximum = image.source.format === 'GB7' ? 127 : 255;
  const [settings, setSettings] = useState<LevelsSettings>({});
  const values = settings[channel] ?? defaultLevels(maximum);
  const bins = useMemo(() => histogram(image.pixels, channel, maximum), [image, channel, maximum]);
  const heights = useMemo(() => histogramHeights(bins, scale), [bins, scale]);
  const peak = Math.max(...bins);
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={ref} className="export-dialog levels-dialog" aria-labelledby="levels-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="levels-title">Уровни</h2>
    <label className="field-label" htmlFor="levels-channel">Канал коррекции</label>
    <select id="levels-channel" value={channel} onChange={event => setChannel(event.target.value as LevelsChannel)}>
      <option value="master">Master · общая светлота</option>
      {imageChannels(image.source).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select>
    <label className="field-label" htmlFor="histogram-scale">Шкала гистограммы</label>
    <select id="histogram-scale" value={scale} onChange={event => setScale(event.target.value as HistogramScale)}>
      <option value="linear">Линейная</option><option value="log">Логарифмическая</option>
    </select>
    <p className="export-hint">{scale === 'linear' ? 'Количество пикселей' : 'log(1 + количество пикселей)'} · максимум: {peak}</p>
    <svg className="histogram" role="img" aria-label={`Гистограмма ${channel}`} viewBox={`0 0 ${maximum + 1} 100`} preserveAspectRatio="none">
      <title>Распределение по {maximum + 1} уровням</title>
      {heights.map((height, index) => <rect key={index} x={index} y={100 - height * 100} width="1" height={height * 100}
        data-count={bins[index]}><title>{index}: {bins[index]} пикселей</title></rect>)}
    </svg>
    <div className="histogram-axis"><span>0</span><span>{maximum}</span></div>
    <InputLevels values={values} maximum={maximum} onChange={(field, value) => setSettings(previous => ({
      ...previous, [channel]: updateLevels(previous[channel] ?? defaultLevels(maximum), field, value, maximum),
    }))} />
    <p className="export-hint">Всего пикселей: {image.pixels.width * image.pixels.height}. Учитываются и прозрачные пиксели. Гистограмма не зависит от видимости каналов.</p>
    <p className="export-hint">Настройки каналов сохраняются при переключении. Предпросмотр и применение будут подключены следующим этапом.</p>
    <div className="dialog-actions"><button onClick={() => setSettings({})}>Сброс</button><button onClick={onClose}>Закрыть</button></div>
  </dialog>;
}

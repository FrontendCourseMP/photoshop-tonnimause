import { useMemo } from 'react';
import { channelThumbnail, type Channel, type ChannelId } from '../image/channels';
import type { Raster } from '../image/types';

export function ChannelPanel({ pixels, channels, enabled, onToggle }: {
  pixels: Raster; channels: Channel[]; enabled: ChannelId[]; onToggle: (id: ChannelId) => void;
}) {
  const previews = useMemo(() => channels.map(channel => {
    const raster = channelThumbnail(pixels, channel.id);
    const canvas = document.createElement('canvas');
    canvas.width = raster.width; canvas.height = raster.height;
    canvas.getContext('2d')?.putImageData(new ImageData(raster.data, raster.width, raster.height), 0, 0);
    return canvas.toDataURL();
  }), [pixels, channels]);
  return <aside className="channel-panel" aria-label="Панель каналов">
    <h2>Каналы</h2>
    <div className="channel-list">{channels.map((channel, index) => <button key={channel.id}
      className="channel-button" aria-label={channel.label} aria-pressed={enabled.includes(channel.id)}
      onClick={() => onToggle(channel.id)}>
      <img src={previews[index]} alt={`Канал ${channel.label}`} />
      <span>{channel.label}<small>{enabled.includes(channel.id) ? 'Включён' : 'Выключен'}</small></span>
    </button>)}</div>
    <p>Белый — максимум канала, чёрный — ноль. Переключение влияет только на просмотр.</p>
  </aside>;
}

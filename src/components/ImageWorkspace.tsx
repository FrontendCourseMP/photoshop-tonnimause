import { useMemo, useState } from 'react';
import { channelView, imageChannels, type ChannelId } from '../image/channels';
import type { ImageDocument, Raster } from '../image/types';
import type { PixelSample } from '../image/pipette';
import { ChannelPanel } from './ChannelPanel';
import { ImageViewport } from './ImageViewport';
import type { InterpolationMethod } from '../image/resample';

export function ImageWorkspace({ image, preview, fit, zoom, method, onZoom, pipette, onPick }: {
  zoom: number; method: InterpolationMethod; onZoom: (zoom: number) => void;
  image: ImageDocument; preview: Raster | null; fit: boolean; pipette: boolean; onPick: (sample: PixelSample) => void;
}) {
  const channels = useMemo(() => imageChannels(image.source), [image]);
  const [selection, setSelection] = useState<{ image: ImageDocument; enabled: ChannelId[] } | null>(null);
  const enabled = useMemo(() => selection?.image.source === image.source ? selection.enabled : channels.map(channel => channel.id),
    [selection, image, channels]);
  const pixels = useMemo(() => channelView(preview ?? image.pixels, enabled), [image, preview, enabled]);
  return <>
    <ImageViewport image={image} pixels={pixels} fit={fit} zoom={zoom} method={method} onZoom={onZoom} pipette={pipette} onPick={onPick} />
    <ChannelPanel pixels={image.pixels} channels={channels} enabled={enabled} onToggle={id => {
      setSelection({ image, enabled: enabled.includes(id) ? enabled.filter(channel => channel !== id) : [...enabled, id] });
    }} />
  </>;
}

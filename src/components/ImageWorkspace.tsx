import { useMemo, useState } from 'react';
import { channelView, imageChannels, type ChannelId } from '../image/channels';
import type { ImageDocument } from '../image/types';
import { ChannelPanel } from './ChannelPanel';
import { ImageViewport } from './ImageViewport';

export function ImageWorkspace({ image, fit }: { image: ImageDocument; fit: boolean }) {
  const channels = useMemo(() => imageChannels(image.source), [image]);
  const [selection, setSelection] = useState<{ image: ImageDocument; enabled: ChannelId[] } | null>(null);
  const enabled = useMemo(() => selection?.image === image ? selection.enabled : channels.map(channel => channel.id),
    [selection, image, channels]);
  const pixels = useMemo(() => channelView(image.pixels, enabled), [image, enabled]);
  return <>
    <ImageViewport image={image} pixels={pixels} fit={fit} />
    <ChannelPanel pixels={image.pixels} channels={channels} enabled={enabled} onToggle={id => {
      setSelection({ image, enabled: enabled.includes(id) ? enabled.filter(channel => channel !== id) : [...enabled, id] });
    }} />
  </>;
}

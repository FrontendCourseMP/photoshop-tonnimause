import { DragOutlined, ExperimentOutlined } from '@ant-design/icons';
import type { Tool } from '../../contexts/ToolContext';

interface Instrument {
  id: Tool;
  icon: typeof DragOutlined;
  name: string;
  description: string;
  hotkey: string;
}

export const instruments: Instrument[] = [
  {
    id: 'hand',
    icon: DragOutlined,
    name: 'Рука',
    description: 'Перемещение изображения (H)',
    hotkey: 'h',
  },
  {
    id: 'pipette',
    icon: ExperimentOutlined,
    name: 'Пипетка',
    description: 'Выбор цвета (I)',
    hotkey: 'i',
  },
]; 
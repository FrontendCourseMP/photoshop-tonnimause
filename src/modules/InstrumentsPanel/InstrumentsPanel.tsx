import { useHotkeys } from 'react-hotkeys-hook';
import { useTools } from '../../contexts/ToolContext';
import { Instrument } from './components/Instrument';
import { instruments } from './Instruments';
import styles from './InstrumentsPanel.module.scss';

export function InstrumentsPanel() {
  const { setActiveTool } = useTools();

  // Регистрируем горячие клавиши
  instruments.forEach(({ id, hotkey }) => {
    useHotkeys(hotkey, () => {
      setActiveTool(id);
    });
  });

  return (
    <div className={styles.panel}>
      {instruments.map((instrument) => (
        <Instrument key={instrument.id} {...instrument} />
      ))}
    </div>
  );
} 
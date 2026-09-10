import { useHotkeys } from "react-hotkeys-hook";
import { useTools } from "../../contexts/ToolContext";
import { Instrument } from "./components/Instrument";
import { instruments } from "./Instruments";
import styles from "./InstrumentsPanel.module.scss";

export function InstrumentsPanel() {
  const { setActiveTool } = useTools();

  // Регистрируем горячие клавиши для каждого инструмента
  useHotkeys('h', () => setActiveTool('hand'));
  useHotkeys('i', () => setActiveTool('pipette'));
  useHotkeys('r', () => setActiveTool('resize'));

  return (
    <div className={styles.panel}>
      {instruments.map((instrument) => (
        <Instrument key={instrument.id} {...instrument} />
      ))}
    </div>
  );
}

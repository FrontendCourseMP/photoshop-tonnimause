import React from 'react';
import { Tooltip } from 'antd';
import classNames from 'classnames';
import { useTools } from '../../../contexts/ToolContext';
import type { Tool } from '../../../contexts/ToolContext';
import styles from './Instrument.module.scss';

interface InstrumentProps {
  id: Tool;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  hotkey: string;
}

export function Instrument({ id, icon: Icon, name, description }: InstrumentProps) {
  const { activeTool, setActiveTool } = useTools();
  const isActive = activeTool === id;
  void name;
  const handleClick = () => {
    setActiveTool(isActive ? null : id);
  };

  return (
    <Tooltip title={description} placement="right">
      <button
        className={classNames(styles.instrument, {
          [styles.active]: isActive,
        })}
        onClick={handleClick}
      >
        <Icon className={styles.icon} />
      </button>
    </Tooltip>
  );
} 
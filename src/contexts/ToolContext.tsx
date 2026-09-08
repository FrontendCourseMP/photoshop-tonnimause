import { createContext, useContext, useState } from 'react';

export type Tool = 'hand' | 'pipette' | null;

interface ToolContextType {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

const ToolContext = createContext<ToolContextType>({
  activeTool: null,
  setActiveTool: () => {},
});

export function useTools() {
  return useContext(ToolContext);
}

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveTool] = useState<Tool>(null);

  return (
    <ToolContext.Provider value={{ activeTool, setActiveTool }}>
      {children}
    </ToolContext.Provider>
  );
} 
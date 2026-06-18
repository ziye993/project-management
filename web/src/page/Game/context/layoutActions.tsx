import { createContext, useContext, useState, type ReactNode } from 'react';

interface GameLayoutActionsContextValue {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const GameLayoutActionsContext = createContext<GameLayoutActionsContextValue | null>(null);

export function GameLayoutActionsProvider(props: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <GameLayoutActionsContext.Provider value={{ actions, setActions }}>
      {props.children}
    </GameLayoutActionsContext.Provider>
  );
}

export function useGameLayoutActions() {
  const ctx = useContext(GameLayoutActionsContext);
  if (!ctx) throw new Error('useGameLayoutActions must be used within GameLayoutActionsProvider');
  return ctx;
}

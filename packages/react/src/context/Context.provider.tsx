import type React from 'react';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface MyContextValue {
  state: string;
  updateState: (newState: string) => void;
}

const MyContext = createContext<MyContextValue | undefined>(undefined);

interface MyContextProviderProps {
  children: ReactNode;
}

export const MyContextProvider: React.FC<MyContextProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<string>('Initial State');

  const updateState = (newState: string) => {
    setState(newState);
  };

  return (
    <MyContext.Provider value={{ state, updateState }}>
      {children}
    </MyContext.Provider>
  );
};

// Hook personalizado para consumir o contexto
export const useMyContext = (): MyContextValue => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within a MyContextProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface MyContextValue {
  state: string;
  updateState: (newState: string) => void;
}

const MyContext = createContext<MyContextValue | undefined>(undefined);

interface MyContextProviderProps {
  children: ReactNode;
}

const queryClient = new QueryClient(); // Instância do Query Client

export const MyContextProvider: React.FC<MyContextProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<string>('Initial State');

  const updateState = (newState: string) => {
    setState(newState);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <MyContext.Provider value={{ state, updateState }}>
        {children}
      </MyContext.Provider>
    </QueryClientProvider>
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

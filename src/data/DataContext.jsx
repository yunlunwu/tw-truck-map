import { createContext, useContext } from 'react';

const TaipeiDataContext = createContext(null);

export function TaipeiDataProvider({ value, children }) {
  return <TaipeiDataContext.Provider value={value}>{children}</TaipeiDataContext.Provider>;
}

export function useTaipeiData() {
  const data = useContext(TaipeiDataContext);
  if (!data) throw new Error('useTaipeiData must be used inside <TaipeiDataProvider>');
  return data;
}

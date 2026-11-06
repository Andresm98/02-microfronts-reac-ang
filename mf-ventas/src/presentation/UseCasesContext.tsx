import { createContext, useContext, type ReactNode } from 'react';
import type { VentasUseCases } from '../application/ventasUseCases';

const UseCasesContext = createContext<VentasUseCases | null>(null);

export function UseCasesProvider({ value, children }: { value: VentasUseCases; children: ReactNode }) {
  return <UseCasesContext.Provider value={value}>{children}</UseCasesContext.Provider>;
}

export function useUseCases(): VentasUseCases {
  const uc = useContext(UseCasesContext);
  if (!uc) throw new Error('[mf_ventas] Falta UseCasesProvider');
  return uc;
}

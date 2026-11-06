import { createContext, useContext, type ReactNode } from 'react';
import type { EventBus, RemoteLoader } from '../application/ports';

export interface ShellServices {
  loader: RemoteLoader;
  bus: EventBus;
}

const ServicesContext = createContext<ShellServices | null>(null);

export function ServicesProvider({ services, children }: { services: ShellServices; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): ShellServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices debe usarse dentro de <ServicesProvider>');
  return services;
}

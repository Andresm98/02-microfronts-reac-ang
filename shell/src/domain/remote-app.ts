/** Identificadores de los remotes Module Federation (CONTRACTS.md). */
export type RemoteId = 'mf_clientes' | 'mf_ventas';

export interface MountProps {
  basePath?: string;
}

/** Contrato agnóstico de framework expuesto por cada remote en `./mount`. */
export interface RemoteModule {
  mount(el: HTMLElement, props?: MountProps): void;
  unmount(el: HTMLElement): void;
}

/** Descriptor de un micro-frontend tal como lo conoce la shell. */
export interface RemoteApp {
  id: RemoteId;
  /** Título visible en navegación y cabeceras. */
  title: string;
  /** Ruta de la shell donde vive el micro a pantalla completa. */
  basePath: string;
  description: string;
  /** Tecnología con la que está construido (se muestra como etiqueta). */
  stack: string;
}

export function isRemoteModule(value: unknown): value is RemoteModule {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.mount === 'function' && typeof candidate.unmount === 'function';
}

import type { MicroEventMap, MicroEventName } from '../contracts/events';
import type { RemoteId, RemoteModule } from '../domain/remote-app';

/** Puerto: carga el módulo `./mount` de un remote. */
export interface RemoteLoader {
  load(id: RemoteId): Promise<RemoteModule>;
}

export type Unsubscribe = () => void;

/** Puerto: bus de eventos entre micros. */
export interface EventBus {
  on<K extends MicroEventName>(name: K, handler: (detail: MicroEventMap[K]) => void): Unsubscribe;
  emit<K extends MicroEventName>(name: K, detail: MicroEventMap[K]): void;
}

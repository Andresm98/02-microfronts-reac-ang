import type { MicroEventMap, MicroEventName } from '../contracts/events';
import type { EventBus, Unsubscribe } from '../application/ports';

/** Adaptador del bus de eventos sobre `window` + `CustomEvent`. */
export class WindowEventBus implements EventBus {
  constructor(private readonly target: EventTarget = window) {}

  on<K extends MicroEventName>(name: K, handler: (detail: MicroEventMap[K]) => void): Unsubscribe {
    const listener = (event: Event) => {
      handler((event as CustomEvent<MicroEventMap[K]>).detail);
    };
    this.target.addEventListener(name, listener);
    return () => this.target.removeEventListener(name, listener);
  }

  emit<K extends MicroEventName>(name: K, detail: MicroEventMap[K]): void {
    this.target.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

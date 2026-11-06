import { createApp, type App } from 'vue';
import ClientesApp from './presentation/ClientesApp.vue';
import './presentation/styles.css';
import { USE_CASES_KEY, createUseCases } from './di';

export interface MountProps {
  basePath?: string;
}

// Una instancia de Vue por elemento: permite montar varias veces de forma independiente.
const instances = new WeakMap<HTMLElement, App>();

export function mount(el: HTMLElement, props: MountProps = {}): void {
  if (!el) throw new Error('[mf_clientes] mount requiere un HTMLElement');
  unmount(el);
  const app = createApp(ClientesApp, { basePath: props.basePath });
  app.provide(USE_CASES_KEY, createUseCases());
  app.mount(el);
  instances.set(el, app);
}

export function unmount(el: HTMLElement): void {
  const app = instances.get(el);
  if (!app) return;
  app.unmount();
  instances.delete(el);
}

export default { mount, unmount };

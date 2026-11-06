import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { VentasUseCases } from './application/ventasUseCases';
import { createUseCases } from './di';
import { UseCasesProvider } from './presentation/UseCasesContext';
import { VentasApp } from './presentation/VentasApp';
import './presentation/styles.css';

export interface MountProps {
  basePath?: string;
}

// Un root de React por elemento: permite montar varias veces de forma independiente.
const roots = new WeakMap<HTMLElement, Root>();

export function mount(el: HTMLElement, props: MountProps = {}, useCases: VentasUseCases = createUseCases()): void {
  if (!el) throw new Error('[mf_ventas] mount requiere un HTMLElement');
  unmount(el);
  const root = createRoot(el);
  root.render(
    <StrictMode>
      <UseCasesProvider value={useCases}>
        <VentasApp basePath={props.basePath} />
      </UseCasesProvider>
    </StrictMode>,
  );
  roots.set(el, root);
}

export function unmount(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

export default { mount, unmount };

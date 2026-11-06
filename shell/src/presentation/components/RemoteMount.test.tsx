import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { EventBus, RemoteLoader } from '../../application/ports';
import type { RemoteApp, RemoteModule } from '../../domain/remote-app';
import { WindowEventBus } from '../../infrastructure/window-event-bus';
import { ServicesProvider } from '../services';
import { RemoteMount } from './RemoteMount';

const remote: RemoteApp = {
  id: 'mf_clientes',
  title: 'Clientes',
  basePath: '/clientes',
  description: 'test',
  stack: 'Test',
};

function fakeModule(): RemoteModule & { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> } {
  return {
    mount: vi.fn((el: HTMLElement) => {
      el.innerHTML = '<p>remote montado</p>';
    }),
    unmount: vi.fn((el: HTMLElement) => {
      el.innerHTML = '';
    }),
  };
}

function renderWith(loader: RemoteLoader, bus: EventBus = new WindowEventBus(new EventTarget())) {
  return render(
    <ServicesProvider services={{ loader, bus }}>
      <RemoteMount remote={remote} />
    </ServicesProvider>,
  );
}

describe('RemoteMount', () => {
  it('muestra loading, carga el remote y llama a mount(el, { basePath })', async () => {
    const mod = fakeModule();
    let resolve!: (m: RemoteModule) => void;
    const loader: RemoteLoader = { load: vi.fn(() => new Promise<RemoteModule>((r) => (resolve = r))) };

    renderWith(loader);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando Clientes');
    expect(loader.load).toHaveBeenCalledWith('mf_clientes');

    resolve(mod);
    expect(await screen.findByText('remote montado')).toBeInTheDocument();
    expect(mod.mount).toHaveBeenCalledTimes(1);
    const [el, props] = mod.mount.mock.calls[0];
    expect(el).toBeInstanceOf(HTMLElement);
    expect((el as HTMLElement).dataset.remote).toBe('mf_clientes');
    expect(props).toEqual({ basePath: '/clientes' });
    expect(screen.queryByText(/Cargando/)).not.toBeInTheDocument();
  });

  it('llama a unmount(el) con el mismo elemento al desmontarse', async () => {
    const mod = fakeModule();
    const loader: RemoteLoader = { load: vi.fn().mockResolvedValue(mod) };

    const { unmount } = renderWith(loader);
    await waitFor(() => expect(mod.mount).toHaveBeenCalled());
    const el = mod.mount.mock.calls[0][0];

    unmount();
    expect(mod.unmount).toHaveBeenCalledTimes(1);
    expect(mod.unmount).toHaveBeenCalledWith(el);
  });

  it('muestra un fallback amigable si la carga falla y permite reintentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mod = fakeModule();
    const loader: RemoteLoader = {
      load: vi.fn().mockRejectedValueOnce(new Error('remoteEntry 404')).mockResolvedValueOnce(mod),
    };

    renderWith(loader);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Clientes no está disponible');
    expect(alert).toHaveTextContent('remoteEntry 404');
    expect(mod.mount).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('remote montado')).toBeInTheDocument();
    expect(loader.load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra el fallback si mount() lanza', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mod = fakeModule();
    mod.mount.mockImplementation(() => {
      throw new Error('boom');
    });
    renderWith({ load: vi.fn().mockResolvedValue(mod) });

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});

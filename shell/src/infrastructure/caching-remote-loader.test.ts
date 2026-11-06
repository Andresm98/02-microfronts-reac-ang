import { describe, expect, it, vi } from 'vitest';
import { CachingRemoteLoader } from './caching-remote-loader';

const mod = { mount: () => {}, unmount: () => {} };

describe('CachingRemoteLoader', () => {
  it('acepta módulos con named exports o default export y cachea', async () => {
    const clientes = vi.fn().mockResolvedValue(mod);
    const ventas = vi.fn().mockResolvedValue({ default: mod });
    const loader = new CachingRemoteLoader({ mf_clientes: clientes, mf_ventas: ventas });

    expect(await loader.load('mf_clientes')).toBe(mod);
    expect(await loader.load('mf_clientes')).toBe(mod);
    expect(await loader.load('mf_ventas')).toBe(mod);
    expect(clientes).toHaveBeenCalledTimes(1);
  });

  it('rechaza módulos que no cumplen el contrato mount/unmount', async () => {
    const loader = new CachingRemoteLoader({
      mf_clientes: vi.fn().mockResolvedValue({ mount: () => {} }),
      mf_ventas: vi.fn(),
    });
    await expect(loader.load('mf_clientes')).rejects.toThrow(/mount\/unmount/);
  });

  it('descarta la caché tras un fallo para permitir reintentos', async () => {
    const importer = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(mod);
    const loader = new CachingRemoteLoader({ mf_clientes: importer, mf_ventas: vi.fn() });

    await expect(loader.load('mf_clientes')).rejects.toThrow('down');
    expect(await loader.load('mf_clientes')).toBe(mod);
    expect(importer).toHaveBeenCalledTimes(2);
  });
});

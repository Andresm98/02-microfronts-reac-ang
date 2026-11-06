import type { RemoteLoader } from '../application/ports';
import { isRemoteModule, type RemoteId, type RemoteModule } from '../domain/remote-app';

export type RemoteImporter = () => Promise<unknown>;

/**
 * Loader genérico: resuelve el módulo con un importer, valida el contrato
 * mount/unmount y cachea el resultado. Si la carga falla se descarta la
 * caché para que "Reintentar" vuelva a pedir el remoteEntry.
 */
export class CachingRemoteLoader implements RemoteLoader {
  private readonly cache = new Map<RemoteId, Promise<RemoteModule>>();

  constructor(private readonly importers: Record<RemoteId, RemoteImporter>) {}

  load(id: RemoteId): Promise<RemoteModule> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    const importer = this.importers[id];
    if (!importer) return Promise.reject(new Error(`No hay importer para ${id}`));

    const promise = importer().then((mod) => {
      const candidate = (mod as { default?: unknown })?.default;
      if (isRemoteModule(mod)) return mod;
      if (isRemoteModule(candidate)) return candidate;
      throw new Error(`El remote ${id} no expone mount/unmount`);
    });
    promise.catch(() => this.cache.delete(id));
    this.cache.set(id, promise);
    return promise;
  }
}

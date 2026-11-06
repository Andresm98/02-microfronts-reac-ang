import { CachingRemoteLoader } from './caching-remote-loader';

/**
 * Adaptador Module Federation. Los specifiers `mf_xxx/mount` los resuelve
 * @module-federation/vite en dev y en build (ver vite.config.ts), con las
 * URLs de remoteEntry tomadas de VITE_MF_CLIENTES_URL / VITE_MF_VENTAS_URL.
 */
export function createModuleFederationLoader(): CachingRemoteLoader {
  return new CachingRemoteLoader({
    mf_clientes: () => import('mf_clientes/mount'),
    mf_ventas: () => import('mf_ventas/mount'),
  });
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MF_CLIENTES_URL?: string;
  readonly VITE_MF_VENTAS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

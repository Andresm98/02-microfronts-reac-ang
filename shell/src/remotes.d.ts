// Módulos remotos resueltos en runtime por Module Federation (contrato ./mount).
declare module 'mf_clientes/mount' {
  export function mount(el: HTMLElement, props?: { basePath?: string }): void;
  export function unmount(el: HTMLElement): void;
}

declare module 'mf_ventas/mount' {
  export function mount(el: HTMLElement, props?: { basePath?: string }): void;
  export function unmount(el: HTMLElement): void;
}

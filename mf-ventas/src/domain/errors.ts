export type VentaErrorKind = 'validation' | 'not-found' | 'network' | 'unknown';

export class VentaError extends Error {
  readonly kind: VentaErrorKind;
  readonly details?: unknown;

  constructor(kind: VentaErrorKind, message: string, details?: unknown) {
    super(message);
    this.name = 'VentaError';
    this.kind = kind;
    this.details = details;
  }
}

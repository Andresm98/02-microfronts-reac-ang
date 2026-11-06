export type ClienteErrorKind = 'validation' | 'duplicate' | 'not-found' | 'network' | 'unknown';

export class ClienteError extends Error {
  readonly kind: ClienteErrorKind;
  readonly details?: unknown;

  constructor(kind: ClienteErrorKind, message: string, details?: unknown) {
    super(message);
    this.name = 'ClienteError';
    this.kind = kind;
    this.details = details;
  }
}

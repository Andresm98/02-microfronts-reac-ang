/** Error base del dominio. La capa HTTP traduce cada subtipo a un código de estado. */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Una regla de negocio o invariante no se cumple (→ 400). */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** El recurso solicitado no existe (→ 404). */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** Conflicto con el estado actual (→ 409). */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class VentaNoEncontradaError extends NotFoundError {
  constructor(id: string) {
    super(`Venta ${id} no encontrada`);
  }
}

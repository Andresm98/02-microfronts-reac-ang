/** Puerto para generar identificadores (UUID en producción). */
export interface IdGenerator {
  next(): string;
}

/** Puerto de reloj, para poder fijar el tiempo en tests. */
export interface Clock {
  now(): Date;
}

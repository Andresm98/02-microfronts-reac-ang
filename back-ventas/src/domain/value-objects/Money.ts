import { ValidationError } from "../errors.js";

/** Redondeo comercial a 2 decimales (corrige errores de coma flotante como 1.005). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Importe monetario no negativo, siempre redondeado a 2 decimales. */
export class Money {
  private constructor(readonly amount: number) {}

  static readonly ZERO = new Money(0);

  static of(amount: number, campo = "importe"): Money {
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      throw new ValidationError(`${campo} debe ser un número`);
    }
    if (amount < 0) throw new ValidationError(`${campo} no puede ser negativo`);
    return new Money(round2(amount));
  }

  add(other: Money): Money {
    return new Money(round2(this.amount + other.amount));
  }

  multiply(factor: number): Money {
    return Money.of(this.amount * factor);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }
}

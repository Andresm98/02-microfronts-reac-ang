import { ValidationError } from "../errors.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LENGTH = 254;

/** Email normalizado (trim + minúsculas) y validado. */
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const value = (raw ?? "").trim().toLowerCase();
    if (!value) throw new ValidationError("El email es obligatorio");
    if (value.length > MAX_LENGTH || !EMAIL_REGEX.test(value)) {
      throw new ValidationError(`Email inválido: ${raw}`);
    }
    return new Email(value);
  }

  /** Reconstruye desde persistencia sin revalidar (los datos ya fueron aceptados). */
  static fromPersistence(value: string): Email {
    return new Email(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

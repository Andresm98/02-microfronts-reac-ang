import { ValidationError } from "../errors.js";

const DOCUMENTO_REGEX = /^[A-Za-z0-9][A-Za-z0-9.\- ]{1,28}[A-Za-z0-9]$/;

/** Documento de identidad: 3-30 caracteres alfanuméricos (se admiten '.', '-' y espacios intermedios). */
export class Documento {
  private constructor(readonly value: string) {}

  static create(raw: string): Documento {
    const value = (raw ?? "").trim();
    if (!value) throw new ValidationError("El documento es obligatorio");
    if (!DOCUMENTO_REGEX.test(value)) {
      throw new ValidationError(
        "Documento inválido: 3-30 caracteres alfanuméricos, se admiten '.', '-' y espacios",
      );
    }
    return new Documento(value);
  }

  /** Reconstruye desde persistencia sin revalidar (los datos ya fueron aceptados). */
  static fromPersistence(value: string): Documento {
    return new Documento(value);
  }

  equals(other: Documento): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

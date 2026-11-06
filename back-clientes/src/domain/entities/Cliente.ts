import { ValidationError } from "../errors.js";
import { Documento } from "../value-objects/Documento.js";
import { Email } from "../value-objects/Email.js";

export interface DatosCliente {
  nombre: string;
  email: string;
  documento: string;
  telefono?: string | null;
}

export interface ClientePrimitives {
  id: string;
  nombre: string;
  email: string;
  documento: string;
  telefono: string | null;
  creadoEn: Date;
}

const MAX_NOMBRE = 200;
const MAX_TELEFONO = 30;

function validarNombre(raw: string): string {
  const nombre = (raw ?? "").trim();
  if (!nombre) throw new ValidationError("El nombre es obligatorio");
  if (nombre.length > MAX_NOMBRE) {
    throw new ValidationError(`El nombre no puede superar ${MAX_NOMBRE} caracteres`);
  }
  return nombre;
}

function validarTelefono(raw: string | null | undefined): string | null {
  const telefono = (raw ?? "").trim();
  if (!telefono) return null;
  if (telefono.length > MAX_TELEFONO) {
    throw new ValidationError(`El teléfono no puede superar ${MAX_TELEFONO} caracteres`);
  }
  return telefono;
}

export class Cliente {
  private constructor(
    readonly id: string,
    private _nombre: string,
    private _email: Email,
    private _documento: Documento,
    private _telefono: string | null,
    readonly creadoEn: Date,
  ) {}

  /** Crea un cliente nuevo aplicando todas las invariantes. */
  static crear(id: string, datos: DatosCliente, creadoEn: Date = new Date()): Cliente {
    if (!id?.trim()) throw new ValidationError("El id es obligatorio");
    return new Cliente(
      id,
      validarNombre(datos.nombre),
      Email.create(datos.email),
      Documento.create(datos.documento),
      validarTelefono(datos.telefono),
      creadoEn,
    );
  }

  /** Reconstruye un cliente desde persistencia (sin revalidar datos ya aceptados). */
  static reconstituir(p: ClientePrimitives): Cliente {
    return new Cliente(
      p.id,
      p.nombre,
      Email.fromPersistence(p.email),
      Documento.fromPersistence(p.documento),
      p.telefono ?? null,
      p.creadoEn,
    );
  }

  actualizar(datos: DatosCliente): void {
    this._nombre = validarNombre(datos.nombre);
    this._email = Email.create(datos.email);
    this._documento = Documento.create(datos.documento);
    this._telefono = validarTelefono(datos.telefono);
  }

  get nombre(): string {
    return this._nombre;
  }
  get email(): Email {
    return this._email;
  }
  get documento(): Documento {
    return this._documento;
  }
  get telefono(): string | null {
    return this._telefono;
  }

  toPrimitives(): ClientePrimitives {
    return {
      id: this.id,
      nombre: this._nombre,
      email: this._email.value,
      documento: this._documento.value,
      telefono: this._telefono,
      creadoEn: this.creadoEn,
    };
  }
}

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  documento: string;
  telefono: string | null;
  creadoEn: string;
}

export interface ClienteInput {
  nombre: string;
  email: string;
  documento: string;
  telefono?: string | null;
}

export type ClienteFieldErrors = Partial<Record<keyof ClienteInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_RE = /^\+?[\d\s-]{6,}$/;

/** Reglas de validación del dominio (independientes de la UI). */
export function validarCliente(input: ClienteInput): ClienteFieldErrors {
  const errors: ClienteFieldErrors = {};
  const nombre = input.nombre.trim();
  const email = input.email.trim();
  const documento = input.documento.trim();
  const telefono = (input.telefono ?? '').trim();

  if (nombre.length < 2) errors.nombre = 'El nombre es obligatorio (mín. 2 caracteres).';
  if (!email) errors.email = 'El email es obligatorio.';
  else if (!EMAIL_RE.test(email)) errors.email = 'El email no es válido.';
  if (!documento) errors.documento = 'El documento es obligatorio.';
  if (telefono && !TELEFONO_RE.test(telefono)) errors.telefono = 'El teléfono no es válido.';
  return errors;
}

export function normalizarCliente(input: ClienteInput): ClienteInput {
  const telefono = (input.telefono ?? '').trim();
  return {
    nombre: input.nombre.trim(),
    email: input.email.trim().toLowerCase(),
    documento: input.documento.trim(),
    telefono: telefono ? telefono : null,
  };
}

import type { Pool } from "pg";
import { Cliente } from "../../domain/entities/Cliente.js";
import { EmailDuplicadoError } from "../../domain/errors.js";
import type { ClienteRepository } from "../../domain/ports/ClienteRepository.js";

interface ClienteRow {
  id: string;
  nombre: string;
  email: string;
  documento: string;
  telefono: string | null;
  creado_en: Date;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PG_UNIQUE_VIOLATION = "23505";
const COLUMNS = "id, nombre, email, documento, telefono, creado_en";

function toEntity(row: ClienteRow): Cliente {
  return Cliente.reconstituir({
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    documento: row.documento,
    telefono: row.telefono,
    creadoEn: row.creado_en,
  });
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION;
}

/**
 * Adaptador PostgreSQL. Asume la tabla
 * `clientes(id uuid pk, nombre text, email text unique, documento text, telefono text null, creado_en timestamptz default now())`.
 */
export class PostgresClienteRepository implements ClienteRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<Cliente[]> {
    const { rows } = await this.pool.query<ClienteRow>(
      `SELECT ${COLUMNS} FROM clientes ORDER BY creado_en DESC, nombre ASC`,
    );
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Cliente | null> {
    // Un id que no es UUID no puede existir: evita el error 22P02 de Postgres.
    if (!UUID_REGEX.test(id)) return null;
    const { rows } = await this.pool.query<ClienteRow>(
      `SELECT ${COLUMNS} FROM clientes WHERE id = $1`,
      [id],
    );
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Cliente | null> {
    const { rows } = await this.pool.query<ClienteRow>(
      `SELECT ${COLUMNS} FROM clientes WHERE lower(email) = lower($1) LIMIT 1`,
      [email],
    );
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async create(cliente: Cliente): Promise<void> {
    const p = cliente.toPrimitives();
    try {
      await this.pool.query(
        `INSERT INTO clientes (id, nombre, email, documento, telefono, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.id, p.nombre, p.email, p.documento, p.telefono, p.creadoEn],
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new EmailDuplicadoError(p.email);
      throw err;
    }
  }

  async update(cliente: Cliente): Promise<void> {
    const p = cliente.toPrimitives();
    try {
      await this.pool.query(
        `UPDATE clientes SET nombre = $2, email = $3, documento = $4, telefono = $5 WHERE id = $1`,
        [p.id, p.nombre, p.email, p.documento, p.telefono],
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new EmailDuplicadoError(p.email);
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!UUID_REGEX.test(id)) return false;
    const result = await this.pool.query("DELETE FROM clientes WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

import { Cliente } from "../../domain/entities/Cliente.js";
import { EmailDuplicadoError } from "../../domain/errors.js";
import type { ClienteRepository } from "../../domain/ports/ClienteRepository.js";

/** Adaptador en memoria (tests y desarrollo sin base de datos). */
export class InMemoryClienteRepository implements ClienteRepository {
  private readonly store = new Map<string, ReturnType<Cliente["toPrimitives"]>>();

  async findAll(): Promise<Cliente[]> {
    return [...this.store.values()]
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime() || a.nombre.localeCompare(b.nombre))
      .map((p) => Cliente.reconstituir(p));
  }

  async findById(id: string): Promise<Cliente | null> {
    const p = this.store.get(id);
    return p ? Cliente.reconstituir(p) : null;
  }

  async findByEmail(email: string): Promise<Cliente | null> {
    const needle = email.toLowerCase();
    for (const p of this.store.values()) {
      if (p.email.toLowerCase() === needle) return Cliente.reconstituir(p);
    }
    return null;
  }

  async create(cliente: Cliente): Promise<void> {
    this.assertEmailLibre(cliente);
    this.store.set(cliente.id, cliente.toPrimitives());
  }

  async update(cliente: Cliente): Promise<void> {
    if (!this.store.has(cliente.id)) return;
    this.assertEmailLibre(cliente);
    this.store.set(cliente.id, cliente.toPrimitives());
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  private assertEmailLibre(cliente: Cliente): void {
    for (const p of this.store.values()) {
      if (p.id !== cliente.id && p.email === cliente.email.value) {
        throw new EmailDuplicadoError(cliente.email.value);
      }
    }
  }
}

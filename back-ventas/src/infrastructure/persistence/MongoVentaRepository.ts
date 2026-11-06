import type { Collection, Db } from "mongodb";
import { Venta } from "../../domain/entities/Venta.js";
import type { LineaVentaPrimitives } from "../../domain/entities/LineaVenta.js";
import type { FiltroVentas, VentaRepository } from "../../domain/ports/VentaRepository.js";

/** Forma del documento en la colección `ventas` (misma que db/init-mongo.js). */
export interface VentaDocument {
  _id: string; // UUID v4 como string
  clienteId: string;
  lineas: LineaVentaPrimitives[];
  total: number;
  fecha: Date;
}

export const VENTAS_COLLECTION = "ventas";

function toEntity(doc: VentaDocument): Venta {
  return Venta.reconstituir({
    id: doc._id,
    clienteId: doc.clienteId,
    lineas: doc.lineas,
    total: doc.total,
    fecha: doc.fecha,
  });
}

function toDocument(venta: Venta): VentaDocument {
  const p = venta.toPrimitives();
  return { _id: p.id, clienteId: p.clienteId, lineas: p.lineas, total: p.total, fecha: p.fecha };
}

/** Adaptador MongoDB (driver oficial). */
export class MongoVentaRepository implements VentaRepository {
  private readonly collection: Collection<VentaDocument>;

  constructor(db: Db) {
    this.collection = db.collection<VentaDocument>(VENTAS_COLLECTION);
  }

  /** Crea los índices (idempotente; mismos nombres que db/init-mongo.js). */
  async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ clienteId: 1 }, { name: "idx_clienteId" });
    await this.collection.createIndex({ fecha: -1 }, { name: "idx_fecha" });
  }

  async save(venta: Venta): Promise<void> {
    const doc = toDocument(venta);
    await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async findById(id: string): Promise<Venta | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? toEntity(doc) : null;
  }

  async findAll(filtro: FiltroVentas = {}): Promise<Venta[]> {
    const query = filtro.clienteId ? { clienteId: filtro.clienteId } : {};
    const docs = await this.collection.find(query).sort({ fecha: -1, _id: 1 }).toArray();
    return docs.map(toEntity);
  }
}

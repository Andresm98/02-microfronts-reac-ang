import { describe, expect, it, vi } from "vitest";
import { Venta } from "../../src/domain/entities/Venta.js";
import { loadEnv } from "../../src/infrastructure/config/env.js";
import { MongoVentaRepository, type VentaDocument } from "../../src/infrastructure/persistence/MongoVentaRepository.js";

describe("loadEnv", () => {
  it("usa valores por defecto locales", () => {
    expect(loadEnv({})).toEqual({
      port: 3002,
      mongoUrl: "mongodb://localhost:27017",
      mongoDb: "ventas",
      corsOrigins: ["http://localhost:5000", "http://localhost:5001", "http://localhost:5002"],
    });
  });

  it("lee variables y separa CORS_ORIGINS por comas", () => {
    const env = loadEnv({ PORT: "4000", MONGO_URL: "mongodb://db", MONGO_DB: "x", CORS_ORIGINS: "http://a, http://b" });
    expect(env).toEqual({ port: 4000, mongoUrl: "mongodb://db", mongoDb: "x", corsOrigins: ["http://a", "http://b"] });
  });
});

describe("MongoVentaRepository (colección simulada)", () => {
  const fecha = new Date("2026-10-01T10:00:00Z");
  const doc: VentaDocument = {
    _id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    clienteId: "c1",
    lineas: [{ producto: "Teclado", cantidad: 2, precioUnitario: 50, subtotal: 100 }],
    total: 100,
    fecha,
  };

  function fakeDb() {
    const collection = {
      replaceOne: vi.fn().mockResolvedValue({}),
      findOne: vi.fn().mockResolvedValue(doc),
      find: vi.fn().mockReturnValue({ sort: () => ({ toArray: async () => [doc] }) }),
      createIndex: vi.fn().mockResolvedValue("ok"),
    };
    return { db: { collection: vi.fn().mockReturnValue(collection) }, collection };
  }

  it("guarda con _id string UUID y fecha Date (forma de init-mongo.js)", async () => {
    const { db, collection } = fakeDb();
    const repo = new MongoVentaRepository(db as never);
    const venta = Venta.registrar(doc._id, { clienteId: "c1", lineas: [{ producto: "Teclado", cantidad: 2, precioUnitario: 50 }] }, fecha);
    await repo.save(venta);
    expect(db.collection).toHaveBeenCalledWith("ventas");
    expect(collection.replaceOne).toHaveBeenCalledWith({ _id: doc._id }, doc, { upsert: true });
  });

  it("mapea _id → id al leer y filtra por clienteId", async () => {
    const { db, collection } = fakeDb();
    const repo = new MongoVentaRepository(db as never);
    expect((await repo.findById(doc._id))?.toPrimitives()).toEqual({ ...doc, _id: undefined, id: doc._id });
    await repo.findAll({ clienteId: "c1" });
    expect(collection.find).toHaveBeenCalledWith({ clienteId: "c1" });
    await repo.findAll();
    expect(collection.find).toHaveBeenLastCalledWith({});
  });
});

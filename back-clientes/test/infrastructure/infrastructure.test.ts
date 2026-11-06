import { describe, expect, it, vi } from "vitest";
import { Cliente } from "../../src/domain/entities/Cliente.js";
import { EmailDuplicadoError } from "../../src/domain/errors.js";
import { loadEnv } from "../../src/infrastructure/config/env.js";
import { PostgresClienteRepository } from "../../src/infrastructure/persistence/PostgresClienteRepository.js";

describe("loadEnv", () => {
  it("usa valores por defecto locales", () => {
    expect(loadEnv({})).toEqual({
      port: 3001,
      databaseUrl: "postgres://clientes:clientes@localhost:5432/clientes",
      corsOrigins: ["http://localhost:5000", "http://localhost:5001", "http://localhost:5002"],
    });
  });

  it("lee variables y separa CORS_ORIGINS por comas", () => {
    const env = loadEnv({ PORT: "4000", DATABASE_URL: "postgres://x", CORS_ORIGINS: " http://a , http://b ," });
    expect(env).toEqual({ port: 4000, databaseUrl: "postgres://x", corsOrigins: ["http://a", "http://b"] });
  });

  it("rechaza PORT inválido", () => {
    expect(() => loadEnv({ PORT: "abc" })).toThrow();
  });
});

describe("PostgresClienteRepository (pool simulado)", () => {
  const cliente = Cliente.crear("3f1c2b8e-1d2a-4c3b-9a8b-7c6d5e4f3a2b", {
    nombre: "Ana",
    email: "ana@mail.com",
    documento: "111",
  });

  it("traduce la violación de unicidad 23505 a EmailDuplicadoError", async () => {
    const pool = { query: vi.fn().mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" })) };
    const repo = new PostgresClienteRepository(pool as never);
    await expect(repo.create(cliente)).rejects.toBeInstanceOf(EmailDuplicadoError);
    await expect(repo.update(cliente)).rejects.toBeInstanceOf(EmailDuplicadoError);
  });

  it("no consulta la BD con ids que no son UUID", async () => {
    const pool = { query: vi.fn() };
    const repo = new PostgresClienteRepository(pool as never);
    await expect(repo.findById("abc")).resolves.toBeNull();
    await expect(repo.delete("abc")).resolves.toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("mapea filas snake_case a la entidad", async () => {
    const creado = new Date("2026-02-02T10:00:00Z");
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: cliente.id, nombre: "Ana", email: "ana@mail.com", documento: "111", telefono: null, creado_en: creado }],
      }),
    };
    const repo = new PostgresClienteRepository(pool as never);
    const found = await repo.findById(cliente.id);
    expect(found?.toPrimitives()).toEqual({ ...cliente.toPrimitives(), creadoEn: creado });
  });
});

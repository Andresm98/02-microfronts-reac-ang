import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../src/domain/errors.js";
import { setup } from "../helpers.js";

const ana = { nombre: "Ana", email: "ana@mail.com", documento: "11111111" };
const luis = { nombre: "Luis", email: "luis@mail.com", documento: "22222222", telefono: "555-1234" };

describe("casos de uso de clientes", () => {
  let uc: ReturnType<typeof setup>["useCases"];

  beforeEach(() => {
    uc = setup().useCases;
  });

  describe("CrearCliente", () => {
    it("crea y devuelve el DTO con id y creadoEn ISO", async () => {
      const c = await uc.crear.execute(ana);
      expect(c).toEqual({
        id: "00000000-0000-4000-8000-000000000001",
        nombre: "Ana",
        email: "ana@mail.com",
        documento: "11111111",
        telefono: null,
        creadoEn: "2026-01-01T00:00:01.000Z",
      });
    });

    it("rechaza email duplicado (sin distinguir mayúsculas)", async () => {
      await uc.crear.execute(ana);
      await expect(uc.crear.execute({ ...luis, email: "ANA@mail.com" })).rejects.toBeInstanceOf(ConflictError);
    });

    it("propaga errores de validación del dominio", async () => {
      await expect(uc.crear.execute({ ...ana, email: "no-es-email" })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("ListarClientes", () => {
    it("lista los más recientes primero", async () => {
      await uc.crear.execute(ana);
      await uc.crear.execute(luis);
      const lista = await uc.listar.execute();
      expect(lista.map((c) => c.nombre)).toEqual(["Luis", "Ana"]);
    });
  });

  describe("ObtenerCliente", () => {
    it("devuelve el cliente existente", async () => {
      const c = await uc.crear.execute(ana);
      await expect(uc.obtener.execute(c.id)).resolves.toEqual(c);
    });

    it("lanza NotFound si no existe", async () => {
      await expect(uc.obtener.execute("nope")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("ActualizarCliente", () => {
    it("actualiza los datos y conserva id y creadoEn", async () => {
      const c = await uc.crear.execute(ana);
      const act = await uc.actualizar.execute(c.id, { ...ana, nombre: "Ana María", telefono: "123" });
      expect(act).toEqual({ ...c, nombre: "Ana María", telefono: "123" });
      await expect(uc.obtener.execute(c.id)).resolves.toEqual(act);
    });

    it("permite conservar su propio email", async () => {
      const c = await uc.crear.execute(ana);
      await expect(uc.actualizar.execute(c.id, { ...ana, email: "ANA@MAIL.COM" })).resolves.toBeDefined();
    });

    it("rechaza tomar el email de otro cliente", async () => {
      const a = await uc.crear.execute(ana);
      await uc.crear.execute(luis);
      await expect(uc.actualizar.execute(a.id, { ...ana, email: luis.email })).rejects.toBeInstanceOf(ConflictError);
    });

    it("lanza NotFound si no existe", async () => {
      await expect(uc.actualizar.execute("nope", ana)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("EliminarCliente", () => {
    it("elimina un cliente existente", async () => {
      const c = await uc.crear.execute(ana);
      await uc.eliminar.execute(c.id);
      await expect(uc.obtener.execute(c.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("lanza NotFound si no existe", async () => {
      await expect(uc.eliminar.execute("nope")).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

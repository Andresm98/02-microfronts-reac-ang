import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../../src/domain/errors.js";
import { setup } from "../helpers.js";

const lineas = [
  { producto: "Teclado", cantidad: 2, precioUnitario: 50 },
  { producto: "Mouse", cantidad: 1, precioUnitario: 25.5 },
];

describe("casos de uso de ventas", () => {
  let uc: ReturnType<typeof setup>["useCases"];

  beforeEach(() => {
    uc = setup().useCases;
  });

  describe("RegistrarVenta", () => {
    it("registra y devuelve el DTO con totales calculados", async () => {
      const v = await uc.registrar.execute({ clienteId: "c1", lineas });
      expect(v).toEqual({
        id: "00000000-0000-4000-8000-000000000001",
        clienteId: "c1",
        lineas: [
          { producto: "Teclado", cantidad: 2, precioUnitario: 50, subtotal: 100 },
          { producto: "Mouse", cantidad: 1, precioUnitario: 25.5, subtotal: 25.5 },
        ],
        total: 125.5,
        fecha: "2026-10-01T00:00:01.000Z",
      });
    });

    it("propaga errores de validación del dominio", async () => {
      await expect(uc.registrar.execute({ clienteId: "c1", lineas: [] })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("ListarVentas", () => {
    it("lista todas, más recientes primero", async () => {
      const a = await uc.registrar.execute({ clienteId: "c1", lineas });
      const b = await uc.registrar.execute({ clienteId: "c2", lineas });
      expect((await uc.listar.execute()).map((v) => v.id)).toEqual([b.id, a.id]);
    });

    it("filtra por clienteId (y trata vacío como sin filtro)", async () => {
      await uc.registrar.execute({ clienteId: "c1", lineas });
      await uc.registrar.execute({ clienteId: "c2", lineas });
      await uc.registrar.execute({ clienteId: "c1", lineas });
      expect(await uc.listar.execute({ clienteId: "c1" })).toHaveLength(2);
      expect(await uc.listar.execute({ clienteId: "zz" })).toEqual([]);
      expect(await uc.listar.execute({ clienteId: "" })).toHaveLength(3);
    });
  });

  describe("ObtenerVenta", () => {
    it("devuelve la venta existente", async () => {
      const v = await uc.registrar.execute({ clienteId: "c1", lineas });
      await expect(uc.obtener.execute(v.id)).resolves.toEqual(v);
    });

    it("lanza NotFound si no existe", async () => {
      await expect(uc.obtener.execute("nope")).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

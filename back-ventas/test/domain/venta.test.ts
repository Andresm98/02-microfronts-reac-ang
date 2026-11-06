import { describe, expect, it } from "vitest";
import { LineaVenta } from "../../src/domain/entities/LineaVenta.js";
import { Venta } from "../../src/domain/entities/Venta.js";
import { ValidationError } from "../../src/domain/errors.js";
import { Money, round2 } from "../../src/domain/value-objects/Money.js";

describe("Money", () => {
  it("redondea a 2 decimales", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(Money.of(0.1).add(Money.of(0.2)).amount).toBe(0.3);
    expect(Money.of(19.999).amount).toBe(20);
  });

  it.each([-0.01, Number.NaN, Number.POSITIVE_INFINITY])("rechaza %s", (n) => {
    expect(() => Money.of(n)).toThrow(ValidationError);
  });
});

describe("LineaVenta", () => {
  it("calcula el subtotal redondeado", () => {
    const l = LineaVenta.crear({ producto: " Café ", cantidad: 3, precioUnitario: 1.333 });
    expect(l.toPrimitives()).toEqual({ producto: "Café", cantidad: 3, precioUnitario: 1.33, subtotal: 3.99 });
  });

  it("permite precio 0", () => {
    expect(LineaVenta.crear({ producto: "Regalo", cantidad: 1, precioUnitario: 0 }).subtotal.amount).toBe(0);
  });

  it.each([0, -1, 1.5, Number.NaN])("rechaza cantidad %s", (cantidad) => {
    expect(() => LineaVenta.crear({ producto: "X", cantidad, precioUnitario: 1 })).toThrow(ValidationError);
  });

  it("rechaza precio negativo y producto vacío", () => {
    expect(() => LineaVenta.crear({ producto: "X", cantidad: 1, precioUnitario: -1 })).toThrow(ValidationError);
    expect(() => LineaVenta.crear({ producto: "  ", cantidad: 1, precioUnitario: 1 })).toThrow(ValidationError);
  });
});

describe("Venta", () => {
  const fecha = new Date("2026-10-01T10:00:00Z");

  it("calcula el total como suma de subtotales", () => {
    const v = Venta.registrar(
      "v1",
      {
        clienteId: "c1",
        lineas: [
          { producto: "Teclado", cantidad: 2, precioUnitario: 50 },
          { producto: "Mouse", cantidad: 1, precioUnitario: 25.5 },
          { producto: "Cable", cantidad: 3, precioUnitario: 0.1 },
        ],
      },
      fecha,
    );
    expect(v.toPrimitives()).toEqual({
      id: "v1",
      clienteId: "c1",
      lineas: [
        { producto: "Teclado", cantidad: 2, precioUnitario: 50, subtotal: 100 },
        { producto: "Mouse", cantidad: 1, precioUnitario: 25.5, subtotal: 25.5 },
        { producto: "Cable", cantidad: 3, precioUnitario: 0.1, subtotal: 0.3 },
      ],
      total: 125.8,
      fecha,
    });
  });

  it("exige al menos una línea", () => {
    expect(() => Venta.registrar("v1", { clienteId: "c1", lineas: [] })).toThrow(/al menos una línea/);
  });

  it("exige clienteId", () => {
    expect(() =>
      Venta.registrar("v1", { clienteId: " ", lineas: [{ producto: "X", cantidad: 1, precioUnitario: 1 }] }),
    ).toThrow(ValidationError);
  });

  it("ignora subtotal/total recibidos y los recalcula al reconstituir", () => {
    const v = Venta.reconstituir({
      id: "v1",
      clienteId: "c1",
      lineas: [{ producto: "X", cantidad: 2, precioUnitario: 10, subtotal: 999 }],
      total: 999,
      fecha,
    });
    expect(v.total.amount).toBe(20);
    expect(v.lineas[0]!.subtotal.amount).toBe(20);
  });
});

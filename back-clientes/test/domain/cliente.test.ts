import { describe, expect, it } from "vitest";
import { Cliente } from "../../src/domain/entities/Cliente.js";
import { ValidationError } from "../../src/domain/errors.js";
import { Documento } from "../../src/domain/value-objects/Documento.js";
import { Email } from "../../src/domain/value-objects/Email.js";

describe("Email", () => {
  it("normaliza a minúsculas y recorta espacios", () => {
    expect(Email.create("  Ana@Example.COM ").value).toBe("ana@example.com");
  });

  it.each(["", "sin-arroba", "a@b", "a @b.com", "a@b.c"])("rechaza '%s'", (raw) => {
    expect(() => Email.create(raw)).toThrow(ValidationError);
  });

  it("compara por valor", () => {
    expect(Email.create("a@b.com").equals(Email.create("A@B.com"))).toBe(true);
  });
});

describe("Documento", () => {
  it("acepta formatos habituales", () => {
    expect(Documento.create(" 12345678-K ").value).toBe("12345678-K");
    expect(Documento.create("1.234.567").value).toBe("1.234.567");
  });

  it.each(["", "ab", "#123456", "x".repeat(31)])("rechaza '%s'", (raw) => {
    expect(() => Documento.create(raw)).toThrow(ValidationError);
  });
});

describe("Cliente", () => {
  const datos = { nombre: " Ana Pérez ", email: "ANA@mail.com", documento: "12345678", telefono: "  " };

  it("crea un cliente válido normalizando datos", () => {
    const fecha = new Date("2026-01-01T00:00:00Z");
    const c = Cliente.crear("id-1", datos, fecha);
    expect(c.toPrimitives()).toEqual({
      id: "id-1",
      nombre: "Ana Pérez",
      email: "ana@mail.com",
      documento: "12345678",
      telefono: null,
      creadoEn: fecha,
    });
  });

  it("exige nombre", () => {
    expect(() => Cliente.crear("id-1", { ...datos, nombre: "   " })).toThrow(ValidationError);
  });

  it("valida email al crear", () => {
    expect(() => Cliente.crear("id-1", { ...datos, email: "malo" })).toThrow(ValidationError);
  });

  it("actualiza y revalida datos", () => {
    const c = Cliente.crear("id-1", datos);
    c.actualizar({ nombre: "Ana", email: "nuevo@mail.com", documento: "999", telefono: "+56 9 1234" });
    expect(c.email.value).toBe("nuevo@mail.com");
    expect(c.telefono).toBe("+56 9 1234");
    expect(() => c.actualizar({ ...datos, email: "x" })).toThrow(ValidationError);
  });

  it("reconstituye desde persistencia", () => {
    const fecha = new Date();
    const c = Cliente.reconstituir({
      id: "id-2",
      nombre: "Luis",
      email: "luis@mail.com",
      documento: "111",
      telefono: null,
      creadoEn: fecha,
    });
    expect(c.creadoEn).toBe(fecha);
    expect(c.nombre).toBe("Luis");
  });
});

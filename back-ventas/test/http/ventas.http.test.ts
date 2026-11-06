import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { setup } from "../helpers.js";

const body = {
  clienteId: "11111111-1111-4111-8111-111111111111",
  lineas: [
    { producto: "Teclado", cantidad: 2, precioUnitario: 50 },
    { producto: "Mouse", cantidad: 1, precioUnitario: 25.5 },
  ],
};

describe("HTTP /api/ventas", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ useCases: setup().useCases, corsOrigins: ["http://localhost:5002"] });
  });

  it("GET /health → 200 {status:ok}", async () => {
    await request(app).get("/health").expect(200, { status: "ok" });
  });

  it("aplica CORS para orígenes permitidos", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:5002");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5002");
    const otro = await request(app).get("/health").set("Origin", "http://evil.test");
    expect(otro.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("POST registra → 201 con la Venta del contrato", async () => {
    const res = await request(app).post("/api/ventas").send(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      clienteId: body.clienteId,
      lineas: [
        { producto: "Teclado", cantidad: 2, precioUnitario: 50, subtotal: 100 },
        { producto: "Mouse", cantidad: 1, precioUnitario: 25.5, subtotal: 25.5 },
      ],
      total: 125.5,
      fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(res.headers.location).toBe(`/api/ventas/${res.body.id}`);
  });

  it("ignora subtotal/total enviados por el cliente", async () => {
    const res = await request(app)
      .post("/api/ventas")
      .send({ clienteId: "c1", total: 1, lineas: [{ producto: "X", cantidad: 3, precioUnitario: 2, subtotal: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(6);
    expect(res.body.lineas[0].subtotal).toBe(6);
  });

  it.each([
    ["sin lineas", { clienteId: "c1", lineas: [] }],
    ["sin clienteId", { lineas: body.lineas }],
    ["cantidad 0", { clienteId: "c1", lineas: [{ producto: "X", cantidad: 0, precioUnitario: 1 }] }],
    ["cantidad decimal", { clienteId: "c1", lineas: [{ producto: "X", cantidad: 1.5, precioUnitario: 1 }] }],
    ["cantidad string", { clienteId: "c1", lineas: [{ producto: "X", cantidad: "2", precioUnitario: 1 }] }],
    ["precio negativo", { clienteId: "c1", lineas: [{ producto: "X", cantidad: 1, precioUnitario: -1 }] }],
    ["producto vacío", { clienteId: "c1", lineas: [{ producto: " ", cantidad: 1, precioUnitario: 1 }] }],
  ])("POST %s → 400 {error, details}", async (_caso, payload) => {
    const res = await request(app).post("/api/ventas").send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("POST con JSON malformado → 400", async () => {
    const res = await request(app).post("/api/ventas").set("Content-Type", "application/json").send("{malo");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "JSON inválido" });
  });

  it("GET lista y filtra por clienteId", async () => {
    await request(app).post("/api/ventas").send(body).expect(201);
    await request(app).post("/api/ventas").send({ ...body, clienteId: "otro" }).expect(201);

    const todas = await request(app).get("/api/ventas");
    expect(todas.status).toBe(200);
    expect(todas.body).toHaveLength(2);

    const filtradas = await request(app).get("/api/ventas").query({ clienteId: body.clienteId });
    expect(filtradas.body).toHaveLength(1);
    expect(filtradas.body[0].clienteId).toBe(body.clienteId);
  });

  it("GET /:id → 200 / 404", async () => {
    const { body: creada } = await request(app).post("/api/ventas").send(body);
    await request(app).get(`/api/ventas/${creada.id}`).expect(200, creada);
    const res = await request(app).get("/api/ventas/no-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("ruta desconocida → 404 JSON", async () => {
    const res = await request(app).delete("/api/ventas/x");
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

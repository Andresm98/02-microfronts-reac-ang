import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { setup } from "../helpers.js";

const ana = { nombre: "Ana", email: "ana@mail.com", documento: "11111111" };

describe("HTTP /api/clientes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ useCases: setup().useCases, corsOrigins: ["http://localhost:5001"] });
  });

  it("GET /health → 200 {status:ok}", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("aplica CORS para orígenes permitidos", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:5001");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5001");
    const otro = await request(app).get("/health").set("Origin", "http://evil.test");
    expect(otro.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("GET /api/clientes → [] inicialmente", async () => {
    const res = await request(app).get("/api/clientes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST crea → 201 con el Cliente del contrato", async () => {
    const res = await request(app).post("/api/clientes").send({ ...ana, telefono: "555" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      nombre: "Ana",
      email: "ana@mail.com",
      documento: "11111111",
      telefono: "555",
      creadoEn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(res.headers.location).toBe(`/api/clientes/${res.body.id}`);
  });

  it("POST con body incompleto → 400 con details", async () => {
    const res = await request(app).post("/api/clientes").send({ nombre: "Ana" });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "email" }), expect.objectContaining({ path: "documento" })]),
    );
  });

  it("POST con email inválido → 400", async () => {
    const res = await request(app).post("/api/clientes").send({ ...ana, email: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("POST con JSON malformado → 400", async () => {
    const res = await request(app).post("/api/clientes").set("Content-Type", "application/json").send("{malo");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "JSON inválido" });
  });

  it("POST con email duplicado → 409", async () => {
    await request(app).post("/api/clientes").send(ana).expect(201);
    const res = await request(app).post("/api/clientes").send({ ...ana, documento: "999" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/i);
  });

  it("GET /:id → 200 / 404", async () => {
    const { body: creado } = await request(app).post("/api/clientes").send(ana);
    await request(app).get(`/api/clientes/${creado.id}`).expect(200, creado);
    const res = await request(app).get("/api/clientes/no-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("PUT /:id → 200 / 400 / 404", async () => {
    const { body: creado } = await request(app).post("/api/clientes").send(ana);
    const ok = await request(app).put(`/api/clientes/${creado.id}`).send({ ...ana, nombre: "Ana B" });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ ...creado, nombre: "Ana B" });

    await request(app).put(`/api/clientes/${creado.id}`).send({ nombre: "" }).expect(400);
    await request(app).put("/api/clientes/no-existe").send(ana).expect(404);
  });

  it("PUT con email de otro cliente → 409", async () => {
    const { body: a } = await request(app).post("/api/clientes").send(ana);
    await request(app).post("/api/clientes").send({ ...ana, email: "otro@mail.com" }).expect(201);
    await request(app).put(`/api/clientes/${a.id}`).send({ ...ana, email: "otro@mail.com" }).expect(409);
  });

  it("DELETE /:id → 204 y luego 404", async () => {
    const { body: creado } = await request(app).post("/api/clientes").send(ana);
    const res = await request(app).delete(`/api/clientes/${creado.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    await request(app).delete(`/api/clientes/${creado.id}`).expect(404);
  });

  it("ruta desconocida → 404 JSON", async () => {
    const res = await request(app).get("/api/otra");
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

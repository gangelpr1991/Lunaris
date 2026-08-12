import { describe, it, expect, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { hashPassword, generateToken, comparePassword, findUserByEmail, ensureDefaultAdmin, authMiddleware, requireActionRole } from "../../server/auth.js";

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: "Faltan campos" });
    const user = await findUserByEmail(email);
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: "Credenciales invalidas." });
    }
    const token = generateToken(user);
    res.json({ ok: true, token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } });
  });

  app.get("/api/protected", authMiddleware, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  app.post("/api/admin-only", authMiddleware, (req, res, next) => {
    const mw = requireActionRole("CREAR_TERCERO");
    mw(req, res, next);
  }, (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe("Auth API", () => {
  const app = createTestApp();
  let token;

  it("POST /api/auth/login con credenciales correctas", async () => {
    await ensureDefaultAdmin();
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "Admin123!";
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@lunaris.com", password: adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.rol).toBe("superadmin");
    token = res.body.token;
  });

  it("POST /api/auth/login con contrasena incorrecta", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@lunaris.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("GET /api/protected sin token => 401", async () => {
    const res = await request(app).get("/api/protected");
    expect(res.status).toBe(401);
  });

  it("GET /api/protected con token valido => 200", async () => {
    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("admin@lunaris.com");
  });

  it("GET /api/protected con token invalido => 401", async () => {
    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", "Bearer bad-token-here");

    expect(res.status).toBe(401);
  });

  it("POST /api/admin-only con superadmin => 200", async () => {
    const res = await request(app)
      .post("/api/admin-only")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
  });
});

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "lunaris-dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const BCRYPT_ROUNDS = 12;

export function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function findUserByEmail(email) {
  return await db.queryOne("SELECT * FROM usuarios WHERE email = $1 AND activo = 1", [email]);
}

export async function createUser({ email, password, nombre, rol }) {
  const id = "usr-" + Math.random().toString(36).slice(2, 10);
  const hash = hashPassword(password);
  const createdAt = new Date().toISOString();
  await db.query(
    "INSERT INTO usuarios (id, email, password_hash, nombre, rol, activo, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id, email, hash, nombre, rol, 1, createdAt]
  );
  return { id, email, nombre, rol, activo: true, created_at: createdAt };
}

export async function ensureDefaultAdmin() {
  const existing = await db.queryOne("SELECT id FROM usuarios WHERE email = $1", ["admin@lunaris.com"]);
  if (!existing) {
    await createUser({
      email: "admin@lunaris.com",
      password: process.env.ADMIN_DEFAULT_PASSWORD || "Admin123!",
      nombre: "Administrador Lunaris",
      rol: "superadmin",
    });
    console.log("Usuario admin por defecto creado: admin@lunaris.com");
  }
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Token de autenticacion requerido." });
  }
  const token = header.slice(7);
  try {
    const decoded = verifyToken(token);
    const user = await findUserByEmail(decoded.email);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Usuario no encontrado o desactivado." });
    }
    req.user = { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
    req.actor = { usuario: user.nombre, rol: user.rol };
    next();
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      return res.status(401).json({ ok: false, error: "Token expirado. Inicie sesion nuevamente." });
    }
    return res.status(401).json({ ok: false, error: "Token invalido." });
  }
}

const ROLES_ESCRITURA = [
  "superadmin", "admin_empresa", "contador", "aux_contable", "gerente",
  "vendedor", "cajero_pos", "comprador", "bodeguero", "cartera", "talento_humano",
];

export function requireWriteRole(req, res, next) {
  if (!ROLES_ESCRITURA.includes(req.user.rol)) {
    return res.status(403).json({ ok: false, error: "Su rol no tiene permisos de escritura." });
  }
  next();
}

const PERMISOS_ACCION = {
  CREAR_COTIZACION: ["superadmin", "admin_empresa", "vendedor", "gerente"],
  APROBAR_COTIZACION: ["superadmin", "admin_empresa", "gerente", "contador"],
  CONVERTIR_PEDIDO: ["superadmin", "admin_empresa", "vendedor", "gerente"],
  GENERAR_REMISION: ["superadmin", "admin_empresa", "vendedor", "bodeguero", "gerente"],
  GENERAR_FACTURA: ["superadmin", "admin_empresa", "vendedor", "gerente", "contador"],
  REGISTRAR_RECIBO: ["superadmin", "admin_empresa", "cajero_pos", "cartera", "gerente"],
  ANULAR_FACTURA: ["superadmin", "admin_empresa", "gerente", "contador"],
  CREAR_OC: ["superadmin", "admin_empresa", "comprador", "gerente"],
  RECIBIR_OC: ["superadmin", "admin_empresa", "comprador", "bodeguero", "gerente"],
  GENERAR_FACTURA_COMPRA: ["superadmin", "admin_empresa", "comprador", "gerente", "contador"],
  PAGAR_FACTURA_COMPRA: ["superadmin", "admin_empresa", "cajero_pos", "gerente"],
  CREAR_TERCERO: ["superadmin", "admin_empresa", "vendedor", "comprador", "cartera", "gerente"],
  CREAR_PRODUCTO: ["superadmin", "admin_empresa", "bodeguero", "comprador", "gerente"],
  AJUSTE_INVENTARIO: ["superadmin", "admin_empresa", "bodeguero", "gerente"],
  TRANSFERENCIA_INVENTARIO: ["superadmin", "admin_empresa", "bodeguero", "gerente"],
  COMPROBANTE_MANUAL: ["superadmin", "admin_empresa", "contador", "aux_contable", "gerente"],
  MOVIMIENTO_TESORERIA: ["superadmin", "admin_empresa", "cajero_pos", "contador", "gerente"],
  TRANSFERENCIA_TESORERIA: ["superadmin", "admin_empresa", "cajero_pos", "contador", "gerente"],
  LIQUIDAR_NOMINA: ["superadmin", "admin_empresa", "talento_humano", "contador", "gerente"],
  SIMULAR_DIAN: ["superadmin", "admin_empresa", "contador", "gerente"],
};

export function requireActionRole(action) {
  return (req, res, next) => {
    const allowed = PERMISOS_ACCION[action] || [];
    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({ ok: false, error: `Su rol no tiene permiso para ejecutar la accion "${action}".` });
    }
    next();
  };
}

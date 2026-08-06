import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { initDB, loadFullState, saveFullState } from "./db.js";
import * as business from "./business.js";
import { authMiddleware, requireWriteRole, requireActionRole, generateToken, comparePassword, findUserByEmail, ensureDefaultAdmin } from "./auth.js";
import { loginSchema, validateBody } from "./validators.js";
import { swaggerSpec } from "./swagger.js";
import logger, { requestLogger } from "./logger.js";
import { runMigrations } from "./migrations.js";

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiadas solicitudes. Intente de nuevo en 15 minutos." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiados intentos de inicio de sesion. Intente de nuevo en 15 minutos." },
});

app.use("/api/", limiter);

if (process.env.NODE_ENV !== "test") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "Lunaris API Docs" }));
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Salud]
 *     summary: Verificar estado del servidor
 *     security: []
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesion
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso con token JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciales invalidas
 */
app.post("/api/auth/login", authLimiter, (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join("; ");
      return res.status(400).json({ ok: false, error: errors });
    }
    const { email, password } = parsed.data;
    const user = findUserByEmail(email);
    if (!user || !comparePassword(password, user.password_hash)) {
      logger.warn(`Intento de login fallido para: ${email}`);
      return res.status(401).json({ ok: false, error: "Credenciales invalidas." });
    }
    const token = generateToken(user);
    logger.info(`Login exitoso: ${user.email} (${user.rol})`);
    res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    });
  } catch (e) {
    logger.error(`Error en login: ${e.message}`);
    res.status(500).json({ ok: false, error: "Error interno del servidor." });
  }
});

/**
 * @swagger
 * /api/estado:
 *   get:
 *     tags: [Estado]
 *     summary: Obtener estado completo del sistema
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos completos del sistema (empresa, terceros, productos, facturas, etc.)
 *       401:
 *         description: Token no proporcionado o invalido
 */
app.use("/api/estado", authMiddleware);
app.use("/api/accion", authMiddleware);

app.get("/api/estado", (_req, res) => {
  try {
    const data = loadFullState();
    res.json(data);
  } catch (e) {
    logger.error(`Error cargando estado: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put("/api/estado", requireWriteRole, (req, res) => {
  try {
    saveFullState(req.body);
    res.json({ ok: true });
  } catch (e) {
    logger.error(`Error guardando estado: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const ACTIONS = {
  CREAR_COTIZACION: (actor, p) => business.crearCotizacion(actor, p),
  APROBAR_COTIZACION: (actor, p) => business.aprobarCotizacion(actor, p),
  CONVERTIR_PEDIDO: (actor, p) => business.convertirPedido(actor, p),
  GENERAR_REMISION: (actor, p) => business.generarRemision(actor, p),
  GENERAR_FACTURA: (actor, p) => business.generarFactura(actor, p),
  REGISTRAR_RECIBO: (actor, p) => business.registrarRecibo(actor, p),
  ANULAR_FACTURA: (actor, p) => business.anularFactura(actor, p),
  CREAR_OC: (actor, p) => business.crearOrdenCompra(actor, p),
  RECIBIR_OC: (actor, p) => business.recibirOrdenCompra(actor, p),
  GENERAR_FACTURA_COMPRA: (actor, p) => business.generarFacturaCompra(actor, p),
  PAGAR_FACTURA_COMPRA: (actor, p) => business.pagarFacturaCompra(actor, p),
  CREAR_TERCERO: (actor, p) => business.crearTercero(actor, p),
  CREAR_PRODUCTO: (actor, p) => business.crearProducto(actor, p),
  AJUSTE_INVENTARIO: (actor, p) => business.ajusteInventario(actor, p),
  TRANSFERENCIA_INVENTARIO: (actor, p) => business.transferenciaInventario(actor, p),
  COMPROBANTE_MANUAL: (actor, p) => business.crearComprobanteManual(actor, p),
  MOVIMIENTO_TESORERIA: (actor, p) => business.registrarMovimientoTesoreriaManual(actor, p),
  TRANSFERENCIA_TESORERIA: (actor, p) => business.transferenciaTesoreria(actor, p),
  LIQUIDAR_NOMINA: (actor, p) => business.liquidarNomina(actor, p),
  SIMULAR_DIAN: (actor, p) => business.simularRespuestaDian(actor, p),
};

/**
 * @swagger
 * /api/accion:
 *   post:
 *     tags: [Negocio]
 *     summary: Ejecutar accion de negocio
 *     description: "Acciones disponibles: CREAR_COTIZACION, APROBAR_COTIZACION, CONVERTIR_PEDIDO, GENERAR_REMISION, GENERAR_FACTURA, REGISTRAR_RECIBO, ANULAR_FACTURA, CREAR_OC, RECIBIR_OC, GENERAR_FACTURA_COMPRA, PAGAR_FACTURA_COMPRA, CREAR_TERCERO, CREAR_PRODUCTO, AJUSTE_INVENTARIO, TRANSFERENCIA_INVENTARIO, COMPROBANTE_MANUAL, MOVIMIENTO_TESORERIA, TRANSFERENCIA_TESORERIA, LIQUIDAR_NOMINA, SIMULAR_DIAN"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccionRequest'
 *     responses:
 *       200:
 *         description: Resultado de la accion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccionResponse'
 *       400:
 *         description: Datos invalidos o accion desconocida
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Rol sin permisos para esta accion
 */
app.post("/api/accion", (req, res) => {
  try {
    const { type, payload } = req.body;
    if (!type) return res.status(400).json({ ok: false, error: "Tipo de accion requerido." });
    const fn = ACTIONS[type];
    if (!fn) return res.status(400).json({ ok: false, error: `Accion desconocida: ${type}` });

    const actionRoleMw = requireActionRole(type);
    actionRoleMw(req, res, () => {
      const validationMw = validateBody(type);
      validationMw(req, res, () => {
        const result = fn(req.actor, payload || req.body.payload || {});
        if (result?.error) {
          logger.warn(`Accion ${type} rechazada: ${result.error}`, { user: req.user?.email });
          return res.json({ ok: false, error: result.error });
        }
        logger.info(`Accion ${type} ejecutada por ${req.user?.email}`);
        res.json({ ok: true, result });
      });
    });
  } catch (e) {
    logger.error(`Error en accion: ${e.message}`, { stack: e.stack });
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada." });
});

app.use((err, _req, res, _next) => {
  logger.error(`Error no manejado: ${err.message}`, { stack: err.stack });
  res.status(500).json({ ok: false, error: "Error interno del servidor." });
});

initDB();
runMigrations();
ensureDefaultAdmin();

app.listen(PORT, () => {
  logger.info(`Lunaris API en http://localhost:${PORT}`);
  logger.info("Logica de negocio — 20 acciones disponibles.");
  logger.info("Seguridad: Helmet + CORS + Rate Limit + JWT + Zod + RBAC.");
  logger.info(`Documentacion API: http://localhost:${PORT}/api/docs`);
});

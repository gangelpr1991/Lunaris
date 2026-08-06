import express from "express";
import cors from "cors";
import { initDB, loadFullState, saveFullState } from "./db.js";
import * as business from "./business.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/estado", (_req, res) => {
  try {
    const data = loadFullState();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/estado", (req, res) => {
  try {
    saveFullState(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
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

app.post("/api/accion", (req, res) => {
  try {
    const { type, payload, actor } = req.body;
    const fn = ACTIONS[type];
    if (!fn) return res.status(400).json({ ok: false, error: `Accion desconocida: ${type}` });
    const result = fn(actor || { usuario: "API", rol: "admin_empresa" }, payload);
    if (result?.error) return res.json({ ok: false, error: result.error });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

initDB();
app.listen(PORT, () => {
  console.log(`Lunaris API en http://localhost:${PORT}`);
  console.log("Logica de negocio en servidor — 20 acciones disponibles.");
});

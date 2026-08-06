import { z } from "zod";

const itemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.number().positive(),
  precio: z.number().optional(),
  costoUnitario: z.number().optional(),
  ivaPct: z.number().min(0).max(100).optional(),
});

const actorSchema = z.object({
  usuario: z.string().optional(),
  rol: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

export const crearTerceroSchema = z.object({
  tipo: z.enum(["cliente", "proveedor"]),
  tipoDoc: z.string().min(1),
  numDoc: z.string().min(1, "Numero de documento requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  ciudad: z.string().optional().or(z.literal("")),
  cupoCredito: z.number().min(0).default(0),
  condicionPagoDias: z.number().min(0).default(30),
  listaPrecios: z.string().default("General"),
});

export const crearProductoSchema = z.object({
  codigo: z.string().min(1, "Codigo requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  categoria: z.string().optional().default("General"),
  unidad: z.string().optional().default("UND"),
  precio: z.number().min(0),
  costoPromedio: z.number().min(0).default(0),
  iva: z.number().min(0).max(100).default(19),
  tieneLote: z.union([z.boolean(), z.number()]).optional().default(false),
  minimo: z.number().min(0).default(0),
});

export const crearCotizacionSchema = z.object({
  terceroId: z.string().min(1),
  sedeId: z.string().min(1),
  items: z.array(itemSchema).min(1, "Debe incluir al menos un item"),
  vendedor: z.string().optional(),
});

export const aprobarCotizacionSchema = z.object({
  id: z.string().min(1),
});

export const convertirPedidoSchema = z.object({
  id: z.string().min(1),
});

export const generarRemisionSchema = z.object({
  pedidoId: z.string().min(1),
  bodegaId: z.string().min(1),
});

export const generarFacturaSchema = z.object({
  remisionId: z.string().min(1),
});

export const registrarReciboSchema = z.object({
  facturaId: z.string().min(1),
  monto: z.number().positive("El monto debe ser mayor a cero"),
  medioPago: z.string().min(1),
  cajaBancoId: z.string().min(1),
  fecha: z.string().optional(),
});

export const anularFacturaSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().min(5, "El motivo debe tener al menos 5 caracteres"),
});

export const crearOCSchema = z.object({
  proveedorId: z.string().min(1),
  sedeId: z.string().min(1),
  bodegaId: z.string().min(1),
  items: z.array(itemSchema).min(1, "Debe incluir al menos un item"),
});

export const recibirOCSchema = z.object({
  ocId: z.string().min(1),
  items: z.array(z.object({
    productoId: z.string().min(1),
    cantidad: z.number().positive(),
  })).min(1),
});

export const generarFacturaCompraSchema = z.object({
  recepcionId: z.string().min(1),
});

export const pagarFacturaCompraSchema = z.object({
  facturaCompraId: z.string().min(1),
  monto: z.number().positive("El monto debe ser mayor a cero"),
  cajaBancoId: z.string().min(1),
  fecha: z.string().optional(),
});

export const ajusteInventarioSchema = z.object({
  productoId: z.string().min(1),
  bodegaId: z.string().min(1),
  cantidad: z.number().positive(),
  tipo: z.enum(["entrada", "salida"]),
  motivo: z.string().min(1, "Motivo requerido"),
});

export const transferenciaInventarioSchema = z.object({
  productoId: z.string().min(1),
  origenBodegaId: z.string().min(1),
  destinoBodegaId: z.string().min(1),
  cantidad: z.number().positive(),
});

export const movimientoTesoreriaSchema = z.object({
  cajaBancoId: z.string().min(1),
  tipo: z.enum(["ingreso", "egreso"]),
  concepto: z.string().min(1, "Concepto requerido"),
  monto: z.number().positive("El monto debe ser mayor a cero"),
  cuentaContrapartida: z.string().min(1),
});

export const transferenciaTesoreriaSchema = z.object({
  origenId: z.string().min(1),
  destinoId: z.string().min(1),
  monto: z.number().positive("El monto debe ser mayor a cero"),
});

export const comprobanteManualSchema = z.object({
  tipo: z.string().min(1),
  fecha: z.string().min(1),
  glosa: z.string().min(1, "Glosa requerida"),
  lineas: z.array(z.object({
    cuenta: z.string().min(1),
    nombre: z.string().optional(),
    tercero: z.string().optional().default("-"),
    debito: z.number().min(0).default(0),
    credito: z.number().min(0).default(0),
  })).min(2, "Se requieren al menos 2 lineas"),
});

export const liquidarNominaSchema = z.object({
  periodo: z.string().min(1, "Periodo requerido"),
  empleadoIds: z.array(z.string()).min(1, "Seleccione al menos un empleado"),
});

export const simularDianSchema = z.object({
  id: z.string().min(1),
});

const VALIDATORS = {
  CREAR_COTIZACION: crearCotizacionSchema,
  APROBAR_COTIZACION: aprobarCotizacionSchema,
  CONVERTIR_PEDIDO: convertirPedidoSchema,
  GENERAR_REMISION: generarRemisionSchema,
  GENERAR_FACTURA: generarFacturaSchema,
  REGISTRAR_RECIBO: registrarReciboSchema,
  ANULAR_FACTURA: anularFacturaSchema,
  CREAR_OC: crearOCSchema,
  RECIBIR_OC: recibirOCSchema,
  GENERAR_FACTURA_COMPRA: generarFacturaCompraSchema,
  PAGAR_FACTURA_COMPRA: pagarFacturaCompraSchema,
  CREAR_TERCERO: crearTerceroSchema,
  CREAR_PRODUCTO: crearProductoSchema,
  AJUSTE_INVENTARIO: ajusteInventarioSchema,
  TRANSFERENCIA_INVENTARIO: transferenciaInventarioSchema,
  COMPROBANTE_MANUAL: comprobanteManualSchema,
  MOVIMIENTO_TESORERIA: movimientoTesoreriaSchema,
  TRANSFERENCIA_TESORERIA: transferenciaTesoreriaSchema,
  LIQUIDAR_NOMINA: liquidarNominaSchema,
  SIMULAR_DIAN: simularDianSchema,
};

export function validateBody(actionType) {
  return (req, res, next) => {
    const schema = VALIDATORS[actionType];
    if (!schema) return next();
    const result = schema.safeParse(req.body?.payload || req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return res.status(400).json({ ok: false, error: `Datos invalidos: ${errors}` });
    }
    if (req.body?.payload) req.body.payload = result.data;
    else req.body = result.data;
    next();
  };
}

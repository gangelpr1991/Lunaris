import React, { useState, useMemo, useReducer, useRef, useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, ShoppingCart, Receipt, Boxes, Landmark,
  Wallet, Calculator, FileBarChart, Smartphone, Settings, ShieldCheck, Puzzle,
  Search, Bell, HelpCircle, ChevronDown, ChevronRight, Sun, Moon, Menu,
  Plus, Filter, Download, ArrowRight, CheckCircle2, XCircle, Clock, AlertTriangle,
  FileText, CreditCard, Truck, PackageCheck, PackageMinus, PackagePlus, ClipboardList,
  BadgeCheck, BadgeX, Ban, Printer, ScanLine, History, LogOut, ChevronsUpDown,
  TrendingUp, TrendingDown, Store, Wallet2, BookOpen, Scale, FileSpreadsheet,
  UserCog, KeyRound, Building, Warehouse, Tags, ListChecks, RefreshCw, Trash2,
  Pencil, X, Check, ArrowLeftRight, CalendarClock, MapPin, Mail, Phone,
  BarChart3, PieChart as PieChartIcon, DollarSign, AlertOctagon, Eye, ChevronLeft
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from "recharts";
import * as XLSX from "xlsx";
import appleTouchIcon from "../apple-touch-icon.png";

/* ============================================================================
  Lunaris - Plataforma administrativa y contable (MVP funcional)
   Aplicacion React de una sola vista (sin paso de instalacion).
   Ver "Guia de arquitectura" (menu Configuracion) y el documento adjunto
  Lunaris-Arquitectura.md para el detalle de decisiones.
   ============================================================================ */

/* ---------- Utilidades ---------- */
let __idSeq = 1000;
const nid = (prefix) => `${prefix}-${(__idSeq++).toString(36)}`;

const fmtCOP = (n) => {
  const v = Math.round((n || 0) * 100) / 100;
  return v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
};
const fmtNum = (n, d = 0) => (n ?? 0).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
};
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const addDays = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
// __clock permite "viajar en el tiempo" solo durante la generacion de datos de
// demostracion (buildSeed), para poder crear un historial con fechas realistas
// reutilizando las mismas funciones de negocio que usa la app en vivo.
let __clock = null;
const todayISO = () => __clock || new Date().toISOString();
const uniq = (arr) => Array.from(new Set(arr));

/* ---------- Catalogos base ---------- */

const ROLES = [
  { id: "superadmin", nombre: "Superadministrador", desc: "Acceso total a todas las empresas y modulos." },
  { id: "admin_empresa", nombre: "Administrador de empresa", desc: "Acceso total dentro de su empresa." },
  { id: "contador", nombre: "Contador", desc: "Contabilidad, impuestos, cierres y reportes financieros." },
  { id: "aux_contable", nombre: "Auxiliar contable", desc: "Registro contable de soporte, sin cierres." },
  { id: "gerente", nombre: "Gerente", desc: "Vision general, aprobaciones y reportes gerenciales." },
  { id: "vendedor", nombre: "Vendedor", desc: "Cotizaciones, pedidos y clientes." },
  { id: "cajero_pos", nombre: "Cajero/POS", desc: "Punto de venta, caja y recaudos." },
  { id: "comprador", nombre: "Comprador", desc: "Solicitudes y ordenes de compra, proveedores." },
  { id: "bodeguero", nombre: "Bodeguero", desc: "Inventario, conteos, transferencias y recepciones." },
  { id: "cartera", nombre: "Analista de cartera", desc: "Cobro, cartera y estados de cuenta." },
  { id: "talento_humano", nombre: "Talento humano", desc: "Empleados, novedades y nomina." },
  { id: "consulta", nombre: "Usuario de consulta", desc: "Solo lectura en los modulos habilitados." },
  { id: "auditor", nombre: "Auditor", desc: "Solo lectura + bitacora de auditoria completa." },
];

// modulo -> roles con acceso (superadmin y admin_empresa siempre tienen acceso total)
const PERMISOS_MODULO = {
  dashboard: ["gerente", "contador", "aux_contable", "vendedor", "cajero_pos", "comprador", "bodeguero", "cartera", "talento_humano", "consulta", "auditor"],
  terceros: ["vendedor", "comprador", "cartera", "gerente", "consulta", "auditor"],
  ventas: ["vendedor", "gerente", "cajero_pos", "consulta", "auditor"],
  pos: ["cajero_pos", "vendedor", "gerente", "auditor"],
  compras: ["comprador", "gerente", "consulta", "auditor"],
  inventario: ["bodeguero", "comprador", "vendedor", "gerente", "consulta", "auditor"],
  tesoreria: ["cajero_pos", "contador", "gerente", "cartera", "auditor"],
  cartera: ["cartera", "contador", "gerente", "vendedor", "auditor"],
  contabilidad: ["contador", "aux_contable", "gerente", "auditor"],
  nomina: ["talento_humano", "contador", "gerente", "auditor"],
  impuestos: ["contador", "gerente", "auditor"],
  reportes: ["gerente", "contador", "vendedor", "cartera", "bodeguero", "comprador", "auditor"],
  configuracion: ["gerente", "auditor"],
  integraciones: ["gerente", "auditor"],
  auditoria: ["auditor", "gerente", "contador"],
  movil: ["vendedor", "cajero_pos", "gerente", "comprador", "bodeguero", "cartera"],
};
const puedeVer = (rol, modulo) => rol === "superadmin" || rol === "admin_empresa" || (PERMISOS_MODULO[modulo] || []).includes(rol);
// acciones de escritura restringidas para consulta/auditor siempre
const puedeEscribir = (rol) => !["consulta", "auditor"].includes(rol);
const puedeAprobar = (rol) => ["superadmin", "admin_empresa", "gerente", "contador"].includes(rol);

const EMPRESA = {
  id: "emp-1",
  razonSocial: "Grupo Horizonte S.A.S.",
  nit: "900.123.456-7",
  responsabilidad: "Responsable de IVA - Regimen ordinario",
  direccion: "Calle 93 # 15-20, Bogota D.C.",
  telefono: "(601) 745 20 10",
  email: "contacto@grupohorizonte.demo",
  moneda: "COP",
  zonaHoraria: "America/Bogota",
};

const SEDES = [
  { id: "sede-bog", nombre: "Sede Bogota (Principal)", ciudad: "Bogota D.C." },
  { id: "sede-med", nombre: "Sede Medellin", ciudad: "Medellin" },
];

const BODEGAS = [
  { id: "bod-bog", nombre: "Bodega Principal Bogota", sedeId: "sede-bog" },
  { id: "bod-med", nombre: "Bodega Medellin", sedeId: "sede-med" },
];

const PLAN_CUENTAS = [
  { codigo: "1105", nombre: "Caja general", clase: "Activo", naturaleza: "Debito" },
  { codigo: "1110", nombre: "Bancos - Cta corriente", clase: "Activo", naturaleza: "Debito" },
  { codigo: "1305", nombre: "Clientes nacionales (CxC)", clase: "Activo", naturaleza: "Debito" },
  { codigo: "1355", nombre: "Anticipos y avances a proveedores", clase: "Activo", naturaleza: "Debito" },
  { codigo: "1435", nombre: "Inventario de mercancias", clase: "Activo", naturaleza: "Debito" },
  { codigo: "2205", nombre: "Proveedores nacionales (CxP)", clase: "Pasivo", naturaleza: "Credito" },
  { codigo: "2365", nombre: "Retencion en la fuente por pagar", clase: "Pasivo", naturaleza: "Credito" },
  { codigo: "2408", nombre: "IVA por pagar (generado)", clase: "Pasivo", naturaleza: "Credito" },
  { codigo: "2409", nombre: "IVA descontable (compras)", clase: "Activo", naturaleza: "Debito" },
  { codigo: "2505", nombre: "Salarios y prestaciones por pagar", clase: "Pasivo", naturaleza: "Credito" },
  { codigo: "3115", nombre: "Capital social", clase: "Patrimonio", naturaleza: "Credito" },
  { codigo: "3605", nombre: "Utilidades del ejercicio", clase: "Patrimonio", naturaleza: "Credito" },
  { codigo: "4135", nombre: "Ingresos por venta de mercancia", clase: "Ingreso", naturaleza: "Credito" },
  { codigo: "4140", nombre: "Ingresos por prestacion de servicios", clase: "Ingreso", naturaleza: "Credito" },
  { codigo: "6135", nombre: "Costo de venta de mercancia", clase: "Costo", naturaleza: "Debito" },
  { codigo: "5105", nombre: "Gastos de personal", clase: "Gasto", naturaleza: "Debito" },
  { codigo: "5110", nombre: "Honorarios", clase: "Gasto", naturaleza: "Debito" },
  { codigo: "5115", nombre: "Impuestos (diferentes de renta)", clase: "Gasto", naturaleza: "Debito" },
  { codigo: "5120", nombre: "Arrendamientos", clase: "Gasto", naturaleza: "Debito" },
  { codigo: "5135", nombre: "Servicios publicos", clase: "Gasto", naturaleza: "Debito" },
  { codigo: "5195", nombre: "Diversos - gastos varios", clase: "Gasto", naturaleza: "Debito" },
];
const cuenta = (codigo) => PLAN_CUENTAS.find((c) => c.codigo === codigo);

const TERCEROS_SEED = [
  { id: "t-001", tipo: "cliente", tipoDoc: "NIT", numDoc: "900.222.111-3", nombre: "Distribuciones Andinas S.A.S.", email: "compras@andinas.demo", telefono: "300 555 1201", ciudad: "Bogota D.C.", cupoCredito: 15000000, condicionPagoDias: 30, listaPrecios: "General" },
  { id: "t-002", tipo: "cliente", tipoDoc: "NIT", numDoc: "800.333.222-1", nombre: "Comercial El Roble Ltda.", email: "cartera@elroble.demo", telefono: "300 555 1202", ciudad: "Medellin", cupoCredito: 8000000, condicionPagoDias: 30, listaPrecios: "General" },
  { id: "t-003", tipo: "cliente", tipoDoc: "CC", numDoc: "1.020.304.050", nombre: "Laura Fernanda Restrepo", email: "laura.restrepo@correo.demo", telefono: "310 555 1203", ciudad: "Bogota D.C.", cupoCredito: 2000000, condicionPagoDias: 15, listaPrecios: "General" },
  { id: "t-004", tipo: "cliente", tipoDoc: "NIT", numDoc: "901.456.789-0", nombre: "Ferreteria Central del Norte S.A.S.", email: "pagos@ferreteriacentral.demo", telefono: "300 555 1204", ciudad: "Bucaramanga", cupoCredito: 10000000, condicionPagoDias: 45, listaPrecios: "Mayorista" },
  { id: "t-005", tipo: "cliente", tipoDoc: "NIT", numDoc: "830.111.444-5", nombre: "Super Insumos del Valle S.A.S.", email: "tesoreria@svalle.demo", telefono: "300 555 1205", ciudad: "Cali", cupoCredito: 12000000, condicionPagoDias: 30, listaPrecios: "Mayorista" },
  { id: "t-006", tipo: "cliente", tipoDoc: "CC", numDoc: "79.888.222", nombre: "Jorge Ivan Salcedo", email: "jorge.salcedo@correo.demo", telefono: "311 555 1206", ciudad: "Bogota D.C.", cupoCredito: 1500000, condicionPagoDias: 0, listaPrecios: "General" },
  { id: "t-007", tipo: "cliente", tipoDoc: "NIT", numDoc: "900.777.888-2", nombre: "Cadena de Minimercados La Economia", email: "compras@laeconomia.demo", telefono: "300 555 1207", ciudad: "Bogota D.C.", cupoCredito: 20000000, condicionPagoDias: 60, listaPrecios: "Mayorista" },
  { id: "t-008", tipo: "cliente", tipoDoc: "NIT", numDoc: "805.999.111-8", nombre: "Hoteles y Suites Cordillera S.A.S.", email: "compras@cordillera.demo", telefono: "300 555 1208", ciudad: "Medellin", cupoCredito: 9000000, condicionPagoDias: 30, listaPrecios: "General" },
  { id: "p-001", tipo: "proveedor", tipoDoc: "NIT", numDoc: "890.111.222-9", nombre: "Industrias Quimicas del Oriente S.A.", email: "ventas@iqoriente.demo", telefono: "300 555 2201", ciudad: "Bogota D.C.", condicionPagoDias: 30 },
  { id: "p-002", tipo: "proveedor", tipoDoc: "NIT", numDoc: "900.888.333-6", nombre: "Papeleria y Suministros Andes Ltda.", email: "facturacion@papelandes.demo", telefono: "300 555 2202", ciudad: "Bogota D.C.", condicionPagoDias: 30 },
  { id: "p-003", tipo: "proveedor", tipoDoc: "NIT", numDoc: "811.222.999-4", nombre: "Textiles y Empaques del Caribe S.A.S.", email: "cartera@empaquescaribe.demo", telefono: "300 555 2203", ciudad: "Barranquilla", condicionPagoDias: 45 },
  { id: "p-004", tipo: "proveedor", tipoDoc: "NIT", numDoc: "900.456.111-7", nombre: "Tecnologia y Computo Global S.A.S.", email: "ventas@tecglobal.demo", telefono: "300 555 2204", ciudad: "Bogota D.C.", condicionPagoDias: 30 },
  { id: "p-005", tipo: "proveedor", tipoDoc: "NIT", numDoc: "830.777.555-3", nombre: "Transportes y Logistica del Centro S.A.S.", email: "facturas@translogcentro.demo", telefono: "300 555 2205", ciudad: "Bogota D.C.", condicionPagoDias: 15 },
].map((t) => ({ ...t, saldoCartera: 0, saldoCxP: 0, creadoEn: "2022-01-15T09:00:00Z" }));

const PRODUCTOS_SEED = [
  { id: "prod-001", codigo: "AS-1001", nombre: "Aromatizante industrial x 5L", categoria: "Aseo y quimicos", unidad: "Galon", precio: 68000, costoPromedio: 41000, iva: 19, tieneLote: true, minimo: 20, stock: { "bod-bog": 140, "bod-med": 55 } },
  { id: "prod-002", codigo: "AS-1002", nombre: "Desinfectante multiusos x 1L", categoria: "Aseo y quimicos", unidad: "Unidad", precio: 12500, costoPromedio: 7200, iva: 19, tieneLote: true, minimo: 60, stock: { "bod-bog": 320, "bod-med": 130 } },
  { id: "prod-003", codigo: "OF-2001", nombre: "Resma papel bond carta x 500 hojas", categoria: "Papeleria", unidad: "Resma", precio: 16900, costoPromedio: 11800, iva: 19, tieneLote: false, minimo: 100, stock: { "bod-bog": 40, "bod-med": 18 } },
  { id: "prod-004", codigo: "OF-2002", nombre: "Toner generico compatible HK-85A", categoria: "Papeleria", unidad: "Unidad", precio: 145000, costoPromedio: 98000, iva: 19, tieneLote: false, minimo: 10, stock: { "bod-bog": 6, "bod-med": 3 } },
  { id: "prod-005", codigo: "EM-3001", nombre: "Caja de carton corrugado 40x30x30", categoria: "Empaques", unidad: "Unidad", precio: 3200, costoPromedio: 1900, iva: 19, tieneLote: false, minimo: 200, stock: { "bod-bog": 1500, "bod-med": 620 } },
  { id: "prod-006", codigo: "EM-3002", nombre: "Rollo strech film 50cm x 300m", categoria: "Empaques", unidad: "Rollo", precio: 28500, costoPromedio: 19000, iva: 19, tieneLote: false, minimo: 30, stock: { "bod-bog": 84, "bod-med": 12 } },
  { id: "prod-007", codigo: "TX-4001", nombre: "Overol dotacion industrial talla M", categoria: "Dotacion", unidad: "Unidad", precio: 62000, costoPromedio: 39000, iva: 19, tieneLote: true, minimo: 15, stock: { "bod-bog": 22, "bod-med": 9 } },
  { id: "prod-008", codigo: "TX-4002", nombre: "Guantes de nitrilo caja x 100", categoria: "Dotacion", unidad: "Caja", precio: 34900, costoPromedio: 22500, iva: 19, tieneLote: true, minimo: 25, stock: { "bod-bog": 5, "bod-med": 2 } },
  { id: "prod-009", codigo: "SV-5001", nombre: "Servicio de fumigacion industrial", categoria: "Servicios", unidad: "Servicio", precio: 320000, costoPromedio: 0, iva: 19, tieneLote: false, minimo: 0, stock: {} },
  { id: "prod-010", codigo: "SV-5002", nombre: "Servicio de mantenimiento preventivo", categoria: "Servicios", unidad: "Servicio", precio: 210000, costoPromedio: 0, iva: 19, tieneLote: false, minimo: 0, stock: {} },
];

const CAJAS_BANCOS_SEED = [
  { id: "cb-001", tipo: "caja", nombre: "Caja general Bogota", sedeId: "sede-bog", saldo: 1850000 },
  { id: "cb-002", tipo: "caja", nombre: "Caja Medellin", sedeId: "sede-med", saldo: 620000 },
  { id: "cb-003", tipo: "banco", nombre: "Bancolombia Cta. Corriente ****4471", sedeId: "sede-bog", saldo: 38500000 },
  { id: "cb-004", tipo: "banco", nombre: "Davivienda Cta. Ahorros ****9012", sedeId: "sede-bog", saldo: 12250000 },
];

const EMPLEADOS_SEED = [
  { id: "emp-e1", nombre: "Camila Torres Gil", cargo: "Contadora", areaId: "Contabilidad", sedeId: "sede-bog", salario: 4200000, tipoContrato: "Termino indefinido", fechaIngreso: "2021-03-01" },
  { id: "emp-e2", nombre: "Andres Felipe Diaz", cargo: "Vendedor senior", areaId: "Comercial", sedeId: "sede-bog", salario: 2100000, tipoContrato: "Termino indefinido", fechaIngreso: "2022-06-15" },
  { id: "emp-e3", nombre: "Paula Andrea Nino", cargo: "Auxiliar de bodega", areaId: "Logistica", sedeId: "sede-bog", salario: 1450000, tipoContrato: "Termino fijo", fechaIngreso: "2023-02-10" },
  { id: "emp-e4", nombre: "Sebastian Ortiz Ruiz", cargo: "Vendedor", areaId: "Comercial", sedeId: "sede-med", salario: 1900000, tipoContrato: "Termino indefinido", fechaIngreso: "2022-09-01" },
  { id: "emp-e5", nombre: "Diana Marcela Cortes", cargo: "Auxiliar contable", areaId: "Contabilidad", sedeId: "sede-bog", salario: 1800000, tipoContrato: "Termino indefinido", fechaIngreso: "2023-05-20" },
  { id: "emp-e6", nombre: "Kevin Alejandro Mesa", cargo: "Bodeguero", areaId: "Logistica", sedeId: "sede-med", salario: 1420000, tipoContrato: "Termino fijo", fechaIngreso: "2023-11-03" },
];

/* ============================================================================
   MOTOR DE REGLAS DE NEGOCIO
   Todas las funciones reciben "draft" (un clon mutable del estado, ver reducer
   mas abajo) y lo modifican en el sitio. Las mismas funciones se usan tanto
   para poblar los datos de demostracion (buildSeed) como para las acciones
   reales del usuario en la app -> una sola fuente de verdad para las reglas.
   ============================================================================ */

function pushAudit(draft, actor, accion, detalle) {
  draft.auditLog.unshift({ id: nid("aud"), fecha: todayISO(), usuario: actor?.usuario || "Usuario demo", rol: actor?.rol || "-", accion, detalle });
}

function nextConsecutivo(draft, key, prefix) {
  const year = new Date(todayISO()).getFullYear();
  const seq = (draft.consecutivos[key] = (draft.consecutivos[key] || 0) + 1);
  return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
}

function crearComprobante(draft, { tipo, fecha, origen, lineas, glosa }) {
  const totalDebito = lineas.reduce((s, l) => s + (l.debito || 0), 0);
  const totalCredito = lineas.reduce((s, l) => s + (l.credito || 0), 0);
  const numero = nextConsecutivo(draft, "comprobante", "CC");
  const comp = { id: nid("cmp"), numero, tipo, fecha, origen, glosa, lineas, totalDebito, totalCredito, balanceado: Math.abs(totalDebito - totalCredito) < 1 };
  draft.comprobantes.push(comp);
  return comp;
}

function moverInventario(draft, { productoId, bodegaId, cantidad, tipo, origen, fecha, costoUnitario }) {
  const prod = draft.productos.find((p) => p.id === productoId);
  if (!prod) return;
  const stockAntes = prod.stock[bodegaId] || 0;
  if (tipo === "entrada") {
    if (costoUnitario != null && costoUnitario >= 0) {
      const stockTotalAntes = Object.values(prod.stock).reduce((s, v) => s + v, 0);
      const valorAntes = stockTotalAntes * (prod.costoPromedio || 0);
      const valorEntrada = cantidad * costoUnitario;
      const nuevoTotal = stockTotalAntes + cantidad;
      prod.costoPromedio = nuevoTotal > 0 ? (valorAntes + valorEntrada) / nuevoTotal : costoUnitario;
    }
    prod.stock[bodegaId] = stockAntes + cantidad;
  } else {
    prod.stock[bodegaId] = stockAntes - cantidad;
  }
  draft.movimientosInventario.unshift({ id: nid("mov"), productoId, bodegaId, cantidad, tipo, origen, fecha, saldoResultante: prod.stock[bodegaId] });
}

function crearCotizacion(draft, actor, { terceroId, sedeId, items, vendedor }) {
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "cotizacion", "COT");
  const itemsEnriquecidos = items.map((i) => {
    const prod = draft.productos.find((p) => p.id === i.productoId);
    return { ...i, nombre: prod?.nombre, codigo: prod?.codigo };
  });
  const subtotal = itemsEnriquecidos.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const iva = itemsEnriquecidos.reduce((s, i) => s + i.cantidad * i.precio * ((i.ivaPct ?? 19) / 100), 0);
  const total = subtotal + iva;
  const cot = { id: nid("cot"), numero, terceroId, sedeId, vendedor: vendedor || "Usuario demo", fecha, items: itemsEnriquecidos, subtotal, iva, total, estado: "borrador" };
  draft.cotizaciones.unshift(cot);
  pushAudit(draft, actor, "Crear cotizacion", `${numero} por ${fmtCOP(total)}`);
  return cot;
}

function aprobarCotizacion(draft, actor, cotizacionId) {
  const cot = draft.cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot || cot.estado !== "borrador") return { error: "Solo se pueden aprobar cotizaciones en borrador." };
  cot.estado = "aprobada";
  pushAudit(draft, actor, "Aprobar cotizacion", cot.numero);
  return cot;
}

function convertirPedido(draft, actor, cotizacionId) {
  const cot = draft.cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot || cot.estado !== "aprobada") return { error: "La cotizacion debe estar aprobada antes de convertirla en pedido." };
  const numero = nextConsecutivo(draft, "pedido", "PED");
  const ped = { id: nid("ped"), numero, cotizacionId, terceroId: cot.terceroId, sedeId: cot.sedeId, fecha: todayISO(), items: cot.items, subtotal: cot.subtotal, iva: cot.iva, total: cot.total, estado: "pendiente" };
  draft.pedidos.unshift(ped);
  cot.estado = "convertida";
  pushAudit(draft, actor, "Convertir cotizacion a pedido", `${cot.numero} -> ${numero}`);
  return ped;
}

function generarRemision(draft, actor, pedidoId, bodegaId) {
  const ped = draft.pedidos.find((p) => p.id === pedidoId);
  if (!ped || ped.estado === "remisionado") return { error: "El pedido no existe o ya fue remisionado." };
  for (const it of ped.items) {
    const prod = draft.productos.find((p) => p.id === it.productoId);
    if (prod && prod.categoria !== "Servicios" && (prod.stock[bodegaId] || 0) < it.cantidad) {
      return { error: `Stock insuficiente de "${prod.nombre}" en la bodega seleccionada (disponible ${prod.stock[bodegaId] || 0}, requerido ${it.cantidad}).` };
    }
  }
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "remision", "REM");
  const rem = { id: nid("rem"), numero, pedidoId, terceroId: ped.terceroId, bodegaId, fecha, items: ped.items, estado: "entregada" };
  draft.remisiones.unshift(rem);
  ped.estado = "remisionado";
  for (const it of ped.items) {
    const prod = draft.productos.find((p) => p.id === it.productoId);
    if (prod && prod.categoria !== "Servicios") {
      moverInventario(draft, { productoId: it.productoId, bodegaId, cantidad: it.cantidad, tipo: "salida", origen: `Remision ${numero}`, fecha });
    }
  }
  pushAudit(draft, actor, "Generar remision", `${numero} de pedido ${ped.numero}`);
  return rem;
}

function generarFactura(draft, actor, remisionId) {
  const rem = draft.remisiones.find((r) => r.id === remisionId);
  if (!rem) return { error: "Remision no encontrada." };
  if (draft.facturas.some((f) => f.remisionId === remisionId)) return { error: "Esta remision ya tiene una factura asociada." };
  const ped = draft.pedidos.find((p) => p.id === rem.pedidoId);
  const tercero = draft.terceros.find((t) => t.id === rem.terceroId);
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "factura", "FV");
  const subtotal = ped.subtotal, iva = ped.iva, total = ped.total;
  const vencimiento = addDays(fecha, tercero.condicionPagoDias || 0);
  const fac = { id: nid("fac"), numero, remisionId, pedidoId: ped.id, terceroId: rem.terceroId, sedeId: ped.sedeId, fecha, vencimiento, items: ped.items, subtotal, iva, total, saldo: total, estado: "pendiente", estadoDian: "borrador", cufe: null, pagos: [] };
  draft.facturas.unshift(fac);
  tercero.saldoCartera = (tercero.saldoCartera || 0) + total;
  crearComprobante(draft, {
    tipo: "Factura de venta", fecha, origen: { tipo: "factura", id: fac.id, numero },
    glosa: `Venta segun factura ${numero} a ${tercero.nombre}`,
    lineas: [
      { cuenta: "1305", nombre: cuenta("1305").nombre, tercero: tercero.nombre, debito: total, credito: 0 },
      { cuenta: "4135", nombre: cuenta("4135").nombre, tercero: tercero.nombre, debito: 0, credito: subtotal },
      { cuenta: "2408", nombre: cuenta("2408").nombre, tercero: tercero.nombre, debito: 0, credito: iva },
    ],
  });
  const costoTotal = ped.items.reduce((s, it) => {
    const p = draft.productos.find((pp) => pp.id === it.productoId);
    return s + (p && p.categoria !== "Servicios" ? it.cantidad * (p.costoPromedio || 0) : 0);
  }, 0);
  if (costoTotal > 0) {
    crearComprobante(draft, {
      tipo: "Costo de venta", fecha, origen: { tipo: "factura", id: fac.id, numero },
      glosa: `Costo de venta asociado a factura ${numero}`,
      lineas: [
        { cuenta: "6135", nombre: cuenta("6135").nombre, tercero: tercero.nombre, debito: costoTotal, credito: 0 },
        { cuenta: "1435", nombre: cuenta("1435").nombre, tercero: tercero.nombre, debito: 0, credito: costoTotal },
      ],
    });
  }
  pushAudit(draft, actor, "Emitir factura de venta", `${numero} por ${fmtCOP(total)}`);
  return fac;
}

function registrarRecibo(draft, actor, { facturaId, monto, medioPago, cajaBancoId, fecha }) {
  const fac = draft.facturas.find((f) => f.id === facturaId);
  if (!fac || fac.estado === "anulada") return { error: "La factura no existe o esta anulada." };
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  if (monto > fac.saldo + 0.5) return { error: `El monto (${fmtCOP(monto)}) supera el saldo pendiente (${fmtCOP(fac.saldo)}).` };
  const f = fecha || todayISO();
  const numero = nextConsecutivo(draft, "reciboCaja", "RC");
  const recibo = { id: nid("rec"), numero, facturaId, monto, medioPago, cajaBancoId, fecha: f };
  fac.pagos.push(recibo);
  fac.saldo = Math.round((fac.saldo - monto) * 100) / 100;
  fac.estado = fac.saldo <= 0 ? "pagada" : "parcial";
  const tercero = draft.terceros.find((t) => t.id === fac.terceroId);
  tercero.saldoCartera = Math.max(0, Math.round(((tercero.saldoCartera || 0) - monto) * 100) / 100);
  const cb = draft.cajasBancos.find((c) => c.id === cajaBancoId);
  if (cb) cb.saldo += monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId, tipo: "ingreso", concepto: `Recibo de caja ${numero} - Factura ${fac.numero}`, monto, fecha: f });
  crearComprobante(draft, {
    tipo: "Recibo de caja", fecha: f, origen: { tipo: "recibo", id: recibo.id, numero },
    glosa: `Recaudo de factura ${fac.numero} - ${tercero.nombre}`,
    lineas: [
      { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? cuenta("1105").nombre : cuenta("1110").nombre, tercero: tercero.nombre, debito: monto, credito: 0 },
      { cuenta: "1305", nombre: cuenta("1305").nombre, tercero: tercero.nombre, debito: 0, credito: monto },
    ],
  });
  pushAudit(draft, actor, "Registrar recibo de caja", `${numero} por ${fmtCOP(monto)} sobre ${fac.numero}`);
  return recibo;
}

function anularFactura(draft, actor, facturaId, motivo) {
  const fac = draft.facturas.find((f) => f.id === facturaId);
  if (!fac) return { error: "Factura no encontrada." };
  if (fac.pagos.length > 0) return { error: "No se puede anular una factura con recaudos aplicados. Reverse primero los recibos asociados." };
  if (!motivo || motivo.trim().length < 5) return { error: "Debe indicar un motivo de anulacion (minimo 5 caracteres)." };
  fac.estado = "anulada";
  fac.estadoDian = "anulado";
  fac.motivoAnulacion = motivo;
  const tercero = draft.terceros.find((t) => t.id === fac.terceroId);
  tercero.saldoCartera = Math.max(0, Math.round(((tercero.saldoCartera || 0) - fac.saldo) * 100) / 100);
  crearComprobante(draft, {
    tipo: "Anulacion factura", fecha: todayISO(), origen: { tipo: "factura", id: fac.id, numero: fac.numero },
    glosa: `Anulacion de factura ${fac.numero}. Motivo: ${motivo}`,
    lineas: [
      { cuenta: "4135", nombre: cuenta("4135").nombre, tercero: tercero.nombre, debito: fac.subtotal, credito: 0 },
      { cuenta: "2408", nombre: cuenta("2408").nombre, tercero: tercero.nombre, debito: fac.iva, credito: 0 },
      { cuenta: "1305", nombre: cuenta("1305").nombre, tercero: tercero.nombre, debito: 0, credito: fac.total },
    ],
  });
  pushAudit(draft, actor, "Anular factura", `${fac.numero}. Motivo: ${motivo}`);
  return fac;
}

function crearOrdenCompra(draft, actor, { proveedorId, sedeId, bodegaId, items }) {
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "ordenCompra", "OC");
  const itemsEnriquecidos = items.map((i) => { const prod = draft.productos.find((p) => p.id === i.productoId); return { ...i, nombre: prod?.nombre, codigo: prod?.codigo }; });
  const total = itemsEnriquecidos.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
  const oc = { id: nid("oc"), numero, proveedorId, sedeId, bodegaId, fecha, items: itemsEnriquecidos, total, estado: "pendiente", recibidoItems: {} };
  draft.ordenesCompra.unshift(oc);
  pushAudit(draft, actor, "Crear orden de compra", `${numero} por ${fmtCOP(total)}`);
  return oc;
}

function recibirOrdenCompra(draft, actor, ocId, itemsRecibidos) {
  const oc = draft.ordenesCompra.find((o) => o.id === ocId);
  if (!oc) return { error: "Orden de compra no encontrada." };
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "recepcion", "REC");
  for (const it of itemsRecibidos) {
    const itemOC = oc.items.find((x) => x.productoId === it.productoId);
    moverInventario(draft, { productoId: it.productoId, bodegaId: oc.bodegaId, cantidad: it.cantidad, tipo: "entrada", origen: `Recepcion ${numero} (OC ${oc.numero})`, fecha, costoUnitario: itemOC?.costoUnitario });
    oc.recibidoItems[it.productoId] = (oc.recibidoItems[it.productoId] || 0) + it.cantidad;
  }
  const totalPedido = oc.items.reduce((s, i) => s + i.cantidad, 0);
  const totalRecibido = Object.values(oc.recibidoItems).reduce((s, v) => s + v, 0);
  oc.estado = totalRecibido >= totalPedido ? "recibida" : "recibida_parcial";
  const itemsEnriquecidos = itemsRecibidos.map((it) => { const itemOC = oc.items.find((x) => x.productoId === it.productoId); return { ...it, nombre: itemOC?.nombre, codigo: itemOC?.codigo }; });
  const recepcion = { id: nid("rcp"), numero, ocId, items: itemsEnriquecidos, fecha };
  draft.recepciones.unshift(recepcion);
  pushAudit(draft, actor, "Recibir orden de compra", `${numero} sobre ${oc.numero}`);
  return recepcion;
}

function generarFacturaCompra(draft, actor, recepcionId) {
  const rcp = draft.recepciones.find((r) => r.id === recepcionId);
  if (!rcp) return { error: "Recepcion no encontrada." };
  if (draft.facturasCompra.some((f) => f.recepcionId === recepcionId)) return { error: "Esta recepcion ya tiene una factura de compra asociada." };
  const oc = draft.ordenesCompra.find((o) => o.id === rcp.ocId);
  const prov = draft.terceros.find((t) => t.id === oc.proveedorId);
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "facturaCompra", "FC");
  const subtotal = rcp.items.reduce((s, it) => { const itemOC = oc.items.find((x) => x.productoId === it.productoId); return s + it.cantidad * (itemOC?.costoUnitario || 0); }, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;
  const vencimiento = addDays(fecha, prov.condicionPagoDias || 30);
  const fc = { id: nid("fc"), numero, recepcionId, ocId: oc.id, proveedorId: oc.proveedorId, fecha, vencimiento, items: rcp.items, subtotal, iva, total, saldo: total, estado: "pendiente" };
  draft.facturasCompra.unshift(fc);
  prov.saldoCxP = (prov.saldoCxP || 0) + total;
  crearComprobante(draft, {
    tipo: "Factura de compra", fecha, origen: { tipo: "facturaCompra", id: fc.id, numero },
    glosa: `Compra segun factura proveedor ${numero} - ${prov.nombre}`,
    lineas: [
      { cuenta: "1435", nombre: cuenta("1435").nombre, tercero: prov.nombre, debito: subtotal, credito: 0 },
      { cuenta: "2409", nombre: cuenta("2409").nombre, tercero: prov.nombre, debito: iva, credito: 0 },
      { cuenta: "2205", nombre: cuenta("2205").nombre, tercero: prov.nombre, debito: 0, credito: total },
    ],
  });
  pushAudit(draft, actor, "Registrar factura de compra", `${numero} por ${fmtCOP(total)}`);
  return fc;
}

function pagarFacturaCompra(draft, actor, { facturaCompraId, monto, cajaBancoId, fecha }) {
  const fc = draft.facturasCompra.find((f) => f.id === facturaCompraId);
  if (!fc) return { error: "Factura de compra no encontrada." };
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  if (monto > fc.saldo + 0.5) return { error: `El monto supera el saldo pendiente (${fmtCOP(fc.saldo)}).` };
  const f = fecha || todayISO();
  const numero = nextConsecutivo(draft, "egreso", "CE");
  fc.saldo = Math.round((fc.saldo - monto) * 100) / 100;
  fc.estado = fc.saldo <= 0 ? "pagada" : "parcial";
  const prov = draft.terceros.find((t) => t.id === fc.proveedorId);
  prov.saldoCxP = Math.max(0, Math.round(((prov.saldoCxP || 0) - monto) * 100) / 100);
  const cb = draft.cajasBancos.find((c) => c.id === cajaBancoId);
  if (cb) cb.saldo -= monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId, tipo: "egreso", concepto: `Comprobante de egreso ${numero} - Factura compra ${fc.numero}`, monto, fecha: f });
  crearComprobante(draft, {
    tipo: "Comprobante de egreso", fecha: f, origen: { tipo: "egreso", id: numero, numero },
    glosa: `Pago factura de compra ${fc.numero} - ${prov.nombre}`,
    lineas: [
      { cuenta: "2205", nombre: cuenta("2205").nombre, tercero: prov.nombre, debito: monto, credito: 0 },
      { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? cuenta("1105").nombre : cuenta("1110").nombre, tercero: prov.nombre, debito: 0, credito: monto },
    ],
  });
  pushAudit(draft, actor, "Pagar factura de compra", `${numero} por ${fmtCOP(monto)}`);
  return { numero, monto };
}

function crearTercero(draft, actor, data) {
  if (draft.terceros.some((t) => t.numDoc === data.numDoc)) return { error: `Ya existe un tercero con el documento ${data.numDoc}.` };
  const t = { id: nid(data.tipo === "proveedor" ? "p" : "t"), saldoCartera: 0, saldoCxP: 0, creadoEn: todayISO(), ...data };
  draft.terceros.unshift(t);
  pushAudit(draft, actor, "Crear tercero", `${t.nombre} (${t.tipo})`);
  return t;
}

function crearProducto(draft, actor, data) {
  if (draft.productos.some((p) => p.codigo === data.codigo)) return { error: `Ya existe un producto con el codigo ${data.codigo}.` };
  const p = { id: nid("prod"), stock: {}, ...data };
  draft.productos.unshift(p);
  pushAudit(draft, actor, "Crear producto", `${p.codigo} - ${p.nombre}`);
  return p;
}

function ajusteInventario(draft, actor, { productoId, bodegaId, cantidad, tipo, motivo }) {
  const prod = draft.productos.find((p) => p.id === productoId);
  if (!prod) return { error: "Producto no encontrado." };
  if (tipo === "salida" && (prod.stock[bodegaId] || 0) < cantidad) return { error: "El ajuste de salida supera el stock disponible." };
  moverInventario(draft, { productoId, bodegaId, cantidad: Math.abs(cantidad), tipo, origen: `Ajuste manual (${motivo})`, fecha: todayISO() });
  pushAudit(draft, actor, "Ajuste de inventario", `${tipo} de ${cantidad} und. de ${prod.nombre}. Motivo: ${motivo}`);
}

function transferenciaInventario(draft, actor, { productoId, origenBodegaId, destinoBodegaId, cantidad }) {
  const prod = draft.productos.find((p) => p.id === productoId);
  if (!prod) return { error: "Producto no encontrado." };
  if (origenBodegaId === destinoBodegaId) return { error: "La bodega de origen y destino deben ser diferentes." };
  if ((prod.stock[origenBodegaId] || 0) < cantidad) return { error: "Stock insuficiente en la bodega de origen." };
  const fecha = todayISO();
  moverInventario(draft, { productoId, bodegaId: origenBodegaId, cantidad, tipo: "salida", origen: `Transferencia a ${destinoBodegaId}`, fecha });
  moverInventario(draft, { productoId, bodegaId: destinoBodegaId, cantidad, tipo: "entrada", origen: `Transferencia desde ${origenBodegaId}`, fecha });
  pushAudit(draft, actor, "Transferencia de inventario", `${cantidad} und. de ${prod.nombre}`);
}

function crearComprobanteManual(draft, actor, { tipo, fecha, glosa, lineas }) {
  const totalDebito = lineas.reduce((s, l) => s + (Number(l.debito) || 0), 0);
  const totalCredito = lineas.reduce((s, l) => s + (Number(l.credito) || 0), 0);
  if (Math.abs(totalDebito - totalCredito) > 0.5) return { error: `El comprobante no cuadra: debitos ${fmtCOP(totalDebito)} vs creditos ${fmtCOP(totalCredito)}.` };
  if (lineas.length < 2) return { error: "Un comprobante requiere al menos dos lineas (partida doble)." };
  const comp = crearComprobante(draft, { tipo, fecha, origen: { tipo: "manual" }, glosa, lineas });
  pushAudit(draft, actor, "Registrar comprobante manual", `${comp.numero} - ${glosa}`);
  return comp;
}

function simularRespuestaDian(draft, actor, facturaId) {
  const fac = draft.facturas.find((f) => f.id === facturaId);
  if (!fac) return { error: "Factura no encontrada." };
  const r = Math.random();
  fac.estadoDian = r < 0.85 ? "aceptado" : r < 0.95 ? "contingencia" : "rechazado";
  fac.cufe = fac.estadoDian === "aceptado" ? `CUFE-SIM-${Math.random().toString(36).slice(2, 18)}` : null;
  pushAudit(draft, actor, "Simular respuesta DIAN (sandbox)", `${fac.numero}: ${fac.estadoDian} - simulado, sin conexion real a DIAN`);
  return fac;
}

/* ============================================================================
   DATOS DE DEMOSTRACION — Grupo Horizonte S.A.S.
   Se generan reutilizando el motor de reglas de negocio de arriba, "viajando
   en el tiempo" con __clock, para que el historial (cartera, kardex,
   comprobantes) sea perfectamente consistente con lo que el usuario vera si
   repite el mismo flujo manualmente.
   ============================================================================ */

function buildSeed() {
  const draft = {
    empresa: EMPRESA, sedes: SEDES, bodegas: BODEGAS, roles: ROLES, planCuentas: PLAN_CUENTAS,
    cajasBancos: structuredClone(CAJAS_BANCOS_SEED),
    terceros: structuredClone(TERCEROS_SEED),
    productos: structuredClone(PRODUCTOS_SEED),
    empleados: structuredClone(EMPLEADOS_SEED),
    consecutivos: {},
    cotizaciones: [], pedidos: [], remisiones: [], facturas: [],
    ordenesCompra: [], recepciones: [], facturasCompra: [],
    movimientosInventario: [], movimientosTesoreria: [], comprobantes: [], auditLog: [],
  };
  const sistema = { usuario: "Carga inicial", rol: "superadmin" };
  const at = (iso, fn) => { __clock = iso; fn(); __clock = null; };
  const P = (id, cantidad) => { const prod = draft.productos.find((p) => p.id === id); return { productoId: id, cantidad, precio: prod.precio, ivaPct: prod.iva }; };
  const CU = (id, cantidad, costoUnitario) => ({ productoId: id, cantidad, costoUnitario });

  function flujoVenta({ fechaCot, terceroId, sedeId, bodegaId, items, hasta, montoParcial, anular, motivoAnulacion, fechaRecibo }) {
    let cot, ped, rem, fac;
    at(fechaCot, () => { cot = crearCotizacion(draft, sistema, { terceroId, sedeId, items }); });
    if (hasta === "cotizacion") return { cot };
    at(addDays(fechaCot, 1), () => { aprobarCotizacion(draft, sistema, cot.id); ped = convertirPedido(draft, sistema, cot.id); });
    if (hasta === "pedido") return { cot, ped };
    at(addDays(fechaCot, 2), () => { rem = generarRemision(draft, sistema, ped.id, bodegaId); });
    if (hasta === "remision" || rem?.error) return { cot, ped, rem };
    at(addDays(fechaCot, 2), () => { fac = generarFactura(draft, sistema, rem.id); });
    if (anular) { at(addDays(fechaCot, 3), () => anularFactura(draft, sistema, fac.id, motivoAnulacion)); return { cot, ped, rem, fac }; }
    if (hasta === "pagada") at(fechaRecibo || addDays(fechaCot, 8), () => registrarRecibo(draft, sistema, { facturaId: fac.id, monto: fac.total, medioPago: "Transferencia bancaria", cajaBancoId: "cb-003" }));
    if (hasta === "parcial") at(fechaRecibo || addDays(fechaCot, 10), () => registrarRecibo(draft, sistema, { facturaId: fac.id, monto: montoParcial, medioPago: "Transferencia bancaria", cajaBancoId: "cb-003" }));
    return { cot, ped, rem, fac };
  }

  function flujoCompra({ fechaOC, proveedorId, sedeId, bodegaId, items, hasta, montoParcial, fechaPago }) {
    let oc, rcp, fc;
    at(fechaOC, () => { oc = crearOrdenCompra(draft, sistema, { proveedorId, sedeId, bodegaId, items }); });
    if (hasta === "oc") return { oc };
    at(addDays(fechaOC, 3), () => { rcp = recibirOrdenCompra(draft, sistema, oc.id, items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }))); });
    if (hasta === "recepcion") return { oc, rcp };
    at(addDays(fechaOC, 3), () => { fc = generarFacturaCompra(draft, sistema, rcp.id); });
    if (hasta === "pagada") at(fechaPago || addDays(fechaOC, 12), () => pagarFacturaCompra(draft, sistema, { facturaCompraId: fc.id, monto: fc.total, cajaBancoId: "cb-003" }));
    if (hasta === "parcial") at(fechaPago || addDays(fechaOC, 15), () => pagarFacturaCompra(draft, sistema, { facturaCompraId: fc.id, monto: montoParcial, cajaBancoId: "cb-003" }));
    return { oc, rcp, fc };
  }

  // --- Apertura contable ---
  at("2026-01-05T09:00:00-05:00", () => {
    crearComprobante(draft, {
      tipo: "Apertura", fecha: todayISO(), origen: { tipo: "apertura" }, glosa: "Saldos iniciales de apertura del ejercicio 2026",
      lineas: [
        { cuenta: "1105", nombre: cuenta("1105").nombre, tercero: "-", debito: 2470000, credito: 0 },
        { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "-", debito: 50750000, credito: 0 },
        { cuenta: "1435", nombre: cuenta("1435").nombre, tercero: "-", debito: 32000000, credito: 0 },
        { cuenta: "3115", nombre: cuenta("3115").nombre, tercero: "-", debito: 0, credito: 85220000 },
      ],
    });
    pushAudit(draft, sistema, "Carga de datos de demostracion", "Saldos de apertura de Grupo Horizonte S.A.S.");
  });

  // --- Compras (reponen inventario a lo largo del semestre) ---
  flujoCompra({ fechaOC: "2026-02-10T10:00:00-05:00", proveedorId: "p-001", sedeId: "sede-bog", bodegaId: "bod-bog", items: [CU("prod-001", 100, 40500), CU("prod-002", 250, 7000)], hasta: "pagada" });
  flujoCompra({ fechaOC: "2026-03-15T10:00:00-05:00", proveedorId: "p-002", sedeId: "sede-bog", bodegaId: "bod-bog", items: [CU("prod-003", 60, 11500), CU("prod-004", 10, 96000)], hasta: "pagada" });
  flujoCompra({ fechaOC: "2026-05-20T10:00:00-05:00", proveedorId: "p-003", sedeId: "sede-med", bodegaId: "bod-med", items: [CU("prod-007", 20, 38000), CU("prod-008", 10, 22000)], hasta: "parcial", montoParcial: 900000 });
  flujoCompra({ fechaOC: "2026-06-25T10:00:00-05:00", proveedorId: "p-004", sedeId: "sede-bog", bodegaId: "bod-bog", items: [CU("prod-004", 8, 97500)], hasta: "pendiente" });
  flujoCompra({ fechaOC: "2026-07-18T10:00:00-05:00", proveedorId: "p-001", sedeId: "sede-med", bodegaId: "bod-med", items: [CU("prod-002", 120, 7100)], hasta: "recepcion" });

  // --- Ventas (historial variado: pagadas, parciales, vencidas, anulada, en curso) ---
  flujoVenta({ fechaCot: "2026-02-03T09:15:00-05:00", terceroId: "t-001", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-001", 60), P("prod-002", 160)], hasta: "pagada", fechaRecibo: "2026-02-21T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-03-10T09:15:00-05:00", terceroId: "t-002", sedeId: "sede-med", bodegaId: "bod-med", items: [P("prod-005", 500), P("prod-006", 10)], hasta: "pagada", fechaRecibo: "2026-03-29T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-04-02T09:15:00-05:00", terceroId: "t-004", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-003", 80), P("prod-004", 4)], hasta: "parcial", montoParcial: 800000, fechaRecibo: "2026-04-25T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-05-05T09:15:00-05:00", terceroId: "t-005", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-001", 15), P("prod-007", 10)], hasta: "parcial", montoParcial: 500000, fechaRecibo: "2026-05-28T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-03-25T09:15:00-05:00", terceroId: "t-007", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-002", 260), P("prod-005", 900)], hasta: "pendiente" });
  flujoVenta({ fechaCot: "2026-06-01T09:15:00-05:00", terceroId: "t-003", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-008", 2)], hasta: "pendiente" });
  flujoVenta({ fechaCot: "2026-07-20T09:15:00-05:00", terceroId: "t-006", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-002", 10)], hasta: "pagada", fechaRecibo: "2026-07-20T15:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-07-10T09:15:00-05:00", terceroId: "t-008", sedeId: "sede-med", bodegaId: "bod-med", items: [P("prod-009", 1), P("prod-010", 2)], hasta: "pendiente" });
  flujoVenta({ fechaCot: "2026-06-15T09:15:00-05:00", terceroId: "t-004", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-004", 2)], hasta: "pendiente", anular: true, motivoAnulacion: "Producto facturado por error; el cliente solicito la cancelacion del documento." });
  // Documentos en curso, listos para que el usuario continue el flujo manualmente:
  flujoVenta({ fechaCot: "2026-07-28T14:00:00-05:00", terceroId: "t-001", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-001", 10), P("prod-006", 5)], hasta: "cotizacion" });
  flujoVenta({ fechaCot: "2026-07-25T14:00:00-05:00", terceroId: "t-002", sedeId: "sede-med", bodegaId: "bod-med", items: [P("prod-005", 150)], hasta: "pedido" });
  flujoVenta({ fechaCot: "2026-07-22T14:00:00-05:00", terceroId: "t-005", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-002", 30), P("prod-003", 20)], hasta: "remision" });

  // --- Gastos operativos mensuales (comprobantes manuales, partida doble) ---
  const mesesGasto = ["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31"];
  mesesGasto.forEach((f, idx) => {
    at(`${f}T17:00:00-05:00`, () => {
      crearComprobanteManual(draft, sistema, {
        tipo: "Comprobante de egreso", fecha: todayISO(), glosa: `Pago arrendamiento oficina Bogota - ${f.slice(0, 7)}`,
        lineas: [{ cuenta: "5120", nombre: cuenta("5120").nombre, tercero: "Arrendador Edificio Centro", debito: 1600000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Arrendador Edificio Centro", debito: 0, credito: 1600000 }],
      });
      crearComprobanteManual(draft, sistema, {
        tipo: "Comprobante de egreso", fecha: todayISO(), glosa: `Servicios publicos - ${f.slice(0, 7)}`,
        lineas: [{ cuenta: "5135", nombre: cuenta("5135").nombre, tercero: "Empresa de energia y acueducto", debito: 380000 + idx * 8000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Empresa de energia y acueducto", debito: 0, credito: 380000 + idx * 8000 }],
      });
      crearComprobanteManual(draft, sistema, {
        tipo: "Comprobante de egreso", fecha: todayISO(), glosa: `Gastos administrativos y de personal - ${f.slice(0, 7)} (parcial, calculo simplificado)`,
        lineas: [{ cuenta: "5105", nombre: cuenta("5105").nombre, tercero: "Nomina general", debito: 2400000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Nomina general", debito: 0, credito: 2400000 }],
      });
      const cb = draft.cajasBancos.find((c) => c.id === "cb-003");
      if (cb) cb.saldo -= 1600000 + (380000 + idx * 8000) + 2400000;
    });
  });
  at("2026-04-10T10:00:00-05:00", () => {
    crearComprobanteManual(draft, sistema, {
      tipo: "Comprobante de egreso", fecha: todayISO(), glosa: "Honorarios revisoria fiscal - primer trimestre",
      lineas: [{ cuenta: "5110", nombre: cuenta("5110").nombre, tercero: "Estudio Contable Asociados", debito: 1200000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Estudio Contable Asociados", debito: 0, credito: 1200000 }],
    });
    const cb = draft.cajasBancos.find((c) => c.id === "cb-003"); if (cb) cb.saldo -= 1200000;
  });

  // --- Ajustes y transferencias de inventario ---
  at("2026-04-18T16:00:00-05:00", () => { ajusteInventario(draft, sistema, { productoId: "prod-002", bodegaId: "bod-bog", cantidad: 6, tipo: "salida", motivo: "Productos danados en bodega durante traslado interno" }); });
  at("2026-05-02T16:00:00-05:00", () => { transferenciaInventario(draft, sistema, { productoId: "prod-006", origenBodegaId: "bod-bog", destinoBodegaId: "bod-med", cantidad: 15 }); });

  // --- Simulacion de respuestas DIAN (sandbox, no real) sobre algunas facturas ya emitidas ---
  draft.facturas.slice(-6).forEach((f) => { simularRespuestaDian(draft, sistema, f.id); });

  return draft;
}

const SEED = buildSeed();

/* ============================================================================
   REDUCER — cada accion clona el estado (structuredClone) y delega en el
   motor de reglas de negocio. Simplifica enormemente el manejo inmutable de
   un modelo de datos tan interrelacionado (ventas <-> inventario <-> cartera
   <-> contabilidad) sin sacrificar previsibilidad de React.
   ============================================================================ */

function reducer(state, action) {
  const { type, payload, actor } = action;
  const draft = structuredClone(state.data);
  let result;
  switch (type) {
    case "CREAR_COTIZACION": result = crearCotizacion(draft, actor, payload); break;
    case "APROBAR_COTIZACION": result = aprobarCotizacion(draft, actor, payload.id); break;
    case "CONVERTIR_PEDIDO": result = convertirPedido(draft, actor, payload.id); break;
    case "GENERAR_REMISION": result = generarRemision(draft, actor, payload.pedidoId, payload.bodegaId); break;
    case "GENERAR_FACTURA": result = generarFactura(draft, actor, payload.remisionId); break;
    case "REGISTRAR_RECIBO": result = registrarRecibo(draft, actor, payload); break;
    case "ANULAR_FACTURA": result = anularFactura(draft, actor, payload.id, payload.motivo); break;
    case "CREAR_OC": result = crearOrdenCompra(draft, actor, payload); break;
    case "RECIBIR_OC": result = recibirOrdenCompra(draft, actor, payload.ocId, payload.items); break;
    case "GENERAR_FACTURA_COMPRA": result = generarFacturaCompra(draft, actor, payload.recepcionId); break;
    case "PAGAR_FACTURA_COMPRA": result = pagarFacturaCompra(draft, actor, payload); break;
    case "CREAR_TERCERO": result = crearTercero(draft, actor, payload); break;
    case "CREAR_PRODUCTO": result = crearProducto(draft, actor, payload); break;
    case "AJUSTE_INVENTARIO": result = ajusteInventario(draft, actor, payload); break;
    case "TRANSFERENCIA_INVENTARIO": result = transferenciaInventario(draft, actor, payload); break;
    case "COMPROBANTE_MANUAL": result = crearComprobanteManual(draft, actor, payload); break;
    case "MOVIMIENTO_TESORERIA": result = registrarMovimientoTesoreriaManual(draft, actor, payload); break;
    case "TRANSFERENCIA_TESORERIA": result = transferenciaTesoreria(draft, actor, payload); break;
    case "SIMULAR_DIAN": result = simularRespuestaDian(draft, actor, payload.id); break;
    case "RESET_DEMO": return { data: buildSeed(), lastResult: { ok: true } };
    default: return state;
  }
  if (result && result.error) return { data: state.data, lastResult: { ok: false, error: result.error, ts: Date.now() } };
  return { data: draft, lastResult: { ok: true, ts: Date.now() } };
}

/* ============================================================================
  SISTEMA DE DISENO — tokens propios de Lunaris
   Paleta: fondo neutro + navy de marca "#1E2A4A" (barra lateral fija en ambos
   modos, actua como columna vertebral de navegacion) + acento dorado
   "#C9A227" usado con moderacion (cifras clave, estado activo). Tipografia:
   Space Grotesk (titulos), Inter (interfaz), JetBrains Mono (cifras y
   consecutivos, para reforzar la lectura tipo "libro contable").
   ============================================================================ */

const BRAND = { navyDark: "#141C33", navy: "#1E2A4A", navySoft: "#2A3B63", gold: "#C9A227", goldSoft: "#E7C766" };

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
.nx-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
.nx-display { font-family: 'Space Grotesk', 'Inter', sans-serif; letter-spacing: -0.01em; }
.nx-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.nx-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.nx-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.4); border-radius: 8px; }
.nx-scroll::-webkit-scrollbar-track { background: transparent; }
@keyframes nx-fade { from { opacity: 0; transform: translateY(4px);} to { opacity:1; transform:translateY(0);} }
.nx-fade { animation: nx-fade 0.18s ease-out; }
@media print {
  .nx-noprint { display: none !important; }
  .nx-print-area { position: absolute; inset: 0; }
}
`;

function themeOf(dark) {
  return {
    dark,
    bg: dark ? "bg-slate-950" : "bg-slate-50",
    surface: dark ? "bg-slate-900" : "bg-white",
    surfaceAlt: dark ? "bg-slate-800" : "bg-slate-100",
    border: dark ? "border-slate-700" : "border-slate-200",
    text: dark ? "text-slate-100" : "text-slate-900",
    textMuted: dark ? "text-slate-400" : "text-slate-500",
    textFaint: dark ? "text-slate-500" : "text-slate-400",
    hover: dark ? "hover:bg-slate-800" : "hover:bg-slate-100",
    input: dark ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    ring: dark ? "focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500" : "focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500",
  };
}
const cx = (...xs) => xs.filter(Boolean).join(" ");

/* ---------- Estados semanticos ---------- */
const ESTADOS = {
  borrador: { label: "Borrador", cls: "bg-slate-200 text-slate-600" },
  aprobada: { label: "Aprobada", cls: "bg-blue-100 text-blue-700" },
  convertida: { label: "Convertida", cls: "bg-slate-200 text-slate-600" },
  pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  remisionado: { label: "Remisionado", cls: "bg-blue-100 text-blue-700" },
  entregada: { label: "Entregada", cls: "bg-blue-100 text-blue-700" },
  pagada: { label: "Pagada", cls: "bg-emerald-100 text-emerald-700" },
  parcial: { label: "Pago parcial", cls: "bg-amber-100 text-amber-700" },
  vencida: { label: "Vencida", cls: "bg-red-100 text-red-700" },
  anulada: { label: "Anulada", cls: "bg-slate-200 text-slate-500 line-through decoration-1" },
  recibida: { label: "Recibida", cls: "bg-emerald-100 text-emerald-700" },
  recibida_parcial: { label: "Recibida parcial", cls: "bg-amber-100 text-amber-700" },
  borrador_dian: { label: "Borrador", cls: "bg-slate-200 text-slate-600" },
  en_validacion: { label: "En validacion", cls: "bg-blue-100 text-blue-700" },
  aceptado: { label: "Aceptado DIAN", cls: "bg-emerald-100 text-emerald-700" },
  rechazado: { label: "Rechazado DIAN", cls: "bg-red-100 text-red-700" },
  contingencia: { label: "Contingencia", cls: "bg-amber-100 text-amber-700" },
  anulado: { label: "Anulado", cls: "bg-slate-200 text-slate-500" },
};
function facturaEstadoVisual(fac) {
  if (fac.estado === "anulada") return "anulada";
  if (fac.estado === "pagada") return "pagada";
  if (fac.saldo < fac.total && fac.saldo > 0) return new Date(fac.vencimiento) < new Date() ? "parcial" : "parcial";
  if (new Date(fac.vencimiento) < new Date() && fac.estado !== "pagada") return "vencida";
  return "pendiente";
}
function Badge({ estado, children }) {
  const info = ESTADOS[estado] || { label: estado, cls: "bg-slate-200 text-slate-600" };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", info.cls)}>{children || info.label}</span>;
}

/* ============================================================================
   PRIMITIVAS DE INTERFAZ REUTILIZABLES
   ============================================================================ */

function exportExcel(filename, rows) {
  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  } catch (e) { console.error("Error exportando a Excel", e); }
}

function Btn({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled, type = "button", title, theme }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-4 py-2.5 text-sm" };
  const variants = {
    primary: "text-white shadow-sm hover:opacity-90",
    secondary: theme?.dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300",
    ghost: theme?.dark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    subtle: theme?.dark ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-amber-50 text-amber-700 hover:bg-amber-100",
  };
  const style = variant === "primary" ? { backgroundColor: BRAND.navy } : undefined;
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} style={style} className={cx(base, sizes[size], variants[variant])}>
      {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2.25} />}
      {children}
    </button>
  );
}

function IconBtn({ icon: Icon, onClick, theme, title, active }) {
  return (
    <button title={title} onClick={onClick} className={cx("h-9 w-9 grid place-items-center rounded-lg transition-colors", active ? "bg-amber-500/15 text-amber-500" : theme.dark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
      <Icon size={18} strokeWidth={2} />
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, tone = "default", theme, onClick }) {
  const tones = {
    default: theme.dark ? "text-slate-100" : "text-slate-900",
    good: "text-emerald-500", warn: "text-amber-500", bad: "text-red-500",
  };
  return (
    <div onClick={onClick} className={cx("rounded-xl border p-4 flex flex-col gap-2", theme.surface, theme.border, onClick && "cursor-pointer hover:shadow-md transition-shadow")}>
      <div className="flex items-center justify-between">
        <span className={cx("text-xs font-semibold uppercase tracking-wide", theme.textMuted)}>{label}</span>
        {Icon && <Icon size={16} className={theme.textFaint} />}
      </div>
      <div className={cx("nx-mono text-2xl font-bold", tones[tone])}>{value}</div>
      {sub && <div className={cx("text-xs", theme.textMuted)}>{sub}</div>}
    </div>
  );
}

function Panel({ title, actions, children, theme, className, subtitle }) {
  return (
    <div className={cx("rounded-xl border", theme.surface, theme.border, className)}>
      {title && (
        <div className={cx("flex items-center justify-between px-4 py-3 border-b", theme.border)}>
          <div>
            <h3 className={cx("text-sm font-bold nx-display", theme.text)}>{title}</h3>
            {subtitle && <p className={cx("text-xs mt-0.5", theme.textMuted)}>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, title, hint, action, theme }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className={cx("h-12 w-12 rounded-full grid place-items-center mb-3", theme.surfaceAlt)}><Icon size={22} className={theme.textFaint} /></div>
      <p className={cx("font-semibold text-sm", theme.text)}>{title}</p>
      {hint && <p className={cx("text-xs mt-1 max-w-sm", theme.textMuted)}>{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Field({ label, children, hint, required, theme, error, className }) {
  return (
    <label className={cx("flex flex-col gap-1.5 text-sm", className)}>
      {label && <span className={cx("text-xs font-semibold", theme.textMuted)}>{label}{required && <span className="text-red-500"> *</span>}</span>}
      {children}
      {hint && !error && <span className={cx("text-xs", theme.textFaint)}>{hint}</span>}
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </label>
  );
}
function inputCls(theme) { return cx("w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors", theme.input, theme.ring); }

function Modal({ open, onClose, title, children, theme, width = "max-w-lg", footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/50" onClick={onClose} />
      <div className={cx("relative w-full rounded-xl border shadow-2xl nx-fade my-8", width, theme.surface, theme.border)}>
        <div className={cx("flex items-center justify-between px-5 py-4 border-b", theme.border)}>
          <h3 className={cx("font-bold nx-display", theme.text)}>{title}</h3>
          <button onClick={onClose} className={cx("h-8 w-8 grid place-items-center rounded-lg", theme.hover)}><X size={16} className={theme.textMuted} /></button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto nx-scroll">{children}</div>
        {footer && <div className={cx("flex items-center justify-end gap-2 px-5 py-4 border-t", theme.border)}>{footer}</div>}
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const ok = toast.ok;
  return (
    <div className="fixed bottom-5 right-5 z-[100] nx-fade">
      <div className={cx("flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-xl max-w-sm", ok ? "bg-emerald-600 border-emerald-700" : "bg-red-600 border-red-700")}>
        {ok ? <CheckCircle2 size={18} className="text-white mt-0.5 shrink-0" /> : <AlertOctagon size={18} className="text-white mt-0.5 shrink-0" />}
        <p className="text-sm text-white font-medium">{toast.message}</p>
        <button onClick={onClose} className="ml-auto text-white/80 hover:text-white"><X size={15} /></button>
      </div>
    </div>
  );
}

/* DataTable: busqueda + orden + filtros + paginacion + exportacion + seleccion */
function DataTable({ columns, rows, theme, searchKeys = [], filters = [], pageSize = 8, exportName, rowActions, onRowClick, emptyTitle = "Sin resultados", emptyHint, selectable, selected, onSelectChange }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(null);
  const [filterValues, setFilterValues] = useState({});
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const needle = q.toLowerCase();
      r = r.filter((row) => searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(needle)));
    }
    for (const f of filters) {
      const val = filterValues[f.key];
      if (val && val !== "__all__") r = r.filter((row) => String(row[f.key]) === String(val));
    }
    if (sort) {
      r = [...r].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [rows, q, filterValues, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [q, filterValues, rows.length]);

  const toggleSort = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const allChecked = selectable && pageRows.length > 0 && pageRows.every((r) => selected?.has(r.id));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className={cx("flex items-center gap-2 rounded-lg border px-3 py-2 flex-1 min-w-[180px]", theme.input, theme.border)}>
          <Search size={15} className={theme.textFaint} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en esta tabla..." className={cx("bg-transparent outline-none text-sm w-full", theme.dark ? "placeholder-slate-500" : "placeholder-slate-400")} />
        </div>
        {filters.map((f) => (
          <select key={f.key} value={filterValues[f.key] || "__all__"} onChange={(e) => setFilterValues((v) => ({ ...v, [f.key]: e.target.value }))} className={cx("rounded-lg border px-2.5 py-2 text-sm outline-none", theme.input)}>
            <option value="__all__">{f.label}: todos</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {exportName && <Btn theme={theme} variant="secondary" icon={FileSpreadsheet} size="sm" onClick={() => exportExcel(exportName, filtered)}>Exportar Excel</Btn>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState theme={theme} title={emptyTitle} hint={emptyHint} />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className={cx("text-left border-b", theme.border)}>
                {selectable && (
                  <th className="px-2 py-2 w-8">
                    <input type="checkbox" checked={allChecked} onChange={(e) => { const next = new Set(selected); pageRows.forEach((r) => (e.target.checked ? next.add(r.id) : next.delete(r.id))); onSelectChange?.(next); }} />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={c.key} onClick={() => c.sortable && toggleSort(c.key)} className={cx("px-3 py-2 font-semibold text-xs uppercase tracking-wide whitespace-nowrap", theme.textMuted, c.sortable && "cursor-pointer select-none")}>
                    <span className="inline-flex items-center gap-1">{c.label}{sort?.key === c.key && <ChevronDown size={12} className={sort.dir === "desc" ? "rotate-180 transition-transform" : "transition-transform"} />}</span>
                  </th>
                ))}
                {rowActions && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} onClick={() => onRowClick?.(row)} className={cx("border-b last:border-0", theme.border, onRowClick && cx("cursor-pointer", theme.hover))}>
                  {selectable && (
                    <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={!!selected?.has(row.id)} onChange={(e) => { const next = new Set(selected); e.target.checked ? next.add(row.id) : next.delete(row.id); onSelectChange?.(next); }} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cx("px-3 py-2.5 align-middle", theme.text, c.className)}>{c.render ? c.render(row) : row[c.key]}</td>
                  ))}
                  {rowActions && <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>{rowActions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className={theme.textMuted}>{filtered.length} registros · pagina {page} de {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={cx("h-7 w-7 grid place-items-center rounded-md border disabled:opacity-30", theme.border, theme.hover)}><ChevronLeft size={14} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={cx("h-7 w-7 grid place-items-center rounded-md border disabled:opacity-30", theme.border, theme.hover)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function Breadcrumb({ items, theme }) {
  return (
    <div className={cx("flex items-center gap-1.5 text-xs mb-1", theme.textMuted)}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={12} />}
          <span className={i === items.length - 1 ? cx("font-semibold", theme.text) : ""}>{it}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ============================================================================
   NAVEGACION — estructura de modulos
   ============================================================================ */

const NAV = [
  { group: "General", items: [
    { key: "dashboard", label: "Inicio", icon: LayoutDashboard, estado: "funcional" },
    { key: "terceros", label: "Terceros", icon: Users, estado: "funcional" },
  ]},
  { group: "Comercial", items: [
    { key: "ventas", label: "Ventas y facturacion", icon: Receipt, estado: "funcional" },
    { key: "pos", label: "Punto de venta (POS)", icon: Store, estado: "simulado" },
    { key: "cartera", label: "Cartera (CxC)", icon: Wallet2, estado: "funcional" },
  ]},
  { group: "Cadena de suministro", items: [
    { key: "compras", label: "Compras", icon: ShoppingCart, estado: "funcional" },
    { key: "inventario", label: "Inventario y bodegas", icon: Boxes, estado: "funcional" },
  ]},
  { group: "Finanzas", items: [
    { key: "tesoreria", label: "Tesoreria y bancos", icon: Landmark, estado: "funcional" },
    { key: "contabilidad", label: "Contabilidad", icon: Calculator, estado: "funcional" },
    { key: "impuestos", label: "Impuestos y DIAN", icon: BadgeCheck, estado: "simulado" },
  ]},
  { group: "Personas", items: [
    { key: "nomina", label: "Nomina y talento humano", icon: UserCog, estado: "parcial" },
  ]},
  { group: "Analisis", items: [
    { key: "reportes", label: "Reportes", icon: FileBarChart, estado: "funcional" },
    { key: "auditoria", label: "Auditoria", icon: History, estado: "funcional" },
  ]},
  { group: "Sistema", items: [
    { key: "movil", label: "Vista movil / PWA", icon: Smartphone, estado: "funcional" },
    { key: "integraciones", label: "Integraciones", icon: Puzzle, estado: "pendiente" },
    { key: "configuracion", label: "Configuracion", icon: Settings, estado: "funcional" },
  ]},
];
const MODULE_LABEL = Object.fromEntries(NAV.flatMap((g) => g.items).map((i) => [i.key, i.label]));
const ESTADO_MODULO_BADGE = {
  funcional: { label: "Operativo", cls: "bg-emerald-500/15 text-emerald-400" },
  simulado: { label: "Simulado", cls: "bg-amber-500/15 text-amber-400" },
  parcial: { label: "Parcial", cls: "bg-blue-500/15 text-blue-400" },
  pendiente: { label: "Por integrar", cls: "bg-slate-500/20 text-slate-400" },
};

function Sidebar({ current, setCurrent, collapsed, setCollapsed, role, mobileOpen, setMobileOpen }) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside
        style={{ background: `linear-gradient(180deg, ${BRAND.navyDark}, ${BRAND.navy})` }}
        className={cx(
          "fixed lg:sticky top-0 z-50 lg:z-0 h-screen flex flex-col shrink-0 transition-all duration-200 nx-scroll overflow-y-auto",
          collapsed ? "w-[76px]" : "w-[248px]",
          mobileOpen ? "left-0" : "-left-full lg:left-0"
        )}
      >
        <div className="flex items-center gap-1.5 px-4 h-16 shrink-0 border-b border-white/10">
          <div className="h-9 w-9 rounded-xl shrink-0 bg-white overflow-hidden grid place-items-center">
            <img src={appleTouchIcon} alt="Lunaris" className="h-7 w-7 object-contain" />
          </div>
          {!collapsed && <span className="nx-display font-bold text-white text-[15px] tracking-tight">Lunaris</span>}
        </div>
        <nav className="flex-1 py-3 px-2.5 space-y-4">
          {NAV.map((g) => {
            const visibles = g.items.filter((i) => puedeVer(role, i.key));
            if (visibles.length === 0) return null;
            return (
              <div key={g.group}>
                {!collapsed && <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1.5">{g.group}</p>}
                <div className="space-y-0.5">
                  {visibles.map((item) => {
                    const active = current === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => { setCurrent(item.key); setMobileOpen(false); }}
                        title={collapsed ? item.label : undefined}
                        className={cx(
                          "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors relative",
                          active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {active && <span style={{ backgroundColor: BRAND.gold }} className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" />}
                        <item.icon size={17} strokeWidth={2} className="shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.estado !== "funcional" && (
                          <span className={cx("ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0", ESTADO_MODULO_BADGE[item.estado].cls)}>
                            {item.estado === "simulado" ? "SIM" : item.estado === "parcial" ? "PARC" : "N/D"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function Topbar({ theme, dark, setDark, role, setRole, sede, setSede, setMobileOpen, collapsed, setCollapsed, notifications, onSearch, searchQuery, actor }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  return (
    <header className={cx("h-16 shrink-0 sticky top-0 z-30 flex items-center gap-3 px-4 border-b backdrop-blur", theme.surface, theme.border)}>
      <button onClick={() => setMobileOpen(true)} className={cx("h-9 w-9 grid place-items-center rounded-lg lg:hidden", theme.hover)}><Menu size={18} className={theme.text} /></button>
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expandir menu" : "Contraer menu"}
        className={cx("hidden sm:grid h-9 w-9 place-items-center rounded-lg border", theme.input)}
      >
        <Menu size={18} className={theme.text} />
      </button>
      <div className={cx("hidden sm:flex items-center gap-2 rounded-lg border px-3 py-2 w-full max-w-sm", theme.input)}>
        <Search size={15} className={theme.textFaint} />
        <input value={searchQuery} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar clientes, facturas, productos..." className="bg-transparent outline-none text-sm w-full" />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <select value={sede} onChange={(e) => setSede(e.target.value)} className={cx("hidden md:block rounded-lg border px-2.5 py-2 text-xs font-semibold outline-none", theme.input)}>
          {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <IconBtn theme={theme} icon={dark ? Sun : Moon} onClick={() => setDark((d) => !d)} title="Cambiar tema" />
        <div className="relative">
          <IconBtn theme={theme} icon={Bell} onClick={() => { setShowNotif((s) => !s); setShowProfile(false); }} title="Notificaciones" active={showNotif} />
          {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
          {showNotif && (
            <div className={cx("absolute right-0 mt-2 w-80 rounded-xl border shadow-2xl nx-fade overflow-hidden", theme.surface, theme.border)}>
              <div className={cx("px-4 py-3 border-b font-bold text-sm nx-display", theme.border, theme.text)}>Alertas accionables</div>
              <div className="max-h-80 overflow-y-auto nx-scroll">
                {notifications.length === 0 ? <p className={cx("text-sm px-4 py-6 text-center", theme.textMuted)}>Sin alertas pendientes.</p> :
                  notifications.map((n, i) => (
                    <div key={i} className={cx("px-4 py-2.5 border-b last:border-0 text-xs flex gap-2", theme.border)}>
                      <AlertTriangle size={14} className={cx("mt-0.5 shrink-0", n.tone === "bad" ? "text-red-500" : "text-amber-500")} />
                      <div><p className={cx("font-medium", theme.text)}>{n.title}</p><p className={theme.textMuted}>{n.detail}</p></div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <IconBtn theme={theme} icon={HelpCircle} title="Ayuda y estado de modulos" onClick={() => { setShowNotif(false); }} />
        <div className="relative">
          <button onClick={() => { setShowProfile((s) => !s); setShowNotif(false); }} className={cx("flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg", theme.hover)}>
            <div style={{ backgroundColor: BRAND.navy }} className="h-7 w-7 rounded-full grid place-items-center text-white text-xs font-bold shrink-0">{actor.usuario.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
            <div className="hidden md:block text-left leading-tight">
              <p className={cx("text-xs font-semibold", theme.text)}>{actor.usuario}</p>
              <p className={cx("text-[11px]", theme.textMuted)}>{ROLES.find((r) => r.id === role)?.nombre}</p>
            </div>
            <ChevronsUpDown size={13} className={theme.textFaint} />
          </button>
          {showProfile && (
            <div className={cx("absolute right-0 mt-2 w-72 rounded-xl border shadow-2xl nx-fade overflow-hidden", theme.surface, theme.border)}>
              <div className={cx("px-4 py-3 border-b", theme.border)}>
                <p className={cx("text-xs font-semibold", theme.textMuted)}>Simular sesion con rol</p>
              </div>
              <div className="max-h-72 overflow-y-auto nx-scroll">
                {ROLES.map((r) => (
                  <button key={r.id} onClick={() => { setRole(r.id); setShowProfile(false); }} className={cx("w-full text-left px-4 py-2 text-xs flex items-start gap-2", role === r.id ? "bg-amber-500/10" : theme.hover)}>
                    <div className="mt-0.5">{role === r.id ? <CheckCircle2 size={13} className="text-amber-500" /> : <span className="block h-3 w-3 rounded-full border border-current opacity-30" />}</div>
                    <div><p className={cx("font-semibold", theme.text)}>{r.nombre}</p><p className={theme.textMuted}>{r.desc}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
   CALCULOS DERIVADOS (dashboard, alertas, contabilidad)
   ============================================================================ */

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const monthKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const sameDay = (iso, ref) => { const d = new Date(iso); return d.toDateString() === ref.toDateString(); };
const CLIENTES = (data) => data.terceros.filter((t) => t.tipo === "cliente");
const PROVEEDORES = (data) => data.terceros.filter((t) => t.tipo === "proveedor");

function computeKPIs(data) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const facturasVivas = data.facturas.filter((f) => f.estado !== "anulada");

  const sumFacturas = (pred) => facturasVivas.filter(pred).reduce((s, f) => s + f.total, 0);
  const ventasDia = sumFacturas((f) => sameDay(f.fecha, now));
  const ventasSemana = sumFacturas((f) => new Date(f.fecha) >= weekAgo);
  const ventasMes = sumFacturas((f) => new Date(f.fecha) >= monthStart);
  const ventasAnio = sumFacturas((f) => new Date(f.fecha) >= yearStart);

  const facPendiente = data.facturas.filter((f) => f.estado === "pendiente" && new Date(f.vencimiento) >= now).reduce((s, f) => s + f.saldo, 0);
  const facPagada = data.facturas.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0);
  const facVencida = data.facturas.filter((f) => f.estado !== "anulada" && f.estado !== "pagada" && new Date(f.vencimiento) < now).reduce((s, f) => s + f.saldo, 0);
  const facAnulada = data.facturas.filter((f) => f.estado === "anulada").reduce((s, f) => s + f.total, 0);

  const ingresos30 = data.movimientosTesoreria.filter((m) => m.tipo === "ingreso" && new Date(m.fecha) >= new Date(now - 30 * 86400000)).reduce((s, m) => s + m.monto, 0);
  const egresos30 = data.movimientosTesoreria.filter((m) => m.tipo === "egreso" && new Date(m.fecha) >= new Date(now - 30 * 86400000)).reduce((s, m) => s + m.monto, 0);

  const cxc = CLIENTES(data).reduce((s, t) => s + (t.saldoCartera || 0), 0);
  const cxp = PROVEEDORES(data).reduce((s, t) => s + (t.saldoCxP || 0), 0);
  const saldoBancos = data.cajasBancos.filter((c) => c.tipo === "banco").reduce((s, c) => s + c.saldo, 0);
  const saldoCaja = data.cajasBancos.filter((c) => c.tipo === "caja").reduce((s, c) => s + c.saldo, 0);

  const inventarioValorizado = data.productos.reduce((s, p) => s + Object.values(p.stock || {}).reduce((a, b) => a + b, 0) * (p.costoPromedio || 0), 0);
  const productosBajoMinimo = data.productos.filter((p) => p.minimo > 0 && Object.values(p.stock || {}).reduce((a, b) => a + b, 0) <= p.minimo);

  const ingresosTotal = data.comprobantes.filter((c) => c.tipo === "Factura de venta").reduce((s, c) => s + c.lineas.filter((l) => ["4135", "4140"].includes(l.cuenta)).reduce((a, l) => a + l.credito, 0), 0);
  const costoTotal = data.comprobantes.filter((c) => c.tipo === "Costo de venta").reduce((s, c) => s + c.lineas.filter((l) => l.cuenta === "6135").reduce((a, l) => a + l.debito, 0), 0);
  const margenBruto = ingresosTotal > 0 ? ((ingresosTotal - costoTotal) / ingresosTotal) * 100 : 0;

  const gastosPorCategoria = {};
  data.comprobantes.forEach((c) => c.lineas.forEach((l) => {
    const cta = cuenta(l.cuenta);
    if (cta?.clase === "Gasto" && l.debito) gastosPorCategoria[cta.nombre] = (gastosPorCategoria[cta.nombre] || 0) + l.debito;
  }));

  const ventasPorMes = {};
  facturasVivas.forEach((f) => { const k = monthKey(f.fecha); ventasPorMes[k] = (ventasPorMes[k] || 0) + f.total; });
  const flujoPorMes = {};
  data.movimientosTesoreria.forEach((m) => { const k = monthKey(m.fecha); flujoPorMes[k] = flujoPorMes[k] || { ingresos: 0, egresos: 0 }; flujoPorMes[k][m.tipo === "ingreso" ? "ingresos" : "egresos"] += m.monto; });

  return { ventasDia, ventasSemana, ventasMes, ventasAnio, facPendiente, facPagada, facVencida, facAnulada, ingresos30, egresos30, flujoCaja30: ingresos30 - egresos30, cxc, cxp, saldoBancos, saldoCaja, inventarioValorizado, productosBajoMinimo, margenBruto, gastosPorCategoria, ventasPorMes, flujoPorMes };
}

function computeAlerts(data) {
  const now = new Date();
  const alerts = [];
  const vencidas = data.facturas.filter((f) => f.estado !== "anulada" && f.estado !== "pagada" && new Date(f.vencimiento) < now);
  if (vencidas.length) alerts.push({ tone: "bad", title: `${vencidas.length} factura(s) vencida(s)`, detail: `Cartera vencida por ${fmtCOP(vencidas.reduce((s, f) => s + f.saldo, 0))}.` });
  const porVencer = data.facturas.filter((f) => f.estado === "pendiente" && daysBetween(now.toISOString(), f.vencimiento) >= 0 && daysBetween(now.toISOString(), f.vencimiento) <= 7);
  if (porVencer.length) alerts.push({ tone: "warn", title: `${porVencer.length} factura(s) por vencer en 7 dias`, detail: "Revisa el modulo de Cartera para priorizar el cobro." });
  const bajoMinimo = data.productos.filter((p) => p.minimo > 0 && Object.values(p.stock || {}).reduce((a, b) => a + b, 0) <= p.minimo);
  if (bajoMinimo.length) alerts.push({ tone: "warn", title: `${bajoMinimo.length} producto(s) bajo el minimo`, detail: bajoMinimo.slice(0, 3).map((p) => p.nombre).join(", ") });
  const rechazadas = data.facturas.filter((f) => f.estadoDian === "rechazado");
  if (rechazadas.length) alerts.push({ tone: "bad", title: `${rechazadas.length} documento(s) rechazado(s) por DIAN (sandbox)`, detail: "Revisa el panel de Impuestos y DIAN para corregir y reenviar." });
  const cxpVencido = data.terceros.filter((t) => t.tipo === "proveedor" && (t.saldoCxP || 0) > 0);
  const facCxpVencidas = data.facturasCompra.filter((f) => f.estado !== "pagada" && new Date(f.vencimiento) < now);
  if (facCxpVencidas.length) alerts.push({ tone: "warn", title: `${facCxpVencidas.length} cuenta(s) por pagar vencida(s)`, detail: `Total ${fmtCOP(facCxpVencidas.reduce((s, f) => s + f.saldo, 0))} con proveedores.` });
  return alerts;
}

/* Reportes contables derivados de los comprobantes (partida doble real) */
function computeBalancePrueba(data) {
  const porCuenta = {};
  data.comprobantes.forEach((c) => c.lineas.forEach((l) => {
    porCuenta[l.cuenta] = porCuenta[l.cuenta] || { debito: 0, credito: 0 };
    porCuenta[l.cuenta].debito += l.debito || 0;
    porCuenta[l.cuenta].credito += l.credito || 0;
  }));
  return PLAN_CUENTAS.filter((c, i, arr) => arr.findIndex((x) => x.codigo === c.codigo) === i).map((c) => {
    const mov = porCuenta[c.codigo] || { debito: 0, credito: 0 };
    const saldo = c.naturaleza === "Debito" ? mov.debito - mov.credito : mov.credito - mov.debito;
    return { ...c, debito: mov.debito, credito: mov.credito, saldo };
  }).filter((c) => c.debito || c.credito);
}
function computeEstadoResultados(data) {
  const bp = computeBalancePrueba(data);
  const ingresos = bp.filter((c) => c.clase === "Ingreso").reduce((s, c) => s + c.saldo, 0);
  const costos = bp.filter((c) => c.clase === "Costo").reduce((s, c) => s + c.saldo, 0);
  const gastos = bp.filter((c) => c.clase === "Gasto").reduce((s, c) => s + c.saldo, 0);
  const gastosDetalle = bp.filter((c) => c.clase === "Gasto");
  const utilidadBruta = ingresos - costos;
  const utilidadNeta = utilidadBruta - gastos;
  return { ingresos, costos, gastos, gastosDetalle, utilidadBruta, utilidadNeta };
}
function computeBalanceGeneral(data) {
  const bp = computeBalancePrueba(data);
  const { utilidadNeta } = computeEstadoResultados(data);
  const activos = bp.filter((c) => c.clase === "Activo");
  const pasivos = bp.filter((c) => c.clase === "Pasivo");
  const patrimonio = bp.filter((c) => c.clase === "Patrimonio");
  const totalActivos = activos.reduce((s, c) => s + c.saldo, 0);
  const totalPasivos = pasivos.reduce((s, c) => s + c.saldo, 0);
  const totalPatrimonio = patrimonio.reduce((s, c) => s + c.saldo, 0) + utilidadNeta;
  return { activos, pasivos, patrimonio, totalActivos, totalPasivos, totalPatrimonio, utilidadNeta, cuadra: Math.abs(totalActivos - (totalPasivos + totalPatrimonio)) < 10 };
}
function computeCarteraEdades(data, tipo = "cliente") {
  const now = new Date();
  const buckets = { "Al dia": 0, "1-30 dias": 0, "31-60 dias": 0, "61-90 dias": 0, "+90 dias": 0 };
  const source = tipo === "cliente" ? data.facturas : data.facturasCompra;
  source.filter((f) => f.estado !== "anulada" && f.saldo > 0).forEach((f) => {
    const dias = daysBetween(f.vencimiento, now.toISOString());
    if (dias <= 0) buckets["Al dia"] += f.saldo;
    else if (dias <= 30) buckets["1-30 dias"] += f.saldo;
    else if (dias <= 60) buckets["31-60 dias"] += f.saldo;
    else if (dias <= 90) buckets["61-90 dias"] += f.saldo;
    else buckets["+90 dias"] += f.saldo;
  });
  return buckets;
}

/* ============================================================================
   MODULO: DASHBOARD
   ============================================================================ */

const CHART_COLORS = [BRAND.navy, BRAND.gold, "#2A6F97", "#157F5A", "#C0392B", "#6B4FA0", "#B8860B", "#5B7DB1"];

function DashboardPage({ data, theme, goTo, role }) {
  const kpis = useMemo(() => computeKPIs(data), [data]);
  const alerts = useMemo(() => computeAlerts(data), [data]);

  const ventasChart = useMemo(() => Object.entries(kpis.ventasPorMes).sort().map(([k, v]) => ({ mes: MESES[Number(k.split("-")[1]) - 1], ventas: Math.round(v) })), [kpis]);
  const flujoChart = useMemo(() => Object.entries(kpis.flujoPorMes).sort().map(([k, v]) => ({ mes: MESES[Number(k.split("-")[1]) - 1], Ingresos: Math.round(v.ingresos), Egresos: Math.round(v.egresos) })), [kpis]);
  const gastosChart = useMemo(() => Object.entries(kpis.gastosPorCategoria).map(([nombre, valor]) => ({ nombre, valor: Math.round(valor) })).sort((a, b) => b.valor - a.valor), [kpis]);

  const quickActions = [
    { label: "Crear cotizacion", icon: FileText, onClick: () => goTo("ventas"), show: puedeVer(role, "ventas") },
    { label: "Registrar compra", icon: ShoppingCart, onClick: () => goTo("compras"), show: puedeVer(role, "compras") },
    { label: "Recibir pago", icon: Wallet2, onClick: () => goTo("cartera"), show: puedeVer(role, "cartera") },
    { label: "Crear gasto", icon: Calculator, onClick: () => goTo("contabilidad"), show: puedeVer(role, "contabilidad") },
    { label: "Ver inventario", icon: Boxes, onClick: () => goTo("inventario"), show: puedeVer(role, "inventario") },
    { label: "Generar reporte", icon: FileBarChart, onClick: () => goTo("reportes"), show: puedeVer(role, "reportes") },
  ].filter((a) => a.show);

  return (
    <div className="space-y-5">
      <div className={cx("rounded-xl border p-5 flex flex-wrap items-center gap-3 justify-between", theme.surface, theme.border)}>
        <div>
          <h2 className={cx("nx-display text-lg font-bold", theme.text)}>Hola, bienvenido a {EMPRESA.razonSocial}</h2>
          <p className={cx("text-sm mt-0.5", theme.textMuted)}>Panel ejecutivo · {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => <Btn key={a.label} theme={theme} variant="secondary" icon={a.icon} size="sm" onClick={a.onClick}>{a.label}</Btn>)}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard theme={theme} label="Ventas del dia" value={fmtCOP(kpis.ventasDia)} sub={`Semana: ${fmtCOP(kpis.ventasSemana)}`} icon={TrendingUp} />
        <KPICard theme={theme} label="Ventas del mes" value={fmtCOP(kpis.ventasMes)} sub={`Año: ${fmtCOP(kpis.ventasAnio)}`} icon={BarChart3} />
        <KPICard theme={theme} label="Cartera por cobrar" value={fmtCOP(kpis.cxc)} sub={`Vencida: ${fmtCOP(kpis.facVencida)}`} tone={kpis.facVencida > 0 ? "bad" : "default"} icon={Wallet2} onClick={() => goTo("cartera")} />
        <KPICard theme={theme} label="Cuentas por pagar" value={fmtCOP(kpis.cxp)} sub="Proveedores" icon={Landmark} onClick={() => goTo("compras")} />
        <KPICard theme={theme} label="Saldo bancos" value={fmtCOP(kpis.saldoBancos)} sub={`Caja: ${fmtCOP(kpis.saldoCaja)}`} icon={CreditCard} onClick={() => goTo("tesoreria")} />
        <KPICard theme={theme} label="Inventario valorizado" value={fmtCOP(kpis.inventarioValorizado)} sub={`${kpis.productosBajoMinimo.length} bajo minimo`} tone={kpis.productosBajoMinimo.length > 0 ? "warn" : "default"} icon={Boxes} onClick={() => goTo("inventario")} />
        <KPICard theme={theme} label="Margen bruto" value={`${fmtNum(kpis.margenBruto, 1)}%`} sub="Ingresos - costo de venta" icon={PieChartIcon} />
        <KPICard theme={theme} label="Flujo de caja (30 dias)" value={fmtCOP(kpis.flujoCaja30)} sub={`Ingresos ${fmtCOP(kpis.ingresos30)} · Egresos ${fmtCOP(kpis.egresos30)}`} tone={kpis.flujoCaja30 >= 0 ? "good" : "bad"} icon={DollarSign} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel theme={theme} title="Ventas facturadas por mes" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={ventasChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.dark ? "#334155" : "#e2e8f0"} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: theme.dark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: theme.dark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ borderRadius: 8, fontSize: 12, background: theme.dark ? "#0f172a" : "#fff", border: `1px solid ${theme.dark ? "#334155" : "#e2e8f0"}` }} />
              <Bar dataKey="ventas" fill={BRAND.navy} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel theme={theme} title="Gastos por categoria">
          {gastosChart.length === 0 ? <EmptyState theme={theme} title="Sin gastos registrados" /> : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={gastosChart} dataKey="valor" nameKey="nombre" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {gastosChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel theme={theme} title="Flujo de caja mensual" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={flujoChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.dark ? "#334155" : "#e2e8f0"} vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: theme.dark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: theme.dark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Ingresos" stroke="#157F5A" fill="#157F5A" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="Egresos" stroke="#C0392B" fill="#C0392B" fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel theme={theme} title="Alertas accionables">
          {alerts.length === 0 ? <EmptyState theme={theme} icon={CheckCircle2} title="Todo al dia" hint="No hay alertas pendientes por ahora." /> : (
            <div className="space-y-2.5">
              {alerts.map((a, i) => (
                <div key={i} className={cx("flex gap-2.5 p-2.5 rounded-lg", theme.surfaceAlt)}>
                  <AlertTriangle size={16} className={cx("mt-0.5 shrink-0", a.tone === "bad" ? "text-red-500" : "text-amber-500")} />
                  <div><p className={cx("text-xs font-semibold", theme.text)}>{a.title}</p><p className={cx("text-xs", theme.textMuted)}>{a.detail}</p></div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel theme={theme} title="Facturacion: estado general">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={cx("rounded-lg p-3", theme.surfaceAlt)}><p className={cx("text-xs", theme.textMuted)}>Pendiente</p><p className="nx-mono font-bold text-amber-500">{fmtCOP(kpis.facPendiente)}</p></div>
          <div className={cx("rounded-lg p-3", theme.surfaceAlt)}><p className={cx("text-xs", theme.textMuted)}>Pagada</p><p className="nx-mono font-bold text-emerald-500">{fmtCOP(kpis.facPagada)}</p></div>
          <div className={cx("rounded-lg p-3", theme.surfaceAlt)}><p className={cx("text-xs", theme.textMuted)}>Vencida</p><p className="nx-mono font-bold text-red-500">{fmtCOP(kpis.facVencida)}</p></div>
          <div className={cx("rounded-lg p-3", theme.surfaceAlt)}><p className={cx("text-xs", theme.textMuted)}>Anulada</p><p className="nx-mono font-bold text-slate-400">{fmtCOP(kpis.facAnulada)}</p></div>
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================================
   MODULO: TERCEROS (clientes y proveedores)
   ============================================================================ */

function TercerosPage({ data, dispatch, actor, theme, role }) {
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ tipo: "cliente", tipoDoc: "NIT", numDoc: "", nombre: "", email: "", telefono: "", ciudad: "", cupoCredito: 0, condicionPagoDias: 30, listaPrecios: "General" });

  const columns = [
    { key: "nombre", label: "Nombre / razon social", sortable: true, render: (t) => <div><p className="font-semibold">{t.nombre}</p><p className={cx("text-xs", theme.textMuted)}>{t.tipoDoc} {t.numDoc}</p></div> },
    { key: "tipo", label: "Tipo", render: (t) => <span className={cx("text-xs font-semibold px-2 py-1 rounded-full", t.tipo === "cliente" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700")}>{t.tipo === "cliente" ? "Cliente" : "Proveedor"}</span> },
    { key: "ciudad", label: "Ciudad", sortable: true },
    { key: "contacto", label: "Contacto", render: (t) => <div className="text-xs"><p className="flex items-center gap-1"><Mail size={11} />{t.email}</p><p className="flex items-center gap-1 mt-0.5"><Phone size={11} />{t.telefono}</p></div> },
    { key: "saldo", label: "Saldo", render: (t) => t.tipo === "cliente" ? <span className={cx("nx-mono font-semibold", t.saldoCartera > 0 ? "text-amber-600" : theme.textMuted)}>{fmtCOP(t.saldoCartera)}</span> : <span className={cx("nx-mono font-semibold", t.saldoCxP > 0 ? "text-amber-600" : theme.textMuted)}>{fmtCOP(t.saldoCxP)}</span> },
  ];

  const submit = () => {
    if (!form.nombre.trim() || !form.numDoc.trim()) return;
    dispatch({ type: "CREAR_TERCERO", payload: { ...form, cupoCredito: Number(form.cupoCredito) || 0, condicionPagoDias: Number(form.condicionPagoDias) || 0 }, actor });
    setShowNew(false);
    setForm({ tipo: "cliente", tipoDoc: "NIT", numDoc: "", nombre: "", email: "", telefono: "", ciudad: "", cupoCredito: 0, condicionPagoDias: 30, listaPrecios: "General" });
  };

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Terceros"]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Clientes y proveedores</h2><p className={cx("text-sm", theme.textMuted)}>Gestion unificada de terceros, cupos de credito y condiciones de pago.</p></div>
        {puedeEscribir(role) && <Btn theme={theme} icon={Plus} onClick={() => setShowNew(true)}>Nuevo tercero</Btn>}
      </div>

      <Panel theme={theme}>
        <DataTable
          theme={theme} rows={data.terceros} columns={columns} searchKeys={["nombre", "numDoc", "email"]}
          filters={[{ key: "tipo", label: "Tipo", options: [{ value: "cliente", label: "Clientes" }, { value: "proveedor", label: "Proveedores" }] }]}
          exportName="terceros_lunaris" onRowClick={(t) => setDetail(t)} emptyTitle="Sin terceros registrados"
        />
      </Panel>

      <Modal open={showNew} onClose={() => setShowNew(false)} theme={theme} title="Nuevo tercero" footer={<><Btn theme={theme} variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Guardar tercero</Btn></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field theme={theme} label="Tipo" required><select className={inputCls(theme)} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="cliente">Cliente</option><option value="proveedor">Proveedor</option></select></Field>
          <Field theme={theme} label="Tipo de documento"><select className={inputCls(theme)} value={form.tipoDoc} onChange={(e) => setForm({ ...form, tipoDoc: e.target.value })}><option>NIT</option><option>CC</option><option>CE</option><option>Pasaporte</option></select></Field>
          <Field theme={theme} label="Numero de documento" required><input className={inputCls(theme)} value={form.numDoc} onChange={(e) => setForm({ ...form, numDoc: e.target.value })} placeholder="900.123.456-7" /></Field>
          <Field theme={theme} label="Nombre / razon social" required className="col-span-2"><input className={inputCls(theme)} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field theme={theme} label="Correo electronico"><input className={inputCls(theme)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field theme={theme} label="Telefono"><input className={inputCls(theme)} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
          <Field theme={theme} label="Ciudad"><input className={inputCls(theme)} value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></Field>
          <Field theme={theme} label="Condicion de pago (dias)"><input type="number" className={inputCls(theme)} value={form.condicionPagoDias} onChange={(e) => setForm({ ...form, condicionPagoDias: e.target.value })} /></Field>
          {form.tipo === "cliente" && <Field theme={theme} label="Cupo de credito (COP)" className="col-span-2"><input type="number" className={inputCls(theme)} value={form.cupoCredito} onChange={(e) => setForm({ ...form, cupoCredito: e.target.value })} /></Field>}
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} theme={theme} title={detail?.nombre} width="max-w-2xl" footer={<Btn theme={theme} variant="secondary" onClick={() => setDetail(null)}>Cerrar</Btn>}>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className={cx("text-xs", theme.textMuted)}>Documento</p><p className={cx("font-semibold", theme.text)}>{detail.tipoDoc} {detail.numDoc}</p></div>
              <div><p className={cx("text-xs", theme.textMuted)}>Ciudad</p><p className={cx("font-semibold", theme.text)}>{detail.ciudad}</p></div>
              <div><p className={cx("text-xs", theme.textMuted)}>Correo</p><p className={cx("font-semibold", theme.text)}>{detail.email}</p></div>
              <div><p className={cx("text-xs", theme.textMuted)}>Telefono</p><p className={cx("font-semibold", theme.text)}>{detail.telefono}</p></div>
            </div>
            <div>
              <p className={cx("text-xs font-bold uppercase tracking-wide mb-2", theme.textMuted)}>{detail.tipo === "cliente" ? "Historial de facturas" : "Historial de facturas de compra"}</p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto nx-scroll">
                {(detail.tipo === "cliente" ? data.facturas.filter((f) => f.terceroId === detail.id) : data.facturasCompra.filter((f) => f.proveedorId === detail.id)).map((f) => (
                  <div key={f.id} className={cx("flex items-center justify-between rounded-lg px-3 py-2 text-xs", theme.surfaceAlt)}>
                    <span className="nx-mono font-semibold">{f.numero}</span><span className={theme.textMuted}>{fmtDate(f.fecha)}</span><span className="nx-mono">{fmtCOP(f.total)}</span>
                    <Badge estado={detail.tipo === "cliente" ? facturaEstadoVisual(f) : (f.estado === "pagada" ? "pagada" : new Date(f.vencimiento) < new Date() ? "vencida" : "pendiente")} />
                  </div>
                ))}
                {(detail.tipo === "cliente" ? data.facturas.filter((f) => f.terceroId === detail.id) : data.facturasCompra.filter((f) => f.proveedorId === detail.id)).length === 0 && <p className={cx("text-xs", theme.textMuted)}>Sin documentos registrados.</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================================================================
   COMPONENTE COMPARTIDO: editor de items (cotizaciones, pedidos, ordenes de compra)
   ============================================================================ */

function ItemsEditor({ productos, items, setItems, theme, priceField = "precio", label = "Precio unitario" }) {
  const [productoId, setProductoId] = useState(productos[0]?.id || "");
  const [cantidad, setCantidad] = useState(1);

  const addItem = () => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod || cantidad <= 0) return;
    const precio = priceField === "precio" ? prod.precio : Math.round((prod.costoPromedio || 0) * 1.0) || 1000;
    setItems((prev) => {
      const existing = prev.find((i) => i.productoId === productoId);
      if (existing) return prev.map((i) => (i.productoId === productoId ? { ...i, cantidad: i.cantidad + Number(cantidad) } : i));
      return [...prev, { productoId, cantidad: Number(cantidad), [priceField]: precio, ivaPct: prod.iva, costoUnitario: precio }];
    });
    setCantidad(1);
  };
  const updateQty = (id, v) => setItems((prev) => prev.map((i) => (i.productoId === id ? { ...i, cantidad: Math.max(1, Number(v)) } : i)));
  const updatePrice = (id, v) => setItems((prev) => prev.map((i) => (i.productoId === id ? { ...i, [priceField]: Math.max(0, Number(v)) } : i)));
  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.productoId !== id));
  const subtotal = items.reduce((s, i) => s + i.cantidad * i[priceField], 0);
  const iva = items.reduce((s, i) => s + i.cantidad * i[priceField] * ((i.ivaPct ?? 19) / 100), 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select className={cx(inputCls(theme), "flex-1")} value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
        </select>
        <input type="number" min={1} className={cx(inputCls(theme), "w-20")} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        <Btn theme={theme} variant="secondary" icon={Plus} onClick={addItem}>Agregar</Btn>
      </div>
      {items.length === 0 ? <p className={cx("text-xs text-center py-4", theme.textMuted)}>Agrega al menos un producto o servicio.</p> : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: theme.dark ? "#334155" : "#e2e8f0" }}>
          <table className="w-full text-xs">
            <thead><tr className={theme.surfaceAlt}><th className="text-left px-2.5 py-2">Item</th><th className="px-2 py-2 w-20">Cant.</th><th className="px-2 py-2 w-28">{label}</th><th className="px-2 py-2 w-24">Total</th><th className="w-8"></th></tr></thead>
            <tbody>
              {items.map((i) => {
                const prod = productos.find((p) => p.id === i.productoId);
                return (
                  <tr key={i.productoId} className="border-t" style={{ borderColor: theme.dark ? "#334155" : "#e2e8f0" }}>
                    <td className="px-2.5 py-1.5">{prod?.nombre}</td>
                    <td className="px-2 py-1.5"><input type="number" min={1} value={i.cantidad} onChange={(e) => updateQty(i.productoId, e.target.value)} className={cx(inputCls(theme), "py-1 px-1.5 text-center")} /></td>
                    <td className="px-2 py-1.5"><input type="number" min={0} value={i[priceField]} onChange={(e) => updatePrice(i.productoId, e.target.value)} className={cx(inputCls(theme), "py-1 px-1.5 nx-mono")} /></td>
                    <td className="px-2 py-1.5 nx-mono text-right">{fmtCOP(i.cantidad * i[priceField])}</td>
                    <td className="px-1"><button onClick={() => removeItem(i.productoId)}><Trash2 size={13} className="text-red-500" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="text-xs space-y-1 w-48">
            <div className="flex justify-between"><span className={theme.textMuted}>Subtotal</span><span className="nx-mono">{fmtCOP(subtotal)}</span></div>
            <div className="flex justify-between"><span className={theme.textMuted}>IVA</span><span className="nx-mono">{fmtCOP(iva)}</span></div>
            <div className={cx("flex justify-between font-bold pt-1 border-t", theme.border)}><span>Total</span><span className="nx-mono">{fmtCOP(subtotal + iva)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Vista imprimible de factura (ventana completa; se usa para "Imprimir / Guardar como PDF") */
function FacturaImprimible({ factura, tercero, sede, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen bg-white text-slate-900 nx-root">
      <div className="nx-noprint sticky top-0 bg-slate-900 text-white flex items-center justify-between px-5 py-3">
        <p className="text-sm font-semibold">Vista de impresion — {factura.numero}</p>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold flex items-center gap-1.5"><Printer size={13} /> Imprimir / Guardar PDF</button>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-700 text-xs font-bold">Cerrar</button>
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-10 nx-print-area">
        <div className="flex justify-between items-start border-b-2 pb-5 mb-6" style={{ borderColor: BRAND.navy }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div style={{ backgroundColor: BRAND.gold }} className="h-8 w-8 rounded grid place-items-center"><span className="nx-display font-bold text-xs" style={{ color: BRAND.navyDark }}>NX</span></div>
              <span className="nx-display font-bold text-lg">{EMPRESA.razonSocial}</span>
            </div>
            <p className="text-xs text-slate-500">NIT {EMPRESA.nit} · {EMPRESA.responsabilidad}</p>
            <p className="text-xs text-slate-500">{EMPRESA.direccion} · {sede?.ciudad}</p>
            <p className="text-xs text-slate-500">{EMPRESA.telefono} · {EMPRESA.email}</p>
          </div>
          <div className="text-right">
            <p className="nx-display font-bold text-xl" style={{ color: BRAND.navy }}>FACTURA DE VENTA</p>
            <p className="nx-mono font-bold text-lg">{factura.numero}</p>
            <p className="text-xs text-slate-500 mt-1">Fecha: {fmtDate(factura.fecha)}</p>
            <p className="text-xs text-slate-500">Vencimiento: {fmtDate(factura.vencimiento)}</p>
            <p className="text-[10px] mt-1 uppercase font-bold text-slate-400">Estado DIAN (sandbox): {factura.estadoDian}</p>
            {factura.cufe && <p className="text-[9px] text-slate-400 break-all mt-0.5">CUFE: {factura.cufe}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div><p className="font-bold text-slate-500 uppercase mb-1">Cliente</p><p className="font-semibold">{tercero?.nombre}</p><p>{tercero?.tipoDoc} {tercero?.numDoc}</p><p>{tercero?.direccion || tercero?.ciudad}</p><p>{tercero?.email}</p></div>
          <div className="text-right"><p className="font-bold text-slate-500 uppercase mb-1">Condiciones</p><p>Forma de pago: credito {tercero?.condicionPagoDias || 0} dias</p><p>Saldo de la factura: {fmtCOP(factura.saldo)}</p></div>
        </div>
        <table className="w-full text-xs mb-6">
          <thead><tr className="border-b-2 text-left" style={{ borderColor: BRAND.navy }}><th className="py-2">Descripcion</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">Vr. unitario</th><th className="py-2 text-right">IVA</th><th className="py-2 text-right">Total</th></tr></thead>
          <tbody>
            {factura.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-200"><td className="py-2">{it.nombre || it.productoId}</td><td className="py-2 text-right nx-mono">{it.cantidad}</td><td className="py-2 text-right nx-mono">{fmtCOP(it.precio)}</td><td className="py-2 text-right nx-mono">{it.ivaPct}%</td><td className="py-2 text-right nx-mono">{fmtCOP(it.cantidad * it.precio * (1 + it.ivaPct / 100))}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mb-8">
          <div className="w-56 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="nx-mono">{fmtCOP(factura.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">IVA</span><span className="nx-mono">{fmtCOP(factura.iva)}</span></div>
            <div className="flex justify-between font-bold text-sm pt-1.5 border-t-2" style={{ borderColor: BRAND.navy }}><span>Total</span><span className="nx-mono">{fmtCOP(factura.total)}</span></div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 border-t pt-3">Documento generado por Lunaris en ambiente de demostracion. La representacion grafica y el proceso de facturacion electronica DIAN de esta factura son simulados (sandbox) y no tienen validez tributaria real.</p>
      </div>
    </div>
  );
}

/* ============================================================================
   MODULO: VENTAS Y FACTURACION
   ============================================================================ */

function VentasPage({ data, dispatch, actor, theme, role, sedeActiva, setPrint }) {
  const [tab, setTab] = useState("cotizaciones");
  const [showNew, setShowNew] = useState(false);
  const [remModal, setRemModal] = useState(null); // pedido
  const [reciboModal, setReciboModal] = useState(null); // factura
  const [anularModal, setAnularModal] = useState(null); // factura

  const tabs = [
    { key: "cotizaciones", label: "Cotizaciones", count: data.cotizaciones.length },
    { key: "pedidos", label: "Pedidos", count: data.pedidos.length },
    { key: "remisiones", label: "Remisiones", count: data.remisiones.length },
    { key: "facturas", label: "Facturas", count: data.facturas.length },
  ];

  const terceroNombre = (id) => data.terceros.find((t) => t.id === id)?.nombre || "—";

  const cotColumns = [
    { key: "numero", label: "Numero", sortable: true, render: (c) => <span className="nx-mono font-semibold">{c.numero}</span> },
    { key: "terceroId", label: "Cliente", render: (c) => terceroNombre(c.terceroId) },
    { key: "fecha", label: "Fecha", sortable: true, render: (c) => fmtDate(c.fecha) },
    { key: "total", label: "Total", sortable: true, render: (c) => <span className="nx-mono">{fmtCOP(c.total)}</span> },
    { key: "estado", label: "Estado", render: (c) => <Badge estado={c.estado} /> },
  ];
  const pedColumns = [
    { key: "numero", label: "Numero", render: (p) => <span className="nx-mono font-semibold">{p.numero}</span> },
    { key: "terceroId", label: "Cliente", render: (p) => terceroNombre(p.terceroId) },
    { key: "fecha", label: "Fecha", render: (p) => fmtDate(p.fecha) },
    { key: "total", label: "Total", render: (p) => <span className="nx-mono">{fmtCOP(p.total)}</span> },
    { key: "estado", label: "Estado", render: (p) => <Badge estado={p.estado} /> },
  ];
  const remColumns = [
    { key: "numero", label: "Numero", render: (r) => <span className="nx-mono font-semibold">{r.numero}</span> },
    { key: "terceroId", label: "Cliente", render: (r) => terceroNombre(r.terceroId) },
    { key: "bodegaId", label: "Bodega", render: (r) => BODEGAS.find((b) => b.id === r.bodegaId)?.nombre },
    { key: "fecha", label: "Fecha", render: (r) => fmtDate(r.fecha) },
    { key: "tieneFactura", label: "Facturada", render: (r) => data.facturas.some((f) => f.remisionId === r.id) ? <Badge estado="pagada">Si</Badge> : <Badge estado="pendiente">No</Badge> },
  ];
  const facColumns = [
    { key: "numero", label: "Numero", render: (f) => <span className="nx-mono font-semibold">{f.numero}</span> },
    { key: "terceroId", label: "Cliente", render: (f) => terceroNombre(f.terceroId) },
    { key: "fecha", label: "Fecha", sortable: true, render: (f) => fmtDate(f.fecha) },
    { key: "vencimiento", label: "Vence", render: (f) => fmtDate(f.vencimiento) },
    { key: "total", label: "Total", sortable: true, render: (f) => <span className="nx-mono">{fmtCOP(f.total)}</span> },
    { key: "saldo", label: "Saldo", render: (f) => <span className="nx-mono">{fmtCOP(f.saldo)}</span> },
    { key: "estadoV", label: "Estado", render: (f) => <Badge estado={facturaEstadoVisual(f)} /> },
    { key: "estadoDian", label: "DIAN (sandbox)", render: (f) => <Badge estado={f.estadoDian} /> },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Ventas y facturacion", tabs.find((t) => t.key === tab)?.label]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Ventas y facturacion</h2><p className={cx("text-sm", theme.textMuted)}>Cotizacion → pedido → remision → factura → recaudo.</p></div>
        {puedeEscribir(role) && tab === "cotizaciones" && <Btn theme={theme} icon={Plus} onClick={() => setShowNew(true)}>Nueva cotizacion</Btn>}
      </div>

      <div className={cx("flex gap-1 border-b overflow-x-auto", theme.border)}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cx("px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors", tab === t.key ? "border-amber-500" : "border-transparent " + theme.textMuted)} style={tab === t.key ? { color: BRAND.navy } : undefined}>
            {t.label} <span className={cx("ml-1 text-xs px-1.5 py-0.5 rounded-full", theme.surfaceAlt)}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "cotizaciones" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.cotizaciones} columns={cotColumns} searchKeys={["numero"]} exportName="cotizaciones"
            filters={[{ key: "estado", label: "Estado", options: [{ value: "borrador", label: "Borrador" }, { value: "aprobada", label: "Aprobada" }, { value: "convertida", label: "Convertida" }] }]}
            emptyTitle="Sin cotizaciones" emptyHint="Crea la primera cotizacion con el boton de arriba."
            rowActions={(c) => (
              <div className="flex gap-1.5 justify-end">
                {c.estado === "borrador" && puedeAprobar(role) && <Btn theme={theme} size="sm" variant="secondary" icon={CheckCircle2} onClick={() => dispatch({ type: "APROBAR_COTIZACION", payload: { id: c.id }, actor })}>Aprobar</Btn>}
                {c.estado === "aprobada" && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={ArrowRight} onClick={() => { dispatch({ type: "CONVERTIR_PEDIDO", payload: { id: c.id }, actor }); setTab("pedidos"); }}>Convertir a pedido</Btn>}
              </div>
            )}
          />
        </Panel>
      )}

      {tab === "pedidos" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.pedidos} columns={pedColumns} searchKeys={["numero"]} exportName="pedidos"
            filters={[{ key: "estado", label: "Estado", options: [{ value: "pendiente", label: "Pendiente" }, { value: "remisionado", label: "Remisionado" }] }]}
            emptyTitle="Sin pedidos" emptyHint="Los pedidos se crean al convertir una cotizacion aprobada."
            rowActions={(p) => p.estado === "pendiente" && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={Truck} onClick={() => setRemModal(p)}>Generar remision</Btn>}
          />
        </Panel>
      )}

      {tab === "remisiones" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.remisiones} columns={remColumns} searchKeys={["numero"]} exportName="remisiones" emptyTitle="Sin remisiones"
            rowActions={(r) => !data.facturas.some((f) => f.remisionId === r.id) && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={Receipt} onClick={() => { const res = dispatch({ type: "GENERAR_FACTURA", payload: { remisionId: r.id }, actor }); setTab("facturas"); }}>Generar factura</Btn>}
          />
        </Panel>
      )}

      {tab === "facturas" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.facturas} columns={facColumns} searchKeys={["numero"]} exportName="facturas_venta"
            filters={[{ key: "estado", label: "Estado", options: [{ value: "pendiente", label: "Pendiente" }, { value: "parcial", label: "Parcial" }, { value: "pagada", label: "Pagada" }, { value: "anulada", label: "Anulada" }] }]}
            emptyTitle="Sin facturas emitidas"
            rowActions={(f) => (
              <div className="flex gap-1 justify-end">
                <IconBtn theme={theme} icon={Printer} title="Imprimir / PDF" onClick={() => setPrint({ factura: f, tercero: data.terceros.find((t) => t.id === f.terceroId), sede: SEDES.find((s) => s.id === f.sedeId) })} />
                {f.estado !== "anulada" && f.estado !== "pagada" && puedeEscribir(role) && <IconBtn theme={theme} icon={Wallet2} title="Registrar recibo de caja" onClick={() => setReciboModal(f)} />}
                {f.estadoDian !== "aceptado" && f.estado !== "anulada" && puedeEscribir(role) && <IconBtn theme={theme} icon={RefreshCw} title="Simular respuesta DIAN (sandbox)" onClick={() => dispatch({ type: "SIMULAR_DIAN", payload: { id: f.id }, actor })} />}
                {f.estado === "pendiente" && f.pagos.length === 0 && puedeAprobar(role) && <IconBtn theme={theme} icon={Ban} title="Anular factura" onClick={() => setAnularModal(f)} />}
              </div>
            )}
          />
        </Panel>
      )}

      <NuevaCotizacionModal open={showNew} onClose={() => setShowNew(false)} data={data} dispatch={dispatch} actor={actor} theme={theme} sedeActiva={sedeActiva} onDone={() => setTab("cotizaciones")} />
      <GenerarRemisionModal pedido={remModal} onClose={() => setRemModal(null)} dispatch={dispatch} actor={actor} theme={theme} onDone={() => { setRemModal(null); setTab("remisiones"); }} />
      <RegistrarReciboModal factura={reciboModal} onClose={() => setReciboModal(null)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
      <AnularFacturaModal factura={anularModal} onClose={() => setAnularModal(null)} dispatch={dispatch} actor={actor} theme={theme} />
    </div>
  );
}

function NuevaCotizacionModal({ open, onClose, data, dispatch, actor, theme, sedeActiva, onDone }) {
  const [terceroId, setTerceroId] = useState("");
  const [items, setItems] = useState([]);
  useEffect(() => { if (open) { setTerceroId(data.terceros.find((t) => t.tipo === "cliente")?.id || ""); setItems([]); } }, [open]);
  const clientes = data.terceros.filter((t) => t.tipo === "cliente");
  const submit = () => {
    if (!terceroId || items.length === 0) return;
    dispatch({ type: "CREAR_COTIZACION", payload: { terceroId, sedeId: sedeActiva, items: items.map(({ productoId, cantidad, precio, ivaPct }) => ({ productoId, cantidad, precio, ivaPct })) }, actor });
    onClose(); onDone?.();
  };
  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Nueva cotizacion" width="max-w-2xl" footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit} disabled={!terceroId || items.length === 0}>Guardar cotizacion</Btn></>}>
      <div className="space-y-4">
        <Field theme={theme} label="Cliente" required>
          <select className={inputCls(theme)} value={terceroId} onChange={(e) => setTerceroId(e.target.value)}>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <ItemsEditor productos={data.productos} items={items} setItems={setItems} theme={theme} priceField="precio" label="Precio" />
      </div>
    </Modal>
  );
}

function GenerarRemisionModal({ pedido, onClose, dispatch, actor, theme, onDone }) {
  const [bodegaId, setBodegaId] = useState(BODEGAS[0].id);
  useEffect(() => { if (pedido) setBodegaId(BODEGAS.find((b) => b.sedeId === pedido.sedeId)?.id || BODEGAS[0].id); }, [pedido]);
  const submit = () => {
    const res = dispatch({ type: "GENERAR_REMISION", payload: { pedidoId: pedido.id, bodegaId }, actor });
    onDone?.();
  };
  if (!pedido) return null;
  return (
    <Modal open={!!pedido} onClose={onClose} theme={theme} title={`Generar remision — ${pedido.numero}`} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Generar remision</Btn></>}>
      <div className="space-y-3">
        <p className={cx("text-xs", theme.textMuted)}>Selecciona la bodega desde la que se despachara la mercancia. El sistema validara existencias disponibles.</p>
        <Field theme={theme} label="Bodega de despacho">
          <select className={inputCls(theme)} value={bodegaId} onChange={(e) => setBodegaId(e.target.value)}>{BODEGAS.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select>
        </Field>
        <div className={cx("rounded-lg p-3 text-xs space-y-1", theme.surfaceAlt)}>
          {pedido.items.map((i) => <div key={i.productoId} className="flex justify-between"><span>{i.nombre}</span><span className="nx-mono">{i.cantidad} und.</span></div>)}
        </div>
      </div>
    </Modal>
  );
}

function RegistrarReciboModal({ factura, onClose, data, dispatch, actor, theme }) {
  const [monto, setMonto] = useState(0);
  const [medioPago, setMedioPago] = useState("Transferencia bancaria");
  const [cajaBancoId, setCajaBancoId] = useState(data.cajasBancos[0]?.id);
  useEffect(() => { if (factura) setMonto(factura.saldo); }, [factura]);
  if (!factura) return null;
  const submit = () => { const res = dispatch({ type: "REGISTRAR_RECIBO", payload: { facturaId: factura.id, monto: Number(monto), medioPago, cajaBancoId }, actor }); onClose(); };
  return (
    <Modal open={!!factura} onClose={onClose} theme={theme} title={`Registrar recibo — ${factura.numero}`} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Registrar recibo</Btn></>}>
      <div className="space-y-3">
        <div className={cx("rounded-lg p-3 flex justify-between text-sm", theme.surfaceAlt)}><span className={theme.textMuted}>Saldo pendiente</span><span className="nx-mono font-bold">{fmtCOP(factura.saldo)}</span></div>
        <Field theme={theme} label="Monto a recibir" required><input type="number" className={inputCls(theme)} value={monto} onChange={(e) => setMonto(e.target.value)} max={factura.saldo} /></Field>
        <Field theme={theme} label="Medio de pago"><select className={inputCls(theme)} value={medioPago} onChange={(e) => setMedioPago(e.target.value)}><option>Transferencia bancaria</option><option>Efectivo</option><option>Tarjeta debito/credito</option><option>Cheque</option></select></Field>
        <Field theme={theme} label="Caja / cuenta bancaria destino"><select className={inputCls(theme)} value={cajaBancoId} onChange={(e) => setCajaBancoId(e.target.value)}>{data.cajasBancos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

function AnularFacturaModal({ factura, onClose, dispatch, actor, theme }) {
  const [motivo, setMotivo] = useState("");
  useEffect(() => { setMotivo(""); }, [factura]);
  if (!factura) return null;
  const submit = () => { dispatch({ type: "ANULAR_FACTURA", payload: { id: factura.id, motivo }, actor }); onClose(); };
  return (
    <Modal open={!!factura} onClose={onClose} theme={theme} title={`Anular factura — ${factura.numero}`} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} variant="danger" onClick={submit} disabled={motivo.trim().length < 5}>Confirmar anulacion</Btn></>}>
      <div className="space-y-3">
        <div className="flex gap-2 items-start rounded-lg p-3 bg-red-50 text-red-700 text-xs"><AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>Esta accion es irreversible y quedara registrada en la bitacora de auditoria. La factura debe estar libre de recaudos aplicados.</span></div>
        <Field theme={theme} label="Motivo de anulacion" required><textarea rows={3} className={inputCls(theme)} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explica por que se anula este documento..." /></Field>
      </div>
    </Modal>
  );
}

/* ============================================================================
   MODULO: COMPRAS
   ============================================================================ */

function ComprasPage({ data, dispatch, actor, theme, role, sedeActiva }) {
  const [tab, setTab] = useState("ordenes");
  const [showNew, setShowNew] = useState(false);
  const [recibirModal, setRecibirModal] = useState(null);
  const [pagarModal, setPagarModal] = useState(null);
  const proveedorNombre = (id) => data.terceros.find((t) => t.id === id)?.nombre || "—";

  const tabs = [
    { key: "ordenes", label: "Ordenes de compra", count: data.ordenesCompra.length },
    { key: "recepciones", label: "Recepciones", count: data.recepciones.length },
    { key: "facturas", label: "Facturas de compra", count: data.facturasCompra.length },
  ];

  const ocColumns = [
    { key: "numero", label: "Numero", render: (o) => <span className="nx-mono font-semibold">{o.numero}</span> },
    { key: "proveedorId", label: "Proveedor", render: (o) => proveedorNombre(o.proveedorId) },
    { key: "fecha", label: "Fecha", render: (o) => fmtDate(o.fecha) },
    { key: "total", label: "Total", render: (o) => <span className="nx-mono">{fmtCOP(o.total)}</span> },
    { key: "estado", label: "Estado", render: (o) => <Badge estado={o.estado} /> },
  ];
  const rcpColumns = [
    { key: "numero", label: "Numero", render: (r) => <span className="nx-mono font-semibold">{r.numero}</span> },
    { key: "ocId", label: "Orden de compra", render: (r) => data.ordenesCompra.find((o) => o.id === r.ocId)?.numero },
    { key: "fecha", label: "Fecha", render: (r) => fmtDate(r.fecha) },
    { key: "facturada", label: "Facturada", render: (r) => data.facturasCompra.some((f) => f.recepcionId === r.id) ? <Badge estado="pagada">Si</Badge> : <Badge estado="pendiente">No</Badge> },
  ];
  const fcColumns = [
    { key: "numero", label: "Numero", render: (f) => <span className="nx-mono font-semibold">{f.numero}</span> },
    { key: "proveedorId", label: "Proveedor", render: (f) => proveedorNombre(f.proveedorId) },
    { key: "fecha", label: "Fecha", render: (f) => fmtDate(f.fecha) },
    { key: "vencimiento", label: "Vence", render: (f) => fmtDate(f.vencimiento) },
    { key: "total", label: "Total", render: (f) => <span className="nx-mono">{fmtCOP(f.total)}</span> },
    { key: "saldo", label: "Saldo", render: (f) => <span className="nx-mono">{fmtCOP(f.saldo)}</span> },
    { key: "estado", label: "Estado", render: (f) => <Badge estado={f.estado === "pagada" ? "pagada" : f.estado === "parcial" ? "parcial" : new Date(f.vencimiento) < new Date() ? "vencida" : "pendiente"} /> },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Compras", tabs.find((t) => t.key === tab)?.label]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Compras y proveedores</h2><p className={cx("text-sm", theme.textMuted)}>Orden de compra → recepcion → factura → pago.</p></div>
        {puedeEscribir(role) && tab === "ordenes" && <Btn theme={theme} icon={Plus} onClick={() => setShowNew(true)}>Nueva orden de compra</Btn>}
      </div>
      <div className={cx("flex gap-1 border-b overflow-x-auto", theme.border)}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cx("px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px", tab === t.key ? "border-amber-500" : "border-transparent " + theme.textMuted)} style={tab === t.key ? { color: BRAND.navy } : undefined}>
            {t.label} <span className={cx("ml-1 text-xs px-1.5 py-0.5 rounded-full", theme.surfaceAlt)}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "ordenes" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.ordenesCompra} columns={ocColumns} searchKeys={["numero"]} exportName="ordenes_compra" emptyTitle="Sin ordenes de compra"
            filters={[{ key: "estado", label: "Estado", options: [{ value: "pendiente", label: "Pendiente" }, { value: "recibida_parcial", label: "Recibida parcial" }, { value: "recibida", label: "Recibida" }] }]}
            rowActions={(o) => o.estado !== "recibida" && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={PackageCheck} onClick={() => setRecibirModal(o)}>Recibir</Btn>}
          />
        </Panel>
      )}
      {tab === "recepciones" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.recepciones} columns={rcpColumns} searchKeys={["numero"]} exportName="recepciones" emptyTitle="Sin recepciones"
            rowActions={(r) => !data.facturasCompra.some((f) => f.recepcionId === r.id) && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={Receipt} onClick={() => { dispatch({ type: "GENERAR_FACTURA_COMPRA", payload: { recepcionId: r.id }, actor }); setTab("facturas"); }}>Generar factura</Btn>}
          />
        </Panel>
      )}
      {tab === "facturas" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.facturasCompra} columns={fcColumns} searchKeys={["numero"]} exportName="facturas_compra" emptyTitle="Sin facturas de compra"
            filters={[{ key: "estado", label: "Estado", options: [{ value: "pendiente", label: "Pendiente" }, { value: "parcial", label: "Parcial" }, { value: "pagada", label: "Pagada" }] }]}
            rowActions={(f) => f.estado !== "pagada" && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={Wallet2} onClick={() => setPagarModal(f)}>Pagar</Btn>}
          />
        </Panel>
      )}

      <NuevaOCModal open={showNew} onClose={() => setShowNew(false)} data={data} dispatch={dispatch} actor={actor} theme={theme} sedeActiva={sedeActiva} onDone={() => setTab("ordenes")} />
      <RecibirOCModal oc={recibirModal} onClose={() => setRecibirModal(null)} dispatch={dispatch} actor={actor} theme={theme} onDone={() => setTab("recepciones")} />
      <PagarFacturaCompraModal factura={pagarModal} onClose={() => setPagarModal(null)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
    </div>
  );
}

function NuevaOCModal({ open, onClose, data, dispatch, actor, theme, sedeActiva, onDone }) {
  const [proveedorId, setProveedorId] = useState("");
  const [bodegaId, setBodegaId] = useState(BODEGAS[0].id);
  const [items, setItems] = useState([]);
  useEffect(() => { if (open) { setProveedorId(data.terceros.find((t) => t.tipo === "proveedor")?.id || ""); setBodegaId(BODEGAS.find((b) => b.sedeId === sedeActiva)?.id || BODEGAS[0].id); setItems([]); } }, [open]);
  const proveedores = data.terceros.filter((t) => t.tipo === "proveedor");
  const submit = () => {
    if (!proveedorId || items.length === 0) return;
    dispatch({ type: "CREAR_OC", payload: { proveedorId, sedeId: sedeActiva, bodegaId, items: items.map(({ productoId, cantidad, costoUnitario }) => ({ productoId, cantidad, costoUnitario })) }, actor });
    onClose(); onDone?.();
  };
  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Nueva orden de compra" width="max-w-2xl" footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit} disabled={!proveedorId || items.length === 0}>Guardar orden</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field theme={theme} label="Proveedor" required><select className={inputCls(theme)} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field>
          <Field theme={theme} label="Bodega de recepcion"><select className={inputCls(theme)} value={bodegaId} onChange={(e) => setBodegaId(e.target.value)}>{BODEGAS.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></Field>
        </div>
        <ItemsEditor productos={data.productos.filter((p) => p.categoria !== "Servicios")} items={items} setItems={setItems} theme={theme} priceField="costoUnitario" label="Costo unitario" />
      </div>
    </Modal>
  );
}

function RecibirOCModal({ oc, onClose, dispatch, actor, theme, onDone }) {
  const [cantidades, setCantidades] = useState({});
  useEffect(() => { if (oc) { const init = {}; oc.items.forEach((i) => { const pendiente = i.cantidad - (oc.recibidoItems[i.productoId] || 0); if (pendiente > 0) init[i.productoId] = pendiente; }); setCantidades(init); } }, [oc]);
  if (!oc) return null;
  const submit = () => {
    const items = Object.entries(cantidades).filter(([, c]) => Number(c) > 0).map(([productoId, cantidad]) => ({ productoId, cantidad: Number(cantidad) }));
    if (items.length === 0) return;
    dispatch({ type: "RECIBIR_OC", payload: { ocId: oc.id, items }, actor });
    onClose(); onDone?.();
  };
  return (
    <Modal open={!!oc} onClose={onClose} theme={theme} title={`Recibir mercancia — ${oc.numero}`} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Confirmar recepcion</Btn></>}>
      <div className="space-y-2">
        {oc.items.map((i) => {
          const pendiente = i.cantidad - (oc.recibidoItems[i.productoId] || 0);
          if (pendiente <= 0) return null;
          return (
            <div key={i.productoId} className={cx("flex items-center justify-between rounded-lg p-2.5 text-sm", theme.surfaceAlt)}>
              <div><p className="font-medium">{i.nombre}</p><p className={cx("text-xs", theme.textMuted)}>Pendiente por recibir: {pendiente} und.</p></div>
              <input type="number" min={0} max={pendiente} className={cx(inputCls(theme), "w-24")} value={cantidades[i.productoId] ?? 0} onChange={(e) => setCantidades((c) => ({ ...c, [i.productoId]: e.target.value }))} />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function PagarFacturaCompraModal({ factura, onClose, data, dispatch, actor, theme }) {
  const [monto, setMonto] = useState(0);
  const [cajaBancoId, setCajaBancoId] = useState(data.cajasBancos[0]?.id);
  useEffect(() => { if (factura) setMonto(factura.saldo); }, [factura]);
  if (!factura) return null;
  const submit = () => { dispatch({ type: "PAGAR_FACTURA_COMPRA", payload: { facturaCompraId: factura.id, monto: Number(monto), cajaBancoId }, actor }); onClose(); };
  return (
    <Modal open={!!factura} onClose={onClose} theme={theme} title={`Pagar factura de compra — ${factura.numero}`} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Registrar pago</Btn></>}>
      <div className="space-y-3">
        <div className={cx("rounded-lg p-3 flex justify-between text-sm", theme.surfaceAlt)}><span className={theme.textMuted}>Saldo pendiente</span><span className="nx-mono font-bold">{fmtCOP(factura.saldo)}</span></div>
        <Field theme={theme} label="Monto a pagar" required><input type="number" className={inputCls(theme)} value={monto} onChange={(e) => setMonto(e.target.value)} max={factura.saldo} /></Field>
        <Field theme={theme} label="Caja / cuenta bancaria origen"><select className={inputCls(theme)} value={cajaBancoId} onChange={(e) => setCajaBancoId(e.target.value)}>{data.cajasBancos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

/* ============================================================================
   MODULO: INVENTARIO Y BODEGAS
   ============================================================================ */

function InventarioPage({ data, dispatch, actor, theme, role }) {
  const [tab, setTab] = useState("productos");
  const [ajusteModal, setAjusteModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [showNewProd, setShowNewProd] = useState(false);
  const [kardexProductoId, setKardexProductoId] = useState(data.productos[0]?.id);

  const stockTotal = (p) => Object.values(p.stock || {}).reduce((a, b) => a + b, 0);

  const prodColumns = [
    { key: "codigo", label: "Codigo", sortable: true, render: (p) => <span className="nx-mono font-semibold">{p.codigo}</span> },
    { key: "nombre", label: "Producto", sortable: true },
    { key: "categoria", label: "Categoria", sortable: true },
    { key: "bodBog", label: "Bogota", render: (p) => <span className="nx-mono">{p.stock["bod-bog"] ?? "—"}</span> },
    { key: "bodMed", label: "Medellin", render: (p) => <span className="nx-mono">{p.stock["bod-med"] ?? "—"}</span> },
    { key: "total", label: "Total", render: (p) => <span className={cx("nx-mono font-bold", p.minimo > 0 && stockTotal(p) <= p.minimo && "text-red-500")}>{p.categoria === "Servicios" ? "N/A" : stockTotal(p)}</span> },
    { key: "costoPromedio", label: "Costo prom.", render: (p) => <span className="nx-mono">{fmtCOP(p.costoPromedio)}</span> },
    { key: "precio", label: "Precio venta", render: (p) => <span className="nx-mono">{fmtCOP(p.precio)}</span> },
    { key: "valorizado", label: "Valorizado", render: (p) => <span className="nx-mono">{fmtCOP(stockTotal(p) * (p.costoPromedio || 0))}</span> },
  ];

  const kardexRows = useMemo(() => data.movimientosInventario.filter((m) => m.productoId === kardexProductoId).slice().reverse(), [data.movimientosInventario, kardexProductoId]);
  const kardexCols = [
    { key: "fecha", label: "Fecha", render: (m) => fmtDateTime(m.fecha) },
    { key: "origen", label: "Origen del movimiento" },
    { key: "bodegaId", label: "Bodega", render: (m) => BODEGAS.find((b) => b.id === m.bodegaId)?.nombre },
    { key: "tipo", label: "Tipo", render: (m) => <span className={cx("font-semibold text-xs px-2 py-1 rounded-full", m.tipo === "entrada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{m.tipo === "entrada" ? "Entrada" : "Salida"}</span> },
    { key: "cantidad", label: "Cantidad", render: (m) => <span className="nx-mono">{m.tipo === "entrada" ? "+" : "-"}{m.cantidad}</span> },
    { key: "saldoResultante", label: "Saldo bodega", render: (m) => <span className="nx-mono font-semibold">{m.saldoResultante}</span> },
  ];

  const movColumns = [
    { key: "fecha", label: "Fecha", render: (m) => fmtDateTime(m.fecha) },
    { key: "productoId", label: "Producto", render: (m) => data.productos.find((p) => p.id === m.productoId)?.nombre },
    { key: "bodegaId", label: "Bodega", render: (m) => BODEGAS.find((b) => b.id === m.bodegaId)?.nombre },
    { key: "tipo", label: "Tipo", render: (m) => <span className={cx("font-semibold text-xs px-2 py-1 rounded-full", m.tipo === "entrada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{m.tipo === "entrada" ? "Entrada" : "Salida"}</span> },
    { key: "cantidad", label: "Cantidad", render: (m) => <span className="nx-mono">{m.cantidad}</span> },
    { key: "origen", label: "Origen" },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Inventario y bodegas"]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Inventario y bodegas</h2><p className={cx("text-sm", theme.textMuted)}>Existencias, kardex, ajustes y transferencias entre {BODEGAS.map((b) => b.nombre).join(" y ")}.</p></div>
        {puedeEscribir(role) && <Btn theme={theme} icon={Plus} onClick={() => setShowNewProd(true)}>Nuevo producto</Btn>}
      </div>
      <div className={cx("flex gap-1 border-b overflow-x-auto", theme.border)}>
        {[{ key: "productos", label: "Productos y existencias" }, { key: "kardex", label: "Kardex" }, { key: "movimientos", label: "Movimientos" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cx("px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px", tab === t.key ? "border-amber-500" : "border-transparent " + theme.textMuted)} style={tab === t.key ? { color: BRAND.navy } : undefined}>{t.label}</button>
        ))}
      </div>

      {tab === "productos" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.productos} columns={prodColumns} searchKeys={["codigo", "nombre"]} exportName="inventario_productos"
            filters={[{ key: "categoria", label: "Categoria", options: uniq(data.productos.map((p) => p.categoria)).map((c) => ({ value: c, label: c })) }]}
            rowActions={(p) => p.categoria !== "Servicios" && puedeEscribir(role) && (
              <div className="flex gap-1.5 justify-end">
                <Btn theme={theme} size="sm" variant="secondary" icon={ArrowLeftRight} onClick={() => setTransferModal(p)}>Transferir</Btn>
                <Btn theme={theme} size="sm" variant="secondary" icon={ListChecks} onClick={() => setAjusteModal(p)}>Ajustar</Btn>
              </div>
            )}
          />
        </Panel>
      )}

      {tab === "kardex" && (
        <Panel theme={theme}>
          <div className="mb-3 max-w-sm">
            <select className={inputCls(theme)} value={kardexProductoId} onChange={(e) => setKardexProductoId(e.target.value)}>
              {data.productos.filter((p) => p.categoria !== "Servicios").map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
            </select>
          </div>
          <DataTable theme={theme} rows={kardexRows} columns={kardexCols} searchKeys={["origen"]} pageSize={10} emptyTitle="Sin movimientos para este producto" />
        </Panel>
      )}

      {tab === "movimientos" && (
        <Panel theme={theme}>
          <DataTable theme={theme} rows={data.movimientosInventario} columns={movColumns} searchKeys={["origen"]} exportName="movimientos_inventario" pageSize={10} emptyTitle="Sin movimientos registrados" />
        </Panel>
      )}

      <AjusteInventarioModal producto={ajusteModal} onClose={() => setAjusteModal(null)} dispatch={dispatch} actor={actor} theme={theme} />
      <TransferenciaModal producto={transferModal} onClose={() => setTransferModal(null)} dispatch={dispatch} actor={actor} theme={theme} />
      <NuevoProductoModal open={showNewProd} onClose={() => setShowNewProd(false)} dispatch={dispatch} actor={actor} theme={theme} />
    </div>
  );
}

function AjusteInventarioModal({ producto, onClose, dispatch, actor, theme }) {
  const [bodegaId, setBodegaId] = useState(BODEGAS[0].id);
  const [tipo, setTipo] = useState("entrada");
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");
  useEffect(() => { setBodegaId(BODEGAS[0].id); setTipo("entrada"); setCantidad(1); setMotivo(""); }, [producto]);
  if (!producto) return null;
  const submit = () => { dispatch({ type: "AJUSTE_INVENTARIO", payload: { productoId: producto.id, bodegaId, tipo, cantidad: Number(cantidad), motivo: motivo || "Ajuste manual" }, actor }); onClose(); };
  return (
    <Modal open={!!producto} onClose={onClose} theme={theme} title={`Ajuste de inventario — ${producto.nombre}`} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit} disabled={!motivo.trim()}>Aplicar ajuste</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field theme={theme} label="Bodega"><select className={inputCls(theme)} value={bodegaId} onChange={(e) => setBodegaId(e.target.value)}>{BODEGAS.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></Field>
          <Field theme={theme} label="Tipo de ajuste"><select className={inputCls(theme)} value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="entrada">Entrada (suma)</option><option value="salida">Salida (resta)</option></select></Field>
        </div>
        <Field theme={theme} label="Cantidad" required><input type="number" min={1} className={inputCls(theme)} value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Field>
        <Field theme={theme} label="Motivo del ajuste" required><input className={inputCls(theme)} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: conteo fisico, producto danado..." /></Field>
      </div>
    </Modal>
  );
}

function TransferenciaModal({ producto, onClose, dispatch, actor, theme }) {
  const [origenBodegaId, setOrigenBodegaId] = useState(BODEGAS[0].id);
  const [destinoBodegaId, setDestinoBodegaId] = useState(BODEGAS[1].id);
  const [cantidad, setCantidad] = useState(1);
  useEffect(() => { setOrigenBodegaId(BODEGAS[0].id); setDestinoBodegaId(BODEGAS[1].id); setCantidad(1); }, [producto]);
  if (!producto) return null;
  const submit = () => { dispatch({ type: "TRANSFERENCIA_INVENTARIO", payload: { productoId: producto.id, origenBodegaId, destinoBodegaId, cantidad: Number(cantidad) }, actor }); onClose(); };
  return (
    <Modal open={!!producto} onClose={onClose} theme={theme} title={`Transferencia entre bodegas — ${producto.nombre}`} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Transferir</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field theme={theme} label="Bodega origen"><select className={inputCls(theme)} value={origenBodegaId} onChange={(e) => setOrigenBodegaId(e.target.value)}>{BODEGAS.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({producto.stock[b.id] || 0})</option>)}</select></Field>
          <Field theme={theme} label="Bodega destino"><select className={inputCls(theme)} value={destinoBodegaId} onChange={(e) => setDestinoBodegaId(e.target.value)}>{BODEGAS.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></Field>
        </div>
        <Field theme={theme} label="Cantidad" required><input type="number" min={1} className={inputCls(theme)} value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function NuevoProductoModal({ open, onClose, dispatch, actor, theme }) {
  const [form, setForm] = useState({ codigo: "", nombre: "", categoria: "General", unidad: "Unidad", precio: 0, costoPromedio: 0, iva: 19, minimo: 10, tieneLote: false });
  useEffect(() => { if (open) setForm({ codigo: "", nombre: "", categoria: "General", unidad: "Unidad", precio: 0, costoPromedio: 0, iva: 19, minimo: 10, tieneLote: false }); }, [open]);
  const submit = () => { if (!form.codigo || !form.nombre) return; dispatch({ type: "CREAR_PRODUCTO", payload: { ...form, precio: Number(form.precio), costoPromedio: Number(form.costoPromedio), iva: Number(form.iva), minimo: Number(form.minimo) }, actor }); onClose(); };
  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Nuevo producto" footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Guardar producto</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field theme={theme} label="Codigo" required><input className={inputCls(theme)} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Field>
        <Field theme={theme} label="Unidad de medida"><input className={inputCls(theme)} value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></Field>
        <Field theme={theme} label="Nombre" required className="col-span-2"><input className={inputCls(theme)} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
        <Field theme={theme} label="Categoria"><input className={inputCls(theme)} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Field>
        <Field theme={theme} label="IVA %"><input type="number" className={inputCls(theme)} value={form.iva} onChange={(e) => setForm({ ...form, iva: e.target.value })} /></Field>
        <Field theme={theme} label="Precio de venta"><input type="number" className={inputCls(theme)} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} /></Field>
        <Field theme={theme} label="Costo inicial"><input type="number" className={inputCls(theme)} value={form.costoPromedio} onChange={(e) => setForm({ ...form, costoPromedio: e.target.value })} /></Field>
        <Field theme={theme} label="Stock minimo" className="col-span-2"><input type="number" className={inputCls(theme)} value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* Movimientos de tesoreria no atados a una factura (ingresos/egresos varios, transferencias) */
function registrarMovimientoTesoreriaManual(draft, actor, { cajaBancoId, tipo, concepto, monto, cuentaContrapartida, tercero }) {
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  const cb = draft.cajasBancos.find((c) => c.id === cajaBancoId);
  if (!cb) return { error: "Caja o banco no encontrado." };
  if (tipo === "egreso" && cb.saldo < monto) return { error: "Saldo insuficiente en la caja/banco seleccionado." };
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, tipo === "ingreso" ? "reciboCaja" : "egreso", tipo === "ingreso" ? "RC" : "CE");
  cb.saldo += tipo === "ingreso" ? monto : -monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId, tipo, concepto: `${numero} — ${concepto}`, monto, fecha });
  const cuentaCaja = cb.tipo === "caja" ? "1105" : "1110";
  const cCuenta = cuenta(cuentaContrapartida);
  const lineas = tipo === "ingreso"
    ? [{ cuenta: cuentaCaja, nombre: cuenta(cuentaCaja).nombre, tercero: tercero || "-", debito: monto, credito: 0 }, { cuenta: cuentaContrapartida, nombre: cCuenta?.nombre || cuentaContrapartida, tercero: tercero || "-", debito: 0, credito: monto }]
    : [{ cuenta: cuentaContrapartida, nombre: cCuenta?.nombre || cuentaContrapartida, tercero: tercero || "-", debito: monto, credito: 0 }, { cuenta: cuentaCaja, nombre: cuenta(cuentaCaja).nombre, tercero: tercero || "-", debito: 0, credito: monto }];
  crearComprobante(draft, { tipo: tipo === "ingreso" ? "Recibo de caja" : "Comprobante de egreso", fecha, origen: { tipo: "manual" }, glosa: concepto, lineas });
  pushAudit(draft, actor, tipo === "ingreso" ? "Registrar ingreso de tesoreria" : "Registrar egreso de tesoreria", `${numero} por ${fmtCOP(monto)} — ${concepto}`);
  return { numero };
}

function transferenciaTesoreria(draft, actor, { origenId, destinoId, monto }) {
  if (origenId === destinoId) return { error: "Selecciona cuentas de origen y destino diferentes." };
  const origen = draft.cajasBancos.find((c) => c.id === origenId);
  const destino = draft.cajasBancos.find((c) => c.id === destinoId);
  if (!origen || !destino) return { error: "Cuenta no encontrada." };
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  if (origen.saldo < monto) return { error: "Saldo insuficiente en la cuenta de origen." };
  const fecha = todayISO();
  origen.saldo -= monto; destino.saldo += monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId: origenId, tipo: "egreso", concepto: `Transferencia a ${destino.nombre}`, monto, fecha });
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId: destinoId, tipo: "ingreso", concepto: `Transferencia desde ${origen.nombre}`, monto, fecha });
  crearComprobante(draft, {
    tipo: "Transferencia entre cuentas", fecha, origen: { tipo: "transferencia" }, glosa: `Transferencia de ${origen.nombre} a ${destino.nombre}`,
    lineas: [{ cuenta: destino.tipo === "caja" ? "1105" : "1110", nombre: cuenta(destino.tipo === "caja" ? "1105" : "1110").nombre, tercero: "-", debito: monto, credito: 0 }, { cuenta: origen.tipo === "caja" ? "1105" : "1110", nombre: cuenta(origen.tipo === "caja" ? "1105" : "1110").nombre, tercero: "-", debito: 0, credito: monto }],
  });
  pushAudit(draft, actor, "Transferencia entre cuentas", `${fmtCOP(monto)} de ${origen.nombre} a ${destino.nombre}`);
  return { ok: true };
}

/* ============================================================================
   MODULO: TESORERIA Y BANCOS
   ============================================================================ */

function TesoreriaPage({ data, dispatch, actor, theme, role }) {
  const [movModal, setMovModal] = useState(null); // {tipo}
  const [transferModal, setTransferModal] = useState(false);
  const [filtroCuenta, setFiltroCuenta] = useState("__all__");

  const movColumns = [
    { key: "fecha", label: "Fecha", sortable: true, render: (m) => fmtDateTime(m.fecha) },
    { key: "cajaBancoId", label: "Cuenta", render: (m) => data.cajasBancos.find((c) => c.id === m.cajaBancoId)?.nombre },
    { key: "concepto", label: "Concepto" },
    { key: "tipo", label: "Tipo", render: (m) => <span className={cx("text-xs font-semibold px-2 py-1 rounded-full", m.tipo === "ingreso" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{m.tipo === "ingreso" ? "Ingreso" : "Egreso"}</span> },
    { key: "monto", label: "Monto", render: (m) => <span className={cx("nx-mono font-semibold", m.tipo === "ingreso" ? "text-emerald-600" : "text-red-600")}>{m.tipo === "ingreso" ? "+" : "-"}{fmtCOP(m.monto)}</span> },
  ];
  const rows = filtroCuenta === "__all__" ? data.movimientosTesoreria : data.movimientosTesoreria.filter((m) => m.cajaBancoId === filtroCuenta);

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Tesoreria y bancos"]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Tesoreria y bancos</h2><p className={cx("text-sm", theme.textMuted)}>Cajas, cuentas bancarias, movimientos y conciliacion manual.</p></div>
        {puedeEscribir(role) && (
          <div className="flex gap-2">
            <Btn theme={theme} variant="secondary" icon={ArrowLeftRight} onClick={() => setTransferModal(true)}>Transferencia</Btn>
            <Btn theme={theme} variant="secondary" icon={TrendingDown} onClick={() => setMovModal({ tipo: "egreso" })}>Registrar egreso</Btn>
            <Btn theme={theme} icon={TrendingUp} onClick={() => setMovModal({ tipo: "ingreso" })}>Registrar ingreso</Btn>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {data.cajasBancos.map((c) => (
          <div key={c.id} className={cx("rounded-xl border p-4", theme.surface, theme.border)}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cx("h-8 w-8 rounded-lg grid place-items-center", theme.surfaceAlt)}>{c.tipo === "caja" ? <Wallet size={15} /> : <Landmark size={15} />}</div>
              <div><p className={cx("text-xs font-semibold", theme.text)}>{c.nombre}</p><p className={cx("text-[11px]", theme.textMuted)}>{SEDES.find((s) => s.id === c.sedeId)?.nombre}</p></div>
            </div>
            <p className="nx-mono text-lg font-bold" style={{ color: BRAND.navy }}>{fmtCOP(c.saldo)}</p>
          </div>
        ))}
      </div>

      <Panel theme={theme} title="Movimientos de tesoreria" actions={
        <select className={cx("rounded-lg border px-2.5 py-1.5 text-xs outline-none", theme.input)} value={filtroCuenta} onChange={(e) => setFiltroCuenta(e.target.value)}>
          <option value="__all__">Todas las cuentas</option>
          {data.cajasBancos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      }>
        <DataTable theme={theme} rows={rows} columns={movColumns} searchKeys={["concepto"]} exportName="movimientos_tesoreria" pageSize={10} emptyTitle="Sin movimientos" />
      </Panel>

      <MovimientoManualModal modal={movModal} onClose={() => setMovModal(null)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
      <TransferenciaTesoreriaModal open={transferModal} onClose={() => setTransferModal(false)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
    </div>
  );
}

function MovimientoManualModal({ modal, onClose, theme, data, dispatch, actor }) {
  const tipo = modal?.tipo;
  const [cajaBancoId, setCajaBancoId] = useState(data.cajasBancos[0]?.id);
  const [monto, setMonto] = useState(0);
  const [concepto, setConcepto] = useState("");
  const [cuentaContrapartida, setCuentaContrapartida] = useState("4140");
  useEffect(() => { if (modal) { setCajaBancoId(data.cajasBancos[0]?.id); setMonto(0); setConcepto(""); setCuentaContrapartida(tipo === "ingreso" ? "4140" : "5195"); } }, [modal]);
  if (!modal) return null;
  const opciones = PLAN_CUENTAS.filter((c) => (tipo === "ingreso" ? ["Ingreso", "Activo", "Pasivo"] : ["Gasto", "Activo", "Pasivo", "Costo"]).includes(c.clase));
  const submit = () => { if (!concepto.trim() || !(Number(monto) > 0)) return; dispatch({ type: "MOVIMIENTO_TESORERIA", payload: { cajaBancoId, tipo, concepto, monto: Number(monto), cuentaContrapartida }, actor }); onClose(); };
  return (
    <Modal open={!!modal} onClose={onClose} theme={theme} title={tipo === "ingreso" ? "Registrar ingreso" : "Registrar egreso"} footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Guardar</Btn></>}>
      <div className="space-y-3">
        <Field theme={theme} label="Cuenta / caja"><select className={inputCls(theme)} value={cajaBancoId} onChange={(e) => setCajaBancoId(e.target.value)}>{data.cajasBancos.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {fmtCOP(c.saldo)}</option>)}</select></Field>
        <Field theme={theme} label="Concepto" required><input className={inputCls(theme)} value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={tipo === "ingreso" ? "Ej: anticipo de cliente" : "Ej: pago de servicios"} /></Field>
        <Field theme={theme} label="Monto" required><input type="number" className={inputCls(theme)} value={monto} onChange={(e) => setMonto(e.target.value)} /></Field>
        <Field theme={theme} label="Cuenta contable contrapartida"><select className={inputCls(theme)} value={cuentaContrapartida} onChange={(e) => setCuentaContrapartida(e.target.value)}>{opciones.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

function TransferenciaTesoreriaModal({ open, onClose, data, dispatch, actor, theme }) {
  const [origenId, setOrigenId] = useState(data.cajasBancos[0]?.id);
  const [destinoId, setDestinoId] = useState(data.cajasBancos[1]?.id);
  const [monto, setMonto] = useState(0);
  useEffect(() => { if (open) { setOrigenId(data.cajasBancos[0]?.id); setDestinoId(data.cajasBancos[1]?.id); setMonto(0); } }, [open]);
  const submit = () => { dispatch({ type: "TRANSFERENCIA_TESORERIA", payload: { origenId, destinoId, monto: Number(monto) }, actor }); onClose(); };
  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Transferencia entre cuentas" footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit}>Transferir</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field theme={theme} label="Origen"><select className={inputCls(theme)} value={origenId} onChange={(e) => setOrigenId(e.target.value)}>{data.cajasBancos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
          <Field theme={theme} label="Destino"><select className={inputCls(theme)} value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>{data.cajasBancos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
        </div>
        <Field theme={theme} label="Monto" required><input type="number" className={inputCls(theme)} value={monto} onChange={(e) => setMonto(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* ============================================================================
   MODULO: CARTERA (CxC) — incluye vista de CxP para contraste rapido
   ============================================================================ */

function CarteraPage({ data, dispatch, actor, theme, role }) {
  const [tipo, setTipo] = useState("cliente");
  const [reciboModal, setReciboModal] = useState(null);
  const [pagoModal, setPagoModal] = useState(null);
  const [estadoCuentaId, setEstadoCuentaId] = useState(null);

  const edades = useMemo(() => computeCarteraEdades(data, tipo), [data, tipo]);
  const edadesChart = Object.entries(edades).map(([bucket, valor]) => ({ bucket, valor: Math.round(valor) }));

  const terceros = tipo === "cliente" ? CLIENTES(data).filter((t) => t.saldoCartera > 0) : PROVEEDORES(data).filter((t) => t.saldoCxP > 0);
  const cols = [
    { key: "nombre", label: "Tercero", sortable: true },
    { key: "ciudad", label: "Ciudad" },
    { key: "saldo", label: "Saldo", sortable: true, render: (t) => <span className="nx-mono font-bold text-amber-600">{fmtCOP(tipo === "cliente" ? t.saldoCartera : t.saldoCxP)}</span> },
    { key: "docs", label: "Documentos abiertos", render: (t) => (tipo === "cliente" ? data.facturas.filter((f) => f.terceroId === t.id && f.saldo > 0).length : data.facturasCompra.filter((f) => f.proveedorId === t.id && f.saldo > 0).length) },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Cartera"]} />
      <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Cartera</h2><p className={cx("text-sm", theme.textMuted)}>Antiguedad de saldos, estado de cuenta y gestion de cobro/pago.</p></div>

      <div className={cx("inline-flex rounded-lg border p-1", theme.border)}>
        <button onClick={() => setTipo("cliente")} className={cx("px-3 py-1.5 rounded-md text-sm font-semibold", tipo === "cliente" ? "text-white" : theme.textMuted)} style={tipo === "cliente" ? { backgroundColor: BRAND.navy } : undefined}>Por cobrar (clientes)</button>
        <button onClick={() => setTipo("proveedor")} className={cx("px-3 py-1.5 rounded-md text-sm font-semibold", tipo === "proveedor" ? "text-white" : theme.textMuted)} style={tipo === "proveedor" ? { backgroundColor: BRAND.navy } : undefined}>Por pagar (proveedores)</button>
      </div>

      <Panel theme={theme} title="Antiguedad de saldos">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={edadesChart} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.dark ? "#334155" : "#e2e8f0"} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <YAxis type="category" dataKey="bucket" width={90} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => fmtCOP(v)} />
            <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
              {edadesChart.map((e, i) => <Cell key={i} fill={e.bucket === "Al dia" ? "#157F5A" : e.bucket === "+90 dias" ? "#C0392B" : BRAND.gold} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel theme={theme} title={tipo === "cliente" ? "Clientes con saldo pendiente" : "Proveedores con saldo pendiente"}>
        <DataTable theme={theme} rows={terceros} columns={cols} searchKeys={["nombre"]} exportName={tipo === "cliente" ? "cartera_clientes" : "cartera_proveedores"}
          emptyTitle="Sin saldos pendientes" onRowClick={(t) => setEstadoCuentaId(t.id)}
        />
      </Panel>

      <Modal open={!!estadoCuentaId} onClose={() => setEstadoCuentaId(null)} theme={theme} width="max-w-2xl" title="Estado de cuenta" footer={<Btn theme={theme} variant="secondary" onClick={() => setEstadoCuentaId(null)}>Cerrar</Btn>}>
        {estadoCuentaId && (() => {
          const t = data.terceros.find((x) => x.id === estadoCuentaId);
          const docs = tipo === "cliente" ? data.facturas.filter((f) => f.terceroId === t.id && f.saldo > 0) : data.facturasCompra.filter((f) => f.proveedorId === t.id && f.saldo > 0);
          return (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div><p className={cx("font-bold", theme.text)}>{t.nombre}</p><p className={cx("text-xs", theme.textMuted)}>{t.tipoDoc} {t.numDoc}</p></div>
                <p className="nx-mono font-bold text-lg text-amber-600">{fmtCOP(tipo === "cliente" ? t.saldoCartera : t.saldoCxP)}</p>
              </div>
              <div className="space-y-1.5">
                {docs.map((f) => (
                  <div key={f.id} className={cx("flex items-center justify-between rounded-lg px-3 py-2 text-xs", theme.surfaceAlt)}>
                    <span className="nx-mono font-semibold">{f.numero}</span>
                    <span className={theme.textMuted}>Vence {fmtDate(f.vencimiento)}</span>
                    <span className="nx-mono">{fmtCOP(f.saldo)}</span>
                    {puedeEscribir(role) && (tipo === "cliente" ? <Btn theme={theme} size="sm" variant="subtle" onClick={() => { setEstadoCuentaId(null); setReciboModal(f); }}>Recibir</Btn> : <Btn theme={theme} size="sm" variant="subtle" onClick={() => { setEstadoCuentaId(null); setPagoModal(f); }}>Pagar</Btn>)}
                  </div>
                ))}
                {docs.length === 0 && <p className={cx("text-xs", theme.textMuted)}>Sin documentos abiertos.</p>}
              </div>
            </div>
          );
        })()}
      </Modal>

      <RegistrarReciboModal factura={reciboModal} onClose={() => setReciboModal(null)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
      <PagarFacturaCompraModal factura={pagoModal} onClose={() => setPagoModal(null)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
    </div>
  );
}

/* ============================================================================
   MODULO: CONTABILIDAD
   ============================================================================ */

function ContabilidadPage({ data, dispatch, actor, theme, role }) {
  const [tab, setTab] = useState("comprobantes");
  const [showNewComp, setShowNewComp] = useState(false);
  const bp = useMemo(() => computeBalancePrueba(data), [data]);
  const pyg = useMemo(() => computeEstadoResultados(data), [data]);
  const bg = useMemo(() => computeBalanceGeneral(data), [data]);

  const cuentasCols = [
    { key: "codigo", label: "Codigo", sortable: true, render: (c) => <span className="nx-mono font-semibold">{c.codigo}</span> },
    { key: "nombre", label: "Nombre" },
    { key: "clase", label: "Clase", render: (c) => <span className={cx("text-xs font-semibold px-2 py-1 rounded-full", theme.surfaceAlt)}>{c.clase}</span> },
    { key: "naturaleza", label: "Naturaleza" },
  ];
  const compCols = [
    { key: "numero", label: "Comprobante", render: (c) => <span className="nx-mono font-semibold">{c.numero}</span> },
    { key: "tipo", label: "Tipo" },
    { key: "fecha", label: "Fecha", sortable: true, render: (c) => fmtDateTime(c.fecha) },
    { key: "glosa", label: "Glosa" },
    { key: "totalDebito", label: "Debito", render: (c) => <span className="nx-mono">{fmtCOP(c.totalDebito)}</span> },
    { key: "totalCredito", label: "Credito", render: (c) => <span className="nx-mono">{fmtCOP(c.totalCredito)}</span> },
    { key: "balanceado", label: "Cuadre", render: (c) => c.balanceado ? <Badge estado="pagada">Cuadrado</Badge> : <Badge estado="vencida">Descuadrado</Badge> },
  ];
  const bpCols = [
    { key: "codigo", label: "Cuenta", render: (c) => <span className="nx-mono font-semibold">{c.codigo} {c.nombre}</span> },
    { key: "clase", label: "Clase" },
    { key: "debito", label: "Debitos", render: (c) => <span className="nx-mono">{fmtCOP(c.debito)}</span> },
    { key: "credito", label: "Creditos", render: (c) => <span className="nx-mono">{fmtCOP(c.credito)}</span> },
    { key: "saldo", label: "Saldo", render: (c) => <span className="nx-mono font-bold">{fmtCOP(c.saldo)}</span> },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Contabilidad"]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Contabilidad</h2><p className={cx("text-sm", theme.textMuted)}>Comprobantes automaticos y manuales, con partida doble validada.</p></div>
        {puedeEscribir(role) && <Btn theme={theme} icon={Plus} onClick={() => setShowNewComp(true)}>Nuevo comprobante</Btn>}
      </div>
      <div className={cx("flex gap-1 border-b overflow-x-auto", theme.border)}>
        {[{ key: "comprobantes", label: "Comprobantes" }, { key: "plan", label: "Plan de cuentas" }, { key: "balanceprueba", label: "Balance de prueba" }, { key: "pyg", label: "Estado de resultados" }, { key: "balancegeneral", label: "Balance general" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cx("px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px", tab === t.key ? "border-amber-500" : "border-transparent " + theme.textMuted)} style={tab === t.key ? { color: BRAND.navy } : undefined}>{t.label}</button>
        ))}
      </div>

      {tab === "comprobantes" && <Panel theme={theme}><DataTable theme={theme} rows={data.comprobantes.slice().reverse()} columns={compCols} searchKeys={["numero", "glosa", "tipo"]} exportName="comprobantes" pageSize={10}
        filters={[{ key: "tipo", label: "Tipo", options: uniq(data.comprobantes.map((c) => c.tipo)).map((t) => ({ value: t, label: t })) }]} emptyTitle="Sin comprobantes" /></Panel>}

      {tab === "plan" && <Panel theme={theme}><DataTable theme={theme} rows={PLAN_CUENTAS.filter((c, i, arr) => arr.findIndex((x) => x.codigo === c.codigo) === i)} columns={cuentasCols} searchKeys={["codigo", "nombre"]} exportName="plan_cuentas"
        filters={[{ key: "clase", label: "Clase", options: uniq(PLAN_CUENTAS.map((c) => c.clase)).map((c) => ({ value: c, label: c })) }]} /></Panel>}

      {tab === "balanceprueba" && <Panel theme={theme} title="Balance de prueba" subtitle="Sumas y saldos por cuenta, calculados a partir de todos los comprobantes."><DataTable theme={theme} rows={bp} columns={bpCols} searchKeys={["codigo", "nombre"]} exportName="balance_prueba" pageSize={12} /></Panel>}

      {tab === "pyg" && (
        <Panel theme={theme} title="Estado de resultados" subtitle="Periodo acumulado del ejercicio">
          <div className="max-w-md space-y-2 text-sm">
            <Row label="Ingresos operacionales" value={pyg.ingresos} theme={theme} />
            <Row label="Costo de venta" value={-pyg.costos} theme={theme} />
            <Row label="Utilidad bruta" value={pyg.utilidadBruta} bold theme={theme} />
            {pyg.gastosDetalle.map((g) => <Row key={g.codigo} label={g.nombre} value={-g.saldo} sub theme={theme} />)}
            <Row label="Total gastos operacionales" value={-pyg.gastos} theme={theme} />
            <div className={cx("flex justify-between pt-2 border-t-2 font-bold text-base", theme.border)}><span>Utilidad neta</span><span className={cx("nx-mono", pyg.utilidadNeta >= 0 ? "text-emerald-500" : "text-red-500")}>{fmtCOP(pyg.utilidadNeta)}</span></div>
          </div>
        </Panel>
      )}

      {tab === "balancegeneral" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Panel theme={theme} title="Activo">
            {bg.activos.map((a) => <Row key={a.codigo} label={`${a.codigo} ${a.nombre}`} value={a.saldo} theme={theme} />)}
            <div className={cx("flex justify-between pt-2 border-t-2 font-bold", theme.border)}><span>Total activo</span><span className="nx-mono">{fmtCOP(bg.totalActivos)}</span></div>
          </Panel>
          <Panel theme={theme} title="Pasivo + Patrimonio">
            {bg.pasivos.map((a) => <Row key={a.codigo} label={`${a.codigo} ${a.nombre}`} value={a.saldo} theme={theme} />)}
            <div className={cx("flex justify-between font-semibold text-xs pt-1", theme.textMuted)}><span>Total pasivo</span><span className="nx-mono">{fmtCOP(bg.totalPasivos)}</span></div>
            <div className="h-2" />
            {bg.patrimonio.map((a) => <Row key={a.codigo} label={`${a.codigo} ${a.nombre}`} value={a.saldo} theme={theme} />)}
            <Row label="Utilidad del ejercicio" value={bg.utilidadNeta} theme={theme} />
            <div className={cx("flex justify-between pt-2 border-t-2 font-bold", theme.border)}><span>Total pasivo + patrimonio</span><span className="nx-mono">{fmtCOP(bg.totalPasivos + bg.totalPatrimonio)}</span></div>
            <div className={cx("mt-3 text-xs rounded-lg p-2.5 flex items-center gap-2", bg.cuadra ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{bg.cuadra ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {bg.cuadra ? "El balance cuadra (Activo = Pasivo + Patrimonio)." : "El balance no cuadra — revisa los comprobantes manuales."}</div>
          </Panel>
        </div>
      )}

      <NuevoComprobanteModal open={showNewComp} onClose={() => setShowNewComp(false)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
    </div>
  );
}
function Row({ label, value, theme, bold, sub }) {
  return <div className={cx("flex justify-between", bold && "font-bold", sub && "text-xs pl-3")}><span className={sub ? theme.textMuted : theme.text}>{label}</span><span className="nx-mono">{fmtCOP(value)}</span></div>;
}

function NuevoComprobanteModal({ open, onClose, data, dispatch, actor, theme }) {
  const [tipo, setTipo] = useState("Comprobante manual");
  const [glosa, setGlosa] = useState("");
  const [lineas, setLineas] = useState([{ cuenta: "5195", debito: 0, credito: 0, tercero: "" }, { cuenta: "1110", debito: 0, credito: 0, tercero: "" }]);
  useEffect(() => { if (open) { setTipo("Comprobante manual"); setGlosa(""); setLineas([{ cuenta: "5195", debito: 0, credito: 0, tercero: "" }, { cuenta: "1110", debito: 0, credito: 0, tercero: "" }]); } }, [open]);
  const totalD = lineas.reduce((s, l) => s + (Number(l.debito) || 0), 0);
  const totalC = lineas.reduce((s, l) => s + (Number(l.credito) || 0), 0);
  const cuadra = Math.abs(totalD - totalC) < 1 && totalD > 0;
  const updateLinea = (i, patch) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const submit = () => {
    if (!glosa.trim() || !cuadra) return;
    dispatch({ type: "COMPROBANTE_MANUAL", payload: { tipo, fecha: todayISO(), glosa, lineas: lineas.map((l) => ({ ...l, nombre: cuenta(l.cuenta)?.nombre, debito: Number(l.debito) || 0, credito: Number(l.credito) || 0 })) }, actor });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Nuevo comprobante contable" width="max-w-2xl" footer={<><Btn theme={theme} variant="secondary" onClick={onClose}>Cancelar</Btn><Btn theme={theme} onClick={submit} disabled={!cuadra || !glosa.trim()}>Contabilizar</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field theme={theme} label="Tipo de comprobante"><input className={inputCls(theme)} value={tipo} onChange={(e) => setTipo(e.target.value)} /></Field>
          <Field theme={theme} label="Glosa" required><input className={inputCls(theme)} value={glosa} onChange={(e) => setGlosa(e.target.value)} /></Field>
        </div>
        <div className="space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_90px_28px] gap-1.5 items-center">
              <select className={cx(inputCls(theme), "py-1.5")} value={l.cuenta} onChange={(e) => updateLinea(i, { cuenta: e.target.value })}>{PLAN_CUENTAS.filter((c, idx, arr) => arr.findIndex((x) => x.codigo === c.codigo) === idx).map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo} {c.nombre}</option>)}</select>
              <input type="number" placeholder="Debito" className={cx(inputCls(theme), "py-1.5 nx-mono")} value={l.debito} onChange={(e) => updateLinea(i, { debito: e.target.value, credito: 0 })} />
              <input type="number" placeholder="Credito" className={cx(inputCls(theme), "py-1.5 nx-mono")} value={l.credito} onChange={(e) => updateLinea(i, { credito: e.target.value, debito: 0 })} />
              <button onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))}><Trash2 size={13} className="text-red-500" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setLineas((ls) => [...ls, { cuenta: "1110", debito: 0, credito: 0, tercero: "" }])} className={cx("text-xs font-semibold flex items-center gap-1", theme.textMuted)}><Plus size={13} /> Agregar linea</button>
        <div className={cx("flex justify-between text-xs rounded-lg p-2.5", cuadra ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
          <span>Debitos: {fmtCOP(totalD)} · Creditos: {fmtCOP(totalC)}</span><span className="font-bold">{cuadra ? "Cuadrado" : "Descuadrado"}</span>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================================
   MODULO: PUNTO DE VENTA (POS) — funcional en carrito/busqueda, checkout simulado
   ============================================================================ */

function POSPage({ data, theme, role }) {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [clienteId, setClienteId] = useState(data.terceros.find((t) => t.tipo === "cliente")?.id);
  const [toast, setToast] = useState(false);
  const productos = data.productos.filter((p) => p.categoria !== "Servicios" && (p.nombre.toLowerCase().includes(q.toLowerCase()) || p.codigo.toLowerCase().includes(q.toLowerCase())));
  const add = (p) => setCart((c) => { const ex = c.find((i) => i.id === p.id); return ex ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { ...p, qty: 1 }]; });
  const total = cart.reduce((s, i) => s + i.qty * i.precio * 1.19, 0);

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Punto de venta"]} />
      <div className={cx("rounded-lg p-3 text-xs flex items-center gap-2 bg-amber-50 text-amber-700")}><AlertTriangle size={14} /> Modulo simulado: el carrito y la busqueda son funcionales; el cobro final no contabiliza ni descuenta inventario en este MVP (pendiente de integrar con pasarela de pago y modo offline).</div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className={cx("flex items-center gap-2 rounded-lg border px-3 py-2", theme.input)}><ScanLine size={16} className={theme.textFaint} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar o escanear codigo de barras..." className="bg-transparent outline-none text-sm w-full" /></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {productos.map((p) => (
              <button key={p.id} onClick={() => add(p)} className={cx("rounded-xl border p-3 text-left hover:shadow-md transition-shadow", theme.surface, theme.border)}>
                <p className={cx("text-xs font-semibold line-clamp-2 mb-1", theme.text)}>{p.nombre}</p>
                <p className="nx-mono text-sm font-bold" style={{ color: BRAND.navy }}>{fmtCOP(p.precio)}</p>
              </button>
            ))}
          </div>
        </div>
        <Panel theme={theme} title="Venta actual">
          <select className={cx(inputCls(theme), "mb-3")} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>{CLIENTES(data).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
          <div className="space-y-1.5 max-h-64 overflow-y-auto nx-scroll mb-3">
            {cart.length === 0 ? <EmptyState theme={theme} icon={Store} title="Carrito vacio" /> : cart.map((i) => (
              <div key={i.id} className={cx("flex items-center justify-between text-xs rounded-lg px-2.5 py-2", theme.surfaceAlt)}>
                <span>{i.nombre} x{i.qty}</span><span className="nx-mono">{fmtCOP(i.qty * i.precio * 1.19)}</span>
              </div>
            ))}
          </div>
          <div className={cx("flex justify-between font-bold border-t pt-2 mb-3", theme.border)}><span>Total</span><span className="nx-mono">{fmtCOP(total)}</span></div>
          <Btn theme={theme} className="w-full" disabled={cart.length === 0} onClick={() => { setToast(true); setCart([]); setTimeout(() => setToast(false), 3000); }}>Cobrar (simulado)</Btn>
          {toast && <p className="text-xs text-emerald-600 mt-2 text-center">Venta simulada registrada. En produccion generaria factura POS y descuento de inventario automatico.</p>}
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================================
   MODULO: NOMINA Y TALENTO HUMANO (calculo simplificado, no certificado)
   ============================================================================ */

function NominaPage({ data, theme }) {
  const [empleadoId, setEmpleadoId] = useState(null);
  const cols = [
    { key: "nombre", label: "Empleado", sortable: true },
    { key: "cargo", label: "Cargo" },
    { key: "areaId", label: "Area" },
    { key: "sedeId", label: "Sede", render: (e) => SEDES.find((s) => s.id === e.sedeId)?.nombre },
    { key: "tipoContrato", label: "Contrato" },
    { key: "salario", label: "Salario base", render: (e) => <span className="nx-mono">{fmtCOP(e.salario)}</span> },
  ];
  const liquidacion = (e) => {
    const salud = e.salario * 0.04, pension = e.salario * 0.04, fsp = e.salario > 4 * 1300000 ? e.salario * 0.01 : 0;
    const netoDevengado = e.salario - salud - pension - fsp;
    const auxTransporte = e.salario <= 2 * 1300000 ? 200000 : 0;
    return { salud, pension, fsp, auxTransporte, netoDevengado: netoDevengado + auxTransporte };
  };
  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Nomina y talento humano"]} />
      <div className={cx("rounded-lg p-3 text-xs flex items-center gap-2 bg-blue-50 text-blue-700")}><AlertTriangle size={14} /> Modulo parcial: el calculo de nomina mostrado es una simplificacion educativa (salud, pension, auxilio de transporte) y no reemplaza un motor de liquidacion certificado ni la nomina electronica DIAN.</div>
      <Panel theme={theme} title="Empleados">
        <DataTable theme={theme} rows={data.empleados} columns={cols} searchKeys={["nombre", "cargo"]} exportName="empleados" onRowClick={(e) => setEmpleadoId(e.id)} />
      </Panel>
      <Modal open={!!empleadoId} onClose={() => setEmpleadoId(null)} theme={theme} title="Vista previa de liquidacion (simplificada)" footer={<Btn theme={theme} variant="secondary" onClick={() => setEmpleadoId(null)}>Cerrar</Btn>}>
        {empleadoId && (() => {
          const e = data.empleados.find((x) => x.id === empleadoId);
          const l = liquidacion(e);
          return (
            <div className="space-y-2 text-sm">
              <p className={cx("font-bold", theme.text)}>{e.nombre} — {e.cargo}</p>
              <Row theme={theme} label="Salario base" value={e.salario} />
              <Row theme={theme} label="Auxilio de transporte" value={l.auxTransporte} />
              <Row theme={theme} label="Salud (4%)" value={-l.salud} />
              <Row theme={theme} label="Pension (4%)" value={-l.pension} />
              {l.fsp > 0 && <Row theme={theme} label="Fondo solidaridad pensional (1%)" value={-l.fsp} />}
              <div className={cx("flex justify-between font-bold pt-2 border-t", theme.border)}><span>Neto a pagar (estimado)</span><span className="nx-mono">{fmtCOP(l.netoDevengado)}</span></div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

/* ============================================================================
   MODULO: IMPUESTOS Y FACTURACION ELECTRONICA DIAN (sandbox, sin conexion real)
   ============================================================================ */

function ImpuestosPage({ data, dispatch, actor, theme, role }) {
  const cols = [
    { key: "numero", label: "Factura", render: (f) => <span className="nx-mono font-semibold">{f.numero}</span> },
    { key: "fecha", label: "Fecha", render: (f) => fmtDate(f.fecha) },
    { key: "total", label: "Total", render: (f) => <span className="nx-mono">{fmtCOP(f.total)}</span> },
    { key: "estadoDian", label: "Estado DIAN (sandbox)", render: (f) => <Badge estado={f.estadoDian} /> },
    { key: "cufe", label: "CUFE simulado", render: (f) => f.cufe ? <span className="nx-mono text-[10px]">{f.cufe.slice(0, 22)}...</span> : "—" },
  ];
  const porEstado = (estado) => data.facturas.filter((f) => f.estadoDian === estado).length;
  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Impuestos y DIAN"]} />
      <div className={cx("rounded-lg p-3 text-xs flex items-start gap-2 bg-amber-50 text-amber-700")}><AlertOctagon size={15} className="mt-0.5 shrink-0" /><span><b>Importante:</b> este panel simula el ciclo de vida de un documento electronico (borrador → en validacion → aceptado/rechazado/contingencia → anulado). No existe conexion real con la DIAN: se requiere un proveedor tecnologico autorizado, certificado digital y credenciales de habilitacion para emitir documentos con validez tributaria.</span></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard theme={theme} label="Aceptados" value={porEstado("aceptado")} icon={BadgeCheck} tone="good" />
        <KPICard theme={theme} label="En validacion / borrador" value={porEstado("en_validacion") + porEstado("borrador")} icon={Clock} tone="warn" />
        <KPICard theme={theme} label="Contingencia" value={porEstado("contingencia")} icon={AlertTriangle} tone="warn" />
        <KPICard theme={theme} label="Rechazados" value={porEstado("rechazado")} icon={BadgeX} tone="bad" />
      </div>

      <Panel theme={theme} title="Adaptador de facturacion electronica" subtitle="Arquitectura desacoplada: intercambiable por cualquier proveedor tecnologico habilitado.">
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          {["Cola de envio y reintentos", "Almacenamiento de XML / PDF / CUFE", "Panel de errores y trazabilidad"].map((f) => (
            <div key={f} className={cx("rounded-lg p-3 flex items-center gap-2", theme.surfaceAlt)}><ListChecks size={14} className="text-emerald-500 shrink-0" /><span className={theme.text}>{f}</span></div>
          ))}
        </div>
      </Panel>

      <Panel theme={theme} title="Documentos electronicos (facturas de venta)">
        <DataTable theme={theme} rows={data.facturas} columns={cols} searchKeys={["numero"]} exportName="documentos_dian"
          filters={[{ key: "estadoDian", label: "Estado", options: ["borrador", "en_validacion", "aceptado", "contingencia", "rechazado", "anulado"].map((e) => ({ value: e, label: ESTADOS[e]?.label || e })) }]}
          rowActions={(f) => f.estado !== "anulada" && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="secondary" icon={RefreshCw} onClick={() => dispatch({ type: "SIMULAR_DIAN", payload: { id: f.id }, actor })}>Simular respuesta</Btn>}
        />
      </Panel>
    </div>
  );
}

/* ============================================================================
   MODULO: REPORTES
   ============================================================================ */

function ReportesPage({ data, theme, role }) {
  const bp = useMemo(() => computeBalancePrueba(data), [data]);
  const pyg = useMemo(() => computeEstadoResultados(data), [data]);
  const edadesCliente = useMemo(() => computeCarteraEdades(data, "cliente"), [data]);

  const reportesFuncionales = [
    { key: "ventas_periodo", label: "Ventas por periodo, cliente y producto", icon: Receipt, run: () => exportExcel("ventas_por_periodo", data.facturas.filter((f) => f.estado !== "anulada").map((f) => ({ numero: f.numero, fecha: f.fecha.slice(0, 10), cliente: data.terceros.find((t) => t.id === f.terceroId)?.nombre, total: f.total, estado: f.estado }))) },
    { key: "cartera_edades", label: "Cartera por edades", icon: Wallet2, run: () => exportExcel("cartera_por_edades", Object.entries(edadesCliente).map(([bucket, valor]) => ({ bucket, valor }))) },
    { key: "cxp", label: "Cuentas por pagar", icon: Landmark, run: () => exportExcel("cuentas_por_pagar", data.facturasCompra.map((f) => ({ numero: f.numero, proveedor: data.terceros.find((t) => t.id === f.proveedorId)?.nombre, vencimiento: f.vencimiento.slice(0, 10), saldo: f.saldo, estado: f.estado }))) },
    { key: "inventario", label: "Inventario disponible y valorizado", icon: Boxes, run: () => exportExcel("inventario", data.productos.map((p) => ({ codigo: p.codigo, nombre: p.nombre, stock_total: Object.values(p.stock || {}).reduce((a, b) => a + b, 0), costo_promedio: p.costoPromedio, valorizado: Object.values(p.stock || {}).reduce((a, b) => a + b, 0) * p.costoPromedio }))) },
    { key: "kardex_full", label: "Kardex general", icon: History, run: () => exportExcel("kardex_general", data.movimientosInventario.map((m) => ({ fecha: m.fecha.slice(0, 10), producto: data.productos.find((p) => p.id === m.productoId)?.nombre, bodega: BODEGAS.find((b) => b.id === m.bodegaId)?.nombre, tipo: m.tipo, cantidad: m.cantidad, saldo: m.saldoResultante }))) },
    { key: "compras_proveedor", label: "Compras por proveedor y producto", icon: ShoppingCart, run: () => exportExcel("compras_por_proveedor", data.facturasCompra.map((f) => ({ numero: f.numero, proveedor: data.terceros.find((t) => t.id === f.proveedorId)?.nombre, fecha: f.fecha.slice(0, 10), total: f.total }))) },
    { key: "balance_prueba", label: "Balance de prueba", icon: Scale, run: () => exportExcel("balance_prueba", bp.map((c) => ({ cuenta: `${c.codigo} ${c.nombre}`, clase: c.clase, debito: c.debito, credito: c.credito, saldo: c.saldo }))) },
    { key: "estado_resultados", label: "Estado de resultados", icon: BarChart3, run: () => exportExcel("estado_resultados", [{ concepto: "Ingresos", valor: pyg.ingresos }, { concepto: "Costo de venta", valor: pyg.costos }, { concepto: "Utilidad bruta", valor: pyg.utilidadBruta }, { concepto: "Gastos operacionales", valor: pyg.gastos }, { concepto: "Utilidad neta", valor: pyg.utilidadNeta }]) },
    { key: "auditoria", label: "Actividad de usuarios (auditoria)", icon: History, run: () => exportExcel("actividad_usuarios", data.auditLog.map((a) => ({ fecha: a.fecha.slice(0, 19), usuario: a.usuario, rol: a.rol, accion: a.accion, detalle: a.detalle }))) },
  ];
  const pendientes = ["Rentabilidad y margen detallado por producto", "Rotacion de inventario", "Comisiones de vendedores", "Nomina, provisiones y pagos detallado", "Reportes tributarios (medios magneticos, libros fiscales)", "Reportes gerenciales configurables"];

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Reportes"]} />
      <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Centro de reportes</h2><p className={cx("text-sm", theme.textMuted)}>Exportacion a Excel real (SheetJS). La vista de impresion / PDF esta disponible desde cada documento (ej. facturas).</p></div>
      <Panel theme={theme} title="Reportes disponibles">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reportesFuncionales.map((r) => (
            <button key={r.key} onClick={r.run} className={cx("flex items-center gap-3 rounded-xl border p-3 text-left hover:shadow-md transition-shadow", theme.surface, theme.border)}>
              <div className={cx("h-9 w-9 rounded-lg grid place-items-center shrink-0", theme.surfaceAlt)}><r.icon size={16} style={{ color: BRAND.navy }} /></div>
              <div className="flex-1"><p className={cx("text-xs font-semibold", theme.text)}>{r.label}</p><p className={cx("text-[11px]", theme.textMuted)}>Exportar a Excel</p></div>
              <Download size={14} className={theme.textFaint} />
            </button>
          ))}
        </div>
      </Panel>
      <Panel theme={theme} title="Proximamente" subtitle="Reportes planeados que aun no estan implementados en este MVP.">
        <div className="grid sm:grid-cols-2 gap-2">
          {pendientes.map((p) => <div key={p} className={cx("flex items-center gap-2 text-xs rounded-lg p-2.5", theme.surfaceAlt, theme.textMuted)}><Clock size={13} /> {p}</div>)}
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================================
   MODULO: AUDITORIA
   ============================================================================ */

function AuditoriaPage({ data, theme }) {
  const cols = [
    { key: "fecha", label: "Fecha y hora", sortable: true, render: (a) => fmtDateTime(a.fecha) },
    { key: "usuario", label: "Usuario" },
    { key: "rol", label: "Rol", render: (a) => ROLES.find((r) => r.id === a.rol)?.nombre || a.rol },
    { key: "accion", label: "Accion" },
    { key: "detalle", label: "Detalle" },
  ];
  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Auditoria"]} />
      <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Bitacora de auditoria</h2><p className={cx("text-sm", theme.textMuted)}>Registro inmutable de acciones sensibles: usuario, fecha, rol y detalle de cada operacion.</p></div>
      <Panel theme={theme}><DataTable theme={theme} rows={data.auditLog} columns={cols} searchKeys={["usuario", "accion", "detalle"]} exportName="auditoria" pageSize={12} /></Panel>
    </div>
  );
}

/* ============================================================================
   MODULO: VISTA MOVIL / PWA (simulacion de experiencia adaptada a campo)
   ============================================================================ */

function MovilPage({ data, dispatch, actor, theme, role, setPrint }) {
  const [screen, setScreen] = useState("inicio");
  const [showCot, setShowCot] = useState(false);
  const [reciboModal, setReciboModal] = useState(null);
  const kpis = useMemo(() => computeKPIs(data), [data]);
  const pendientesAprobacion = data.cotizaciones.filter((c) => c.estado === "borrador").slice(0, 5);
  const facturasPendientes = data.facturas.filter((f) => f.estado === "pendiente" || f.estado === "parcial").slice(0, 6);

  const navItems = [
    { key: "inicio", label: "Inicio", icon: LayoutDashboard },
    { key: "venta", label: "Venta rapida", icon: Receipt },
    { key: "cartera", label: "Cartera", icon: Wallet2 },
    { key: "inventario", label: "Inventario", icon: Boxes },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Vista movil / PWA"]} />
      <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Experiencia movil / PWA</h2><p className={cx("text-sm", theme.textMuted)}>Simulacion de la app en campo: consulta, aprobaciones y captura rapida — no una copia reducida del escritorio.</p></div>

      <div className="flex justify-center">
        <div className={cx("w-[360px] rounded-[2rem] border-8 overflow-hidden shadow-2xl", theme.dark ? "border-slate-800" : "border-slate-900")}>
          <div style={{ backgroundColor: BRAND.navy }} className="h-11 flex items-center justify-center relative"><span className="text-white text-xs font-semibold">Lunaris</span><div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-1.5 w-16 rounded-full bg-black/30" /></div>
          <div className={cx("h-[560px] overflow-y-auto nx-scroll p-3", theme.bg)}>
            {screen === "inicio" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className={cx("rounded-xl p-3", theme.surface)}><p className={cx("text-[10px]", theme.textMuted)}>Ventas hoy</p><p className="nx-mono font-bold text-sm">{fmtCOP(kpis.ventasDia)}</p></div>
                  <div className={cx("rounded-xl p-3", theme.surface)}><p className={cx("text-[10px]", theme.textMuted)}>Cartera vencida</p><p className="nx-mono font-bold text-sm text-red-500">{fmtCOP(kpis.facVencida)}</p></div>
                </div>
                <p className={cx("text-[11px] font-bold uppercase", theme.textMuted)}>Aprobaciones pendientes</p>
                {pendientesAprobacion.length === 0 && <p className={cx("text-xs", theme.textMuted)}>Sin cotizaciones por aprobar.</p>}
                {pendientesAprobacion.map((c) => (
                  <div key={c.id} className={cx("rounded-xl p-2.5 flex items-center justify-between", theme.surface)}>
                    <div><p className="text-xs font-semibold nx-mono">{c.numero}</p><p className={cx("text-[10px]", theme.textMuted)}>{fmtCOP(c.total)}</p></div>
                    {puedeAprobar(role) && <button onClick={() => dispatch({ type: "APROBAR_COTIZACION", payload: { id: c.id }, actor })} className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Aprobar</button>}
                  </div>
                ))}
              </div>
            )}
            {screen === "venta" && (
              <div className="space-y-3">
                <Btn theme={theme} className="w-full" icon={Plus} onClick={() => setShowCot(true)}>Nueva cotizacion rapida</Btn>
                <p className={cx("text-[11px] font-bold uppercase", theme.textMuted)}>Ultimas cotizaciones</p>
                {data.cotizaciones.slice(0, 6).map((c) => (
                  <div key={c.id} className={cx("rounded-xl p-2.5 flex items-center justify-between", theme.surface)}><span className="text-xs nx-mono">{c.numero}</span><Badge estado={c.estado} /></div>
                ))}
              </div>
            )}
            {screen === "cartera" && (
              <div className="space-y-2">
                <p className={cx("text-[11px] font-bold uppercase", theme.textMuted)}>Facturas por cobrar</p>
                {facturasPendientes.map((f) => (
                  <div key={f.id} className={cx("rounded-xl p-2.5", theme.surface)}>
                    <div className="flex justify-between text-xs"><span className="nx-mono font-semibold">{f.numero}</span><span className="nx-mono">{fmtCOP(f.saldo)}</span></div>
                    <div className="flex justify-between items-center mt-1"><span className={cx("text-[10px]", theme.textMuted)}>{data.terceros.find((t) => t.id === f.terceroId)?.nombre}</span>{puedeEscribir(role) && <button onClick={() => setReciboModal(f)} className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: BRAND.gold, color: BRAND.navyDark }}>Recaudar</button>}</div>
                  </div>
                ))}
              </div>
            )}
            {screen === "inventario" && (
              <div className="space-y-2">
                <p className={cx("text-[11px] font-bold uppercase", theme.textMuted)}>Existencias (todas las bodegas)</p>
                {data.productos.filter((p) => p.categoria !== "Servicios").slice(0, 8).map((p) => (
                  <div key={p.id} className={cx("rounded-xl p-2.5 flex justify-between items-center", theme.surface)}>
                    <span className="text-xs">{p.nombre}</span>
                    <span className={cx("nx-mono text-xs font-bold", p.minimo > 0 && Object.values(p.stock).reduce((a, b) => a + b, 0) <= p.minimo && "text-red-500")}>{Object.values(p.stock).reduce((a, b) => a + b, 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={cx("h-16 flex items-center justify-around border-t", theme.surface, theme.border)}>
            {navItems.map((n) => (
              <button key={n.key} onClick={() => setScreen(n.key)} className="flex flex-col items-center gap-0.5">
                <n.icon size={18} color={screen === n.key ? BRAND.gold : (theme.dark ? "#64748b" : "#94a3b8")} />
                <span className={cx("text-[9px] font-semibold", screen === n.key ? "" : theme.textFaint)} style={screen === n.key ? { color: BRAND.gold } : undefined}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className={cx("text-xs text-center max-w-md mx-auto", theme.textMuted)}>Cola de sincronizacion offline, camara para escaneo y notificaciones push son funciones planeadas para la version PWA instalable (fuera del alcance de este MVP en artifact).</p>

      <NuevaCotizacionModal open={showCot} onClose={() => setShowCot(false)} data={data} dispatch={dispatch} actor={actor} theme={theme} sedeActiva={SEDES[0].id} />
      <RegistrarReciboModal factura={reciboModal} onClose={() => setReciboModal(null)} data={data} dispatch={dispatch} actor={actor} theme={theme} />
    </div>
  );
}

/* ============================================================================
   MODULO: INTEGRACIONES
   ============================================================================ */

function IntegracionesPage({ theme }) {
  const items = [
    { nombre: "DIAN — facturacion electronica", icon: BadgeCheck, detalle: "Requiere proveedor tecnologico autorizado, certificado digital y credenciales de habilitacion." },
    { nombre: "Bancos y extractos", icon: Landmark, detalle: "Conciliacion automatica via archivo o API bancaria." },
    { nombre: "Pasarela de pago", icon: CreditCard, detalle: "Cobro en linea de facturas y POS." },
    { nombre: "WhatsApp Business", icon: Smartphone, detalle: "Envio de facturas y recordatorios de cartera." },
    { nombre: "Tiendas virtuales / marketplaces", icon: Store, detalle: "Sincronizacion de pedidos e inventario." },
    { nombre: "Impresoras termicas", icon: Printer, detalle: "Impresion directa desde POS." },
    { nombre: "Herramientas de BI", icon: BarChart3, detalle: "Exportacion de datos para tableros externos." },
    { nombre: "API REST / Webhooks", icon: Puzzle, detalle: "Eventos: factura emitida, pago recibido, producto agotado, pedido creado." },
  ];
  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Integraciones"]} />
      <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Integraciones externas</h2><p className={cx("text-sm", theme.textMuted)}>Ninguna integracion externa esta conectada en este entorno de demostracion. Todas requieren credenciales propias de tu empresa.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.nombre} className={cx("rounded-xl border p-4", theme.surface, theme.border)}>
            <div className="flex items-center gap-2 mb-2"><div className={cx("h-9 w-9 rounded-lg grid place-items-center", theme.surfaceAlt)}><it.icon size={16} style={{ color: BRAND.navy }} /></div><p className={cx("text-sm font-semibold", theme.text)}>{it.nombre}</p></div>
            <p className={cx("text-xs mb-3", theme.textMuted)}>{it.detalle}</p>
            <Btn theme={theme} variant="secondary" size="sm" disabled className="w-full">No conectado</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   MODULO: CONFIGURACION
   ============================================================================ */

function ConfiguracionPage({ data, dispatch, actor, theme, role, onResetDemo }) {
  const [tab, setTab] = useState("empresa");
  const [confirmReset, setConfirmReset] = useState(false);
  const consecutivosRows = Object.entries(data.consecutivos).map(([k, v]) => ({ tipo: k, siguiente: v + 1 }));

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Configuracion"]} />
      <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Configuracion general</h2><p className={cx("text-sm", theme.textMuted)}>Empresa, sedes, roles, numeraciones y arquitectura del sistema.</p></div>
      <div className={cx("flex gap-1 border-b overflow-x-auto", theme.border)}>
        {[{ key: "empresa", label: "Empresa" }, { key: "sedes", label: "Sedes y bodegas" }, { key: "roles", label: "Usuarios y roles" }, { key: "numeraciones", label: "Numeraciones" }, { key: "arquitectura", label: "Guia de arquitectura" }, { key: "datos", label: "Datos de demostracion" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cx("px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px", tab === t.key ? "border-amber-500" : "border-transparent " + theme.textMuted)} style={tab === t.key ? { color: BRAND.navy } : undefined}>{t.label}</button>
        ))}
      </div>

      {tab === "empresa" && (
        <Panel theme={theme} title="Datos legales">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[["Razon social", EMPRESA.razonSocial], ["NIT", EMPRESA.nit], ["Responsabilidad fiscal", EMPRESA.responsabilidad], ["Direccion", EMPRESA.direccion], ["Telefono", EMPRESA.telefono], ["Correo", EMPRESA.email], ["Moneda", EMPRESA.moneda], ["Zona horaria", EMPRESA.zonaHoraria]].map(([l, v]) => (
              <div key={l}><p className={cx("text-xs", theme.textMuted)}>{l}</p><p className={cx("font-semibold", theme.text)}>{v}</p></div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "sedes" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Panel theme={theme} title="Sedes">
            {SEDES.map((s) => <div key={s.id} className={cx("flex items-center gap-2.5 rounded-lg p-2.5 mb-2", theme.surfaceAlt)}><Building size={15} style={{ color: BRAND.navy }} /><div><p className={cx("text-sm font-semibold", theme.text)}>{s.nombre}</p><p className={cx("text-xs", theme.textMuted)}>{s.ciudad}</p></div></div>)}
          </Panel>
          <Panel theme={theme} title="Bodegas">
            {BODEGAS.map((b) => <div key={b.id} className={cx("flex items-center gap-2.5 rounded-lg p-2.5 mb-2", theme.surfaceAlt)}><Warehouse size={15} style={{ color: BRAND.navy }} /><div><p className={cx("text-sm font-semibold", theme.text)}>{b.nombre}</p><p className={cx("text-xs", theme.textMuted)}>Sede: {SEDES.find((s) => s.id === b.sedeId)?.nombre}</p></div></div>)}
          </Panel>
        </div>
      )}
      {tab === "roles" && (
        <Panel theme={theme} title="Roles del sistema" subtitle="Permisos configurables por modulo y accion (simulados via seleccion de rol en la barra superior).">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {ROLES.map((r) => (
              <div key={r.id} className={cx("rounded-lg p-3 flex items-start gap-2.5", theme.surfaceAlt, role === r.id && "ring-2 ring-amber-500")}>
                <KeyRound size={15} className="mt-0.5 shrink-0" style={{ color: BRAND.navy }} />
                <div><p className={cx("text-sm font-semibold", theme.text)}>{r.nombre}</p><p className={cx("text-xs", theme.textMuted)}>{r.desc}</p></div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {tab === "numeraciones" && (
        <Panel theme={theme} title="Consecutivos por tipo de documento">
          <DataTable theme={theme} rows={consecutivosRows} columns={[{ key: "tipo", label: "Tipo de documento" }, { key: "siguiente", label: "Siguiente numero", render: (r) => <span className="nx-mono font-semibold">{r.siguiente}</span> }]} searchKeys={["tipo"]} />
        </Panel>
      )}
      {tab === "arquitectura" && (
        <Panel theme={theme} title="Guia de arquitectura y estado de modulos">
          <div className="space-y-4 text-sm">
            <p className={theme.textMuted}>Lunaris esta construido como una aplicacion React de una sola vista (sin paso de instalacion), que corre directamente en este chat. El motor de reglas de negocio (cotizacion → factura, compra → pago, inventario, contabilidad de partida doble) es el mismo tanto para los datos de demostracion como para las acciones que tu realices — una sola fuente de verdad. Se adjunta ademas un documento de arquitectura completo (Lunaris-Arquitectura.md) con el detalle de decisiones y la ruta sugerida para migrar esto a un proyecto Next.js productivo.</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {NAV.flatMap((g) => g.items).map((i) => (
                <div key={i.key} className={cx("flex items-center justify-between rounded-lg p-2.5", theme.surfaceAlt)}>
                  <span className={cx("text-xs font-medium flex items-center gap-2", theme.text)}><i.icon size={14} />{i.label}</span>
                  <span className={cx("text-[10px] font-bold px-2 py-0.5 rounded-full", ESTADO_MODULO_BADGE[i.estado].cls, theme.dark ? "" : "bg-opacity-100")}>{ESTADO_MODULO_BADGE[i.estado].label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}
      {tab === "datos" && (
        <Panel theme={theme} title="Datos de demostracion">
          <p className={cx("text-sm mb-3", theme.textMuted)}>Todos los cambios que realices (facturas, pagos, inventario, comprobantes) se guardan solo en la memoria de esta sesion. Puedes reiniciar y volver al set de datos original de Grupo Horizonte S.A.S. en cualquier momento.</p>
          {!confirmReset ? (
            <Btn theme={theme} variant="danger" icon={RefreshCw} onClick={() => setConfirmReset(true)}>Restablecer datos de demostracion</Btn>
          ) : (
            <div className={cx("rounded-lg p-3 bg-red-50 text-red-700 text-sm flex items-center gap-3")}>
              <span>¿Confirmas? Se perderan todos los cambios realizados en esta sesion.</span>
              <Btn theme={theme} variant="danger" size="sm" onClick={() => { onResetDemo(); setConfirmReset(false); }}>Si, restablecer</Btn>
              <Btn theme={theme} variant="secondary" size="sm" onClick={() => setConfirmReset(false)}>Cancelar</Btn>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/* ============================================================================
   APP RAIZ
   ============================================================================ */

export default function App() {
  const [state, dispatchRaw] = useReducer(reducer, undefined, () => ({ data: SEED, lastResult: null }));
  const [dark, setDark] = useState(false);
  const [role, setRole] = useState("admin_empresa");
  const [sedeActiva, setSedeActiva] = useState(SEDES[0].id);
  const [currentModule, setCurrentModule] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [printPayload, setPrintPayload] = useState(null);
  const [toast, setToast] = useState(null);

  const theme = useMemo(() => themeOf(dark), [dark]);
  const actor = useMemo(() => ({ usuario: "Usuario Demo Lunaris", rol: role }), [role]);
  const data = state.data;

  const dispatch = (action) => dispatchRaw({ ...action, actor: action.actor || actor });

  useEffect(() => {
    if (!state.lastResult) return;
    if (state.lastResult.ok) setToast({ ok: true, message: "Operacion realizada correctamente." });
    else setToast({ ok: false, message: state.lastResult.error });
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [state.lastResult]);

  useEffect(() => { if (!puedeVer(role, currentModule)) setCurrentModule("dashboard"); }, [role]);

  const notifications = useMemo(() => computeAlerts(data), [data]);
  const goTo = (mod) => { setCurrentModule(mod); setMobileOpen(false); };

  if (printPayload) return <FacturaImprimible factura={printPayload.factura} tercero={printPayload.tercero} sede={printPayload.sede} onClose={() => setPrintPayload(null)} />;

  const pageProps = { data, dispatch, actor, theme, role, sedeActiva, goTo, setPrint: setPrintPayload };
  let content = null;
  if (!puedeVer(role, currentModule)) content = <EmptyState theme={theme} title="Sin acceso" hint="El rol seleccionado no tiene acceso a este modulo." />;
  else switch (currentModule) {
    case "dashboard": content = <DashboardPage {...pageProps} />; break;
    case "terceros": content = <TercerosPage {...pageProps} />; break;
    case "ventas": content = <VentasPage {...pageProps} />; break;
    case "pos": content = <POSPage {...pageProps} />; break;
    case "compras": content = <ComprasPage {...pageProps} />; break;
    case "inventario": content = <InventarioPage {...pageProps} />; break;
    case "tesoreria": content = <TesoreriaPage {...pageProps} />; break;
    case "cartera": content = <CarteraPage {...pageProps} />; break;
    case "contabilidad": content = <ContabilidadPage {...pageProps} />; break;
    case "impuestos": content = <ImpuestosPage {...pageProps} />; break;
    case "nomina": content = <NominaPage {...pageProps} />; break;
    case "reportes": content = <ReportesPage {...pageProps} />; break;
    case "auditoria": content = <AuditoriaPage {...pageProps} />; break;
    case "movil": content = <MovilPage {...pageProps} />; break;
    case "integraciones": content = <IntegracionesPage {...pageProps} />; break;
    case "configuracion": content = <ConfiguracionPage {...pageProps} onResetDemo={() => dispatch({ type: "RESET_DEMO", payload: {}, actor })} />; break;
    default: content = <DashboardPage {...pageProps} />;
  }

  return (
    <div className={cx("nx-root flex h-screen w-full overflow-hidden", theme.bg)}>
      <style>{FONT_IMPORT}</style>
      <Sidebar current={currentModule} setCurrent={setCurrentModule} collapsed={collapsed} setCollapsed={setCollapsed} role={role} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar theme={theme} dark={dark} setDark={setDark} role={role} setRole={setRole} sede={sedeActiva} setSede={setSedeActiva} setMobileOpen={setMobileOpen} collapsed={collapsed} setCollapsed={setCollapsed} notifications={notifications} onSearch={setSearchQuery} searchQuery={searchQuery} actor={actor} />
        <main className="flex-1 overflow-y-auto nx-scroll p-4 sm:p-6">
          <div className="max-w-[1400px] mx-auto nx-fade">{content}</div>
        </main>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

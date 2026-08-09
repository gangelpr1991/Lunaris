import { fmtCOP, daysBetween } from "./utils.js";

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

/* ---------- Sistema de diseno ---------- */

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

/* ---------- Navegacion ---------- */

const NAV = [
  { group: "General", items: [
    { key: "dashboard", label: "Inicio", icon: "LayoutDashboard", estado: "funcional" },
    { key: "terceros", label: "Terceros", icon: "Users", estado: "funcional" },
  ]},
  { group: "Comercial", items: [
    { key: "ventas", label: "Ventas y facturacion", icon: "Receipt", estado: "funcional" },
    { key: "pos", label: "Punto de venta (POS)", icon: "Store", estado: "funcional" },
    { key: "cartera", label: "Cartera (CxC)", icon: "Wallet2", estado: "funcional" },
  ]},
  { group: "Cadena de suministro", items: [
    { key: "compras", label: "Compras", icon: "ShoppingCart", estado: "funcional" },
    { key: "inventario", label: "Inventario y bodegas", icon: "Boxes", estado: "funcional" },
  ]},
  { group: "Finanzas", items: [
    { key: "tesoreria", label: "Tesoreria y bancos", icon: "Landmark", estado: "funcional" },
    { key: "contabilidad", label: "Contabilidad", icon: "Calculator", estado: "funcional" },
    { key: "impuestos", label: "Impuestos y DIAN", icon: "BadgeCheck", estado: "simulado" },
  ]},
  { group: "Personas", items: [
    { key: "nomina", label: "Nomina y talento humano", icon: "UserCog", estado: "funcional" },
  ]},
  { group: "Analisis", items: [
    { key: "reportes", label: "Reportes", icon: "FileBarChart", estado: "funcional" },
    { key: "auditoria", label: "Auditoria", icon: "History", estado: "funcional" },
  ]},
  { group: "Sistema", items: [
    { key: "movil", label: "Vista movil / PWA", icon: "Smartphone", estado: "funcional" },
    { key: "integraciones", label: "Integraciones", icon: "Puzzle", estado: "funcional" },
    { key: "configuracion", label: "Configuracion", icon: "Settings", estado: "funcional" },
  ]},
];
const MODULE_LABEL = Object.fromEntries(NAV.flatMap((g) => g.items).map((i) => [i.key, i.label]));
const ESTADO_MODULO_BADGE = {
  funcional: { label: "Operativo", cls: "bg-emerald-500/15 text-emerald-400" },
  simulado: { label: "Simulado", cls: "bg-amber-500/15 text-amber-400" },
  parcial: { label: "Parcial", cls: "bg-blue-500/15 text-blue-400" },
  pendiente: { label: "Por integrar", cls: "bg-slate-500/20 text-slate-400" },
};

/* ---------- Calculos derivados ---------- */

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
  const facCxpVencidas = data.facturasCompra.filter((f) => f.estado !== "pagada" && new Date(f.vencimiento) < now);
  if (facCxpVencidas.length) alerts.push({ tone: "warn", title: `${facCxpVencidas.length} cuenta(s) por pagar vencida(s)`, detail: `Total ${fmtCOP(facCxpVencidas.reduce((s, f) => s + f.saldo, 0))} con proveedores.` });
  return alerts;
}

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

const CHART_COLORS = [BRAND.navy, BRAND.gold, "#2A6F97", "#157F5A", "#C0392B", "#6B4FA0", "#B8860B", "#5B7DB1"];

export {
  ROLES, PERMISOS_MODULO, puedeVer, puedeEscribir, puedeAprobar,
  EMPRESA, SEDES, BODEGAS, PLAN_CUENTAS, cuenta,
  TERCEROS_SEED, PRODUCTOS_SEED, CAJAS_BANCOS_SEED, EMPLEADOS_SEED,
  BRAND, FONT_IMPORT, themeOf, cx,
  ESTADOS, facturaEstadoVisual,
  NAV, MODULE_LABEL, ESTADO_MODULO_BADGE,
  MESES, monthKey, sameDay, CLIENTES, PROVEEDORES,
  CHART_COLORS,
  computeKPIs, computeAlerts, computeBalancePrueba, computeEstadoResultados,
  computeBalanceGeneral, computeCarteraEdades,
};

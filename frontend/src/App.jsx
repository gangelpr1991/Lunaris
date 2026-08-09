import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Users, ShoppingCart, Receipt, Boxes, Landmark,
  Wallet, Calculator, FileBarChart, Smartphone, Settings, Puzzle,
  Search, Bell, HelpCircle, ChevronDown, ChevronRight, Sun, Moon, Menu,
  Plus, Download, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  FileText, CreditCard, Truck, PackageCheck,
  BadgeCheck, BadgeX, Ban, Printer, ScanLine, History, ChevronsUpDown,
  TrendingUp, TrendingDown, Store, Wallet2, Scale, FileSpreadsheet,
  UserCog, KeyRound, Building, Warehouse, ListChecks, RefreshCw, Trash2,
  X, ArrowLeftRight, Mail, Phone,
  BarChart3, PieChart as PieChartIcon, DollarSign, AlertOctagon, ChevronLeft
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from "recharts";
import { useAuth } from "./contexts/AuthContext.jsx";
import Login from "./components/Login.jsx";
import { fmtCOP, fmtNum, fmtDate, fmtDateTime } from "./data/utils.js";
import {
  Badge, Btn, IconBtn, KPICard, Panel, EmptyState, Field, inputCls,
  Modal, Toast, DataTable, Breadcrumb, ItemsEditor, FacturaImprimible,
} from "./components/ui/index.jsx";
import {
  ROLES, PERMISOS_MODULO, puedeVer, puedeEscribir, puedeAprobar,
  EMPRESA, SEDES, BODEGAS, PLAN_CUENTAS, cuenta,
  BRAND, FONT_IMPORT, themeOf, cx, ESTADOS, facturaEstadoVisual, MESES,
  CHART_COLORS, MODULE_LABEL, ESTADO_MODULO_BADGE,
  computeKPIs, computeAlerts, computeBalancePrueba,
  computeEstadoResultados, computeBalanceGeneral, computeCarteraEdades,
  monthKey, sameDay, CLIENTES, PROVEEDORES,
} from "./data/constants.js";
import { Sidebar, Topbar } from "./components/layout/index.jsx";
import useAppStore from "./store/useAppStore.js";

/* ============================================================================
  Lunaris - Plataforma administrativa y contable (MVP funcional)
   Arquitectura componentizada con Zustand, modulos separados por concern.
   ============================================================================ */

/* ---------- Datos, UI y negocio importados desde modulos separados ---------- */
/* ============================================================================
   MODULO: DASHBOARD
   ============================================================================ */


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

  const submit = async () => {
    if (!form.nombre.trim() || !form.numDoc.trim()) return;
    try { await dispatch({ type: "CREAR_TERCERO", payload: { ...form, cupoCredito: Number(form.cupoCredito) || 0, condicionPagoDias: Number(form.condicionPagoDias) || 0 }, actor }); setShowNew(false); setForm({ tipo: "cliente", tipoDoc: "NIT", numDoc: "", nombre: "", email: "", telefono: "", ciudad: "", cupoCredito: 0, condicionPagoDias: 30, listaPrecios: "General" }); } catch (e) { /* error shown in toast */ }
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
            rowActions={(r) => !data.facturas.some((f) => f.remisionId === r.id) && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={Receipt} onClick={async () => { try { await dispatch({ type: "GENERAR_FACTURA", payload: { remisionId: r.id }, actor }); setTab("facturas"); } catch (e) { /* error shown in toast */ } }}>Generar factura</Btn>}
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
  const submit = async () => {
    if (!terceroId || items.length === 0) return;
    try { await dispatch({ type: "CREAR_COTIZACION", payload: { terceroId, sedeId: sedeActiva, items: items.map(({ productoId, cantidad, precio, ivaPct }) => ({ productoId, cantidad, precio, ivaPct })) }, actor }); onClose(); onDone?.(); } catch (e) { /* error shown in toast */ }
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
  const submit = async () => {
    try { await dispatch({ type: "GENERAR_REMISION", payload: { pedidoId: pedido.id, bodegaId }, actor }); onDone?.(); } catch (e) { /* error shown in toast */ }
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
  const submit = async () => { try { await dispatch({ type: "REGISTRAR_RECIBO", payload: { facturaId: factura.id, monto: Number(monto), medioPago, cajaBancoId }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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
  const submit = async () => { try { await dispatch({ type: "ANULAR_FACTURA", payload: { id: factura.id, motivo }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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
            rowActions={(r) => !data.facturasCompra.some((f) => f.recepcionId === r.id) && puedeEscribir(role) && <Btn theme={theme} size="sm" variant="subtle" icon={Receipt} onClick={async () => { try { await dispatch({ type: "GENERAR_FACTURA_COMPRA", payload: { recepcionId: r.id }, actor }); setTab("facturas"); } catch (e) { /* error shown in toast */ } }}>Generar factura</Btn>}
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
  const submit = async () => {
    if (!proveedorId || items.length === 0) return;
    try { await dispatch({ type: "CREAR_OC", payload: { proveedorId, sedeId: sedeActiva, bodegaId, items: items.map(({ productoId, cantidad, costoUnitario }) => ({ productoId, cantidad, costoUnitario })) }, actor }); onClose(); onDone?.(); } catch (e) { /* error shown in toast */ }
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
  const submit = async () => {
    const items = Object.entries(cantidades).filter(([, c]) => Number(c) > 0).map(([productoId, cantidad]) => ({ productoId, cantidad: Number(cantidad) }));
    if (items.length === 0) return;
    try { await dispatch({ type: "RECIBIR_OC", payload: { ocId: oc.id, items }, actor }); onClose(); onDone?.(); } catch (e) { /* error shown in toast */ }
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
  const submit = async () => { try { await dispatch({ type: "PAGAR_FACTURA_COMPRA", payload: { facturaCompraId: factura.id, monto: Number(monto), cajaBancoId }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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
  const submit = async () => { try { await dispatch({ type: "AJUSTE_INVENTARIO", payload: { productoId: producto.id, bodegaId, tipo, cantidad: Number(cantidad), motivo: motivo || "Ajuste manual" }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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
  const submit = async () => { try { await dispatch({ type: "TRANSFERENCIA_INVENTARIO", payload: { productoId: producto.id, origenBodegaId, destinoBodegaId, cantidad: Number(cantidad) }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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
  const submit = async () => { if (!form.codigo || !form.nombre) return; try { await dispatch({ type: "CREAR_PRODUCTO", payload: { ...form, precio: Number(form.precio), costoPromedio: Number(form.costoPromedio), iva: Number(form.iva), minimo: Number(form.minimo) }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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

function liquidarNomina(draft, actor, { periodo, empleadoIds }) {
  const SM = 1300000;
  const empleados = draft.empleados.filter((e) => empleadoIds.includes(e.id));
  if (empleados.length === 0) return { error: "Selecciona al menos un empleado." };
  if (draft.nominas.some((n) => n.periodo === periodo)) return { error: `El periodo ${periodo} ya fue liquidado.` };
  const fecha = todayISO();
  const nominasGen = [];
  for (const emp of empleados) {
    const salario = emp.salario;
    const auxTransporte = salario <= 2 * SM ? 200000 : 0;
    const saludEmp = Math.round(salario * 0.04);
    const pensionEmp = Math.round(salario * 0.04);
    const fsp = salario > 4 * SM ? Math.round(salario * 0.01) : 0;
    const deducciones = saludEmp + pensionEmp + fsp;
    const neto = salario + auxTransporte - deducciones;
    const saludPat = Math.round(salario * 0.085);
    const pensionPat = Math.round(salario * 0.12);
    const arl = Math.round(salario * 0.00522);
    const sena = Math.round(salario * 0.02);
    const icbf = Math.round(salario * 0.03);
    const ccf = Math.round(salario * 0.04);
    const aportesPatronales = saludPat + pensionPat + arl + sena + icbf + ccf;
    const cesantias = Math.round(salario * 0.0833);
    const prima = Math.round(salario * 0.0833);
    const vacaciones = Math.round(salario * 0.0417);
    const intCesantias = Math.round(cesantias * 0.12);
    const prestaciones = cesantias + prima + vacaciones + intCesantias;
    const nom = {
      id: nid("nom"), periodo, fecha, empleadoId: emp.id, empleadoNombre: emp.nombre, cargo: emp.cargo,
      salarioBase: salario, auxTransporte,
      deducciones: { salud: saludEmp, pension: pensionEmp, fsp }, deduccionesTotal: deducciones, netoPagar: neto,
      aportesPatronales: { salud: saludPat, pension: pensionPat, arl, sena, icbf, ccf }, aportesPatronalesTotal: aportesPatronales,
      prestaciones: { cesantias, prima, vacaciones, intCesantias }, prestacionesTotal: prestaciones,
      costoTotalEmpresa: salario + auxTransporte + aportesPatronales + prestaciones,
    };
    draft.nominas.unshift(nom);
    nominasGen.push(nom);
    crearComprobante(draft, {
      tipo: "Nomina", fecha, origen: { tipo: "nomina", id: nom.id, periodo },
      glosa: `Nomina ${periodo} — ${emp.nombre} (${emp.cargo})`,
      lineas: [
        { cuenta: "5105", nombre: cuenta("5105").nombre, tercero: emp.nombre, debito: salario + auxTransporte + aportesPatronales + prestaciones, credito: 0 },
        { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: emp.nombre, debito: 0, credito: neto },
        { cuenta: "2505", nombre: cuenta("2505").nombre, tercero: emp.nombre, debito: 0, credito: deducciones + aportesPatronales },
      ],
    });
    const cb = draft.cajasBancos.find((c) => c.tipo === "banco");
    if (cb) cb.saldo -= neto;
  }
  pushAudit(draft, actor, "Liquidar nomina", `Periodo ${periodo} — ${nominasGen.length} empleado(s)`);
  return { nominas: nominasGen };
}

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
  const submit = async () => { if (!concepto.trim() || !(Number(monto) > 0)) return; try { await dispatch({ type: "MOVIMIENTO_TESORERIA", payload: { cajaBancoId, tipo, concepto, monto: Number(monto), cuentaContrapartida }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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
  const submit = async () => { try { await dispatch({ type: "TRANSFERENCIA_TESORERIA", payload: { origenId, destinoId, monto: Number(monto) }, actor }); onClose(); } catch (e) { /* error shown in toast */ } };
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
  const submit = async () => {
    if (!glosa.trim() || !cuadra) return;
    try { await dispatch({ type: "COMPROBANTE_MANUAL", payload: { tipo, fecha: todayISO(), glosa, lineas: lineas.map((l) => ({ ...l, nombre: cuenta(l.cuenta)?.nombre, debito: Number(l.debito) || 0, credito: Number(l.credito) || 0 })) }, actor }); onClose(); } catch (e) { /* error shown in toast */ }
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
   MODULO: PUNTO DE VENTA (POS) — funcional con inventario y facturacion real
   ============================================================================ */

function POSPage({ data, dispatch, actor, theme, role, sedeActiva }) {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [clienteId, setClienteId] = useState(data.terceros.find((t) => t.tipo === "cliente")?.id);
  const [cobrando, setCobrando] = useState(false);
  const [posMsg, setPosMsg] = useState(null);

  const bodegaId = BODEGAS.find((b) => b.sedeId === sedeActiva)?.id || BODEGAS[0].id;
  const cajaId = data.cajasBancos.find((c) => c.sedeId === sedeActiva && c.tipo === "caja")?.id || data.cajasBancos[0]?.id;
  const bodegaNombre = BODEGAS.find((b) => b.id === bodegaId)?.nombre;

  const productos = data.productos.filter((p) => p.categoria !== "Servicios" && (p.nombre.toLowerCase().includes(q.toLowerCase()) || p.codigo.toLowerCase().includes(q.toLowerCase())));
  const add = (p) => setCart((c) => { const ex = c.find((i) => i.id === p.id); return ex ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { ...p, qty: 1 }]; });
  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const total = cart.reduce((s, i) => s + i.qty * i.precio * 1.19, 0);

  const cobrar = async () => {
    if (!puedeEscribir(role)) return;
    setCobrando(true);
    setPosMsg(null);
    try {
      for (const item of cart) {
        const stock = (data.productos.find((p) => p.id === item.id)?.stock[bodegaId] || 0);
        if (stock < item.qty) {
          setPosMsg({ ok: false, text: `Stock insuficiente: ${item.nombre} (disponible: ${stock}, requerido: ${item.qty})` });
          setCobrando(false);
          return;
        }
      }
      const items = cart.map((i) => ({ productoId: i.id, cantidad: i.qty, precio: i.precio, ivaPct: 19 }));
      const cot = await dispatch({ type: "CREAR_COTIZACION", payload: { terceroId: clienteId, sedeId: sedeActiva, items }, actor });
      await dispatch({ type: "APROBAR_COTIZACION", payload: { id: cot.id }, actor });
      const ped = await dispatch({ type: "CONVERTIR_PEDIDO", payload: { id: cot.id }, actor });
      const rem = await dispatch({ type: "GENERAR_REMISION", payload: { pedidoId: ped.id, bodegaId }, actor });
      const fac = await dispatch({ type: "GENERAR_FACTURA", payload: { remisionId: rem.id }, actor });
      await dispatch({ type: "REGISTRAR_RECIBO", payload: { facturaId: fac.id, monto: fac.total, medioPago: "Efectivo", cajaBancoId: cajaId }, actor });
      setCart([]);
      setPosMsg({ ok: true, text: `Factura ${fac.numero} — ${fmtCOP(fac.total)} — pagada` });
      setTimeout(() => setPosMsg(null), 5000);
    } catch (e) {
      /* error shown in toast */
    }
    setCobrando(false);
  };

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Punto de venta"]} />
      {!puedeEscribir(role) && <div className={cx("rounded-lg p-3 text-xs flex items-center gap-2 bg-red-50 text-red-700")}><AlertTriangle size={14} /> El rol actual es de solo lectura. Cambia a un rol con permisos de escritura para operar el POS.</div>}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className={cx("flex items-center gap-2 rounded-lg border px-3 py-2", theme.input)}><ScanLine size={16} className={theme.textFaint} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar o escanear codigo de barras..." className="bg-transparent outline-none text-sm w-full" /></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {productos.map((p) => {
              const stock = data.productos.find((x) => x.id === p.id)?.stock[bodegaId] || 0;
              return (
                <button key={p.id} onClick={() => add(p)} disabled={stock <= 0} className={cx("rounded-xl border p-3 text-left transition-shadow disabled:opacity-40", theme.surface, theme.border, stock > 0 && "hover:shadow-md")}>
                  <p className={cx("text-xs font-semibold line-clamp-2 mb-1", theme.text)}>{p.nombre}</p>
                  <p className="nx-mono text-sm font-bold" style={{ color: BRAND.navy }}>{fmtCOP(p.precio)}</p>
                  <p className={cx("text-[10px] mt-0.5", stock <= 0 ? "text-red-500" : theme.textMuted)}>{stock <= 0 ? "Agotado" : `Stock: ${stock}`}</p>
                </button>
              );
            })}
          </div>
        </div>
        <Panel theme={theme} title={`Venta — ${bodegaNombre}`} subtitle={SEDES.find((s) => s.id === sedeActiva)?.nombre}>
          <Field theme={theme} label="Cliente"><select className={cx(inputCls(theme), "mb-3")} value={clienteId || ""} onChange={(e) => setClienteId(e.target.value)}>{CLIENTES(data).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
          <div className="space-y-1.5 max-h-64 overflow-y-auto nx-scroll mb-3">
            {cart.length === 0 ? <EmptyState theme={theme} icon={Store} title="Carrito vacio" hint="Toca un producto para agregarlo." /> : cart.map((i) => (
              <div key={i.id} className={cx("flex items-center justify-between text-xs rounded-lg px-2.5 py-2", theme.surfaceAlt)}>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(i.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                  <span>{i.nombre} x{i.qty}</span>
                </div>
                <span className="nx-mono">{fmtCOP(i.qty * i.precio * 1.19)}</span>
              </div>
            ))}
          </div>
          <div className={cx("flex justify-between font-bold border-t pt-2 mb-3", theme.border)}><span>Total</span><span className="nx-mono text-lg">{fmtCOP(total)}</span></div>
          {puedeEscribir(role) && <Btn theme={theme} className="w-full" disabled={cart.length === 0 || cobrando} onClick={cobrar}>{cobrando ? "Procesando..." : "Cobrar (efectivo)"}</Btn>}
          {posMsg && <p className={cx("text-xs mt-2 text-center font-semibold", posMsg.ok ? "text-emerald-600" : "text-red-600")}>{posMsg.text}</p>}
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================================
   MODULO: NOMINA Y TALENTO HUMANO — liquidacion colombiana completa
   ============================================================================ */

function NominaPage({ data, dispatch, actor, theme, role }) {
  const now = new Date();
  const [periodo, setPeriodo] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [selected, setSelected] = useState(new Set());
  const [detailNomina, setDetailNomina] = useState(null);

  const SM = 1300000;
  const cols = [
    { key: "nombre", label: "Empleado", sortable: true },
    { key: "cargo", label: "Cargo" },
    { key: "sedeId", label: "Sede", render: (e) => SEDES.find((s) => s.id === e.sedeId)?.nombre },
    { key: "tipoContrato", label: "Contrato" },
    { key: "salario", label: "Salario base", render: (e) => <span className="nx-mono">{fmtCOP(e.salario)}</span> },
  ];

  const nominasCols = [
    { key: "periodo", label: "Periodo", sortable: true, render: (n) => <span className="nx-mono font-semibold">{n.periodo}</span> },
    { key: "empleadoNombre", label: "Empleado" },
    { key: "cargo", label: "Cargo" },
    { key: "netoPagar", label: "Neto a pagar", render: (n) => <span className="nx-mono font-semibold">{fmtCOP(n.netoPagar)}</span> },
    { key: "costoTotalEmpresa", label: "Costo total empresa", render: (n) => <span className="nx-mono">{fmtCOP(n.costoTotalEmpresa)}</span> },
  ];

  const liquidar = async () => {
    if (selected.size === 0) return;
    try {
      await dispatch({ type: "LIQUIDAR_NOMINA", payload: { periodo, empleadoIds: Array.from(selected) }, actor });
      setSelected(new Set());
    } catch (e) { /* error in toast */ }
  };

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Nomina y talento humano"]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Nomina y talento humano</h2><p className={cx("text-sm", theme.textMuted)}>Liquidacion completa: salud, pension, parafiscales, prestaciones sociales y provisiones.</p></div>
      </div>

      {puedeEscribir(role) && (
        <div className={cx("rounded-xl border p-4 flex flex-wrap items-end gap-3", theme.surface, theme.border)}>
          <Field theme={theme} label="Periodo (año-mes)">
            <input type="month" className={inputCls(theme)} value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </Field>
          <Btn theme={theme} onClick={liquidar} disabled={selected.size === 0}>Liquidar nomina ({selected.size} seleccionados)</Btn>
          <span className={cx("text-xs pb-2", theme.textMuted)}>Marca los empleados en la tabla y presiona Liquidar.</span>
        </div>
      )}

      <Panel theme={theme} title="Empleados">
        <DataTable theme={theme} rows={data.empleados} columns={cols} searchKeys={["nombre", "cargo"]} exportName="empleados" selectable selected={selected} onSelectChange={setSelected}
          onRowClick={(e) => { const liq = previsualizarLiquidacion(e); setDetailNomina({ empleado: e, liq }); }}
        />
      </Panel>

      <Panel theme={theme} title="Historial de nominas liquidadas">
        <DataTable theme={theme} rows={data.nominas} columns={nominasCols} searchKeys={["empleadoNombre", "periodo"]} exportName="nominas" pageSize={10}
          filters={[{ key: "periodo", label: "Periodo", options: uniq(data.nominas.map((n) => n.periodo)).map((p) => ({ value: p, label: p })) }]}
          emptyTitle="Sin nominas liquidadas" emptyHint="Selecciona empleados, define el periodo y presiona Liquidar nomina."
          onRowClick={(n) => setDetailNomina({ empleado: data.empleados.find((e) => e.id === n.empleadoId), liq: n })}
        />
      </Panel>

      <Modal open={!!detailNomina} onClose={() => setDetailNomina(null)} theme={theme} width="max-w-lg" title={detailNomina?.liq?.periodo ? `Detalle nomina — ${detailNomina.empleado?.nombre}` : `Vista previa — ${detailNomina?.empleado?.nombre}`} footer={<Btn theme={theme} variant="secondary" onClick={() => setDetailNomina(null)}>Cerrar</Btn>}>
        {detailNomina && (() => {
          const e = detailNomina.empleado;
          const l = detailNomina.liq;
          const yaLiquidada = !!l.periodo;
          return (
            <div className="space-y-3 text-sm">
              <div className={cx("rounded-lg p-3", theme.surfaceAlt)}>
                <p className={cx("font-bold", theme.text)}>{e.nombre}</p>
                <p className={cx("text-xs", theme.textMuted)}>{e.cargo} · {SEDES.find((s) => s.id === e.sedeId)?.nombre} · {e.tipoContrato}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={cx("rounded-lg p-2.5", theme.surfaceAlt)}>
                  <p className={cx("font-semibold mb-1", theme.text)}>Devengado</p>
                  <Row theme={theme} label="Salario base" value={e.salario} />
                  {(l.auxTransporte || (e.salario <= 2 * SM ? 200000 : 0)) > 0 && <Row theme={theme} label="Aux. transporte" value={l.auxTransporte || 200000} />}
                </div>
                <div className={cx("rounded-lg p-2.5", theme.surfaceAlt)}>
                  <p className={cx("font-semibold mb-1", theme.text)}>Deducciones empleado</p>
                  <Row theme={theme} label="Salud (4%)" value={-(Math.round(e.salario * 0.04))} />
                  <Row theme={theme} label="Pension (4%)" value={-(Math.round(e.salario * 0.04))} />
                  {e.salario > 4 * SM && <Row theme={theme} label="FSP (1%)" value={-(Math.round(e.salario * 0.01))} />}
                  <div className={cx("flex justify-between font-semibold pt-1 border-t mt-1", theme.border)}><span>Total deducciones</span><span className="nx-mono">{fmtCOP(-(l.deduccionesTotal || (Math.round(e.salario * 0.04) * 2 + (e.salario > 4 * SM ? Math.round(e.salario * 0.01) : 0))))}</span></div>
                </div>
              </div>
              <div className={cx("flex justify-between font-bold text-base pt-2 border-t", theme.border)}>
                <span>Neto a pagar</span>
                <span className="nx-mono" style={{ color: BRAND.navy }}>{fmtCOP(l.netoPagar || (e.salario + (e.salario <= 2 * SM ? 200000 : 0) - Math.round(e.salario * 0.04) * 2 - (e.salario > 4 * SM ? Math.round(e.salario * 0.01) : 0)))}</span>
              </div>
              {yaLiquidada && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={cx("rounded-lg p-2.5", theme.surfaceAlt)}>
                      <p className={cx("font-semibold mb-1", theme.text)}>Aportes patronales</p>
                      <Row theme={theme} label="Salud (8.5%)" value={l.aportesPatronales.salud} />
                      <Row theme={theme} label="Pension (12%)" value={l.aportesPatronales.pension} />
                      <Row theme={theme} label="ARL (0.522%)" value={l.aportesPatronales.arl} />
                      <Row theme={theme} label="SENA (2%)" value={l.aportesPatronales.sena} />
                      <Row theme={theme} label="ICBF (3%)" value={l.aportesPatronales.icbf} />
                      <Row theme={theme} label="CCF (4%)" value={l.aportesPatronales.ccf} />
                      <div className={cx("flex justify-between font-semibold pt-1 border-t mt-1", theme.border)}><span>Total</span><span className="nx-mono">{fmtCOP(l.aportesPatronalesTotal)}</span></div>
                    </div>
                    <div className={cx("rounded-lg p-2.5", theme.surfaceAlt)}>
                      <p className={cx("font-semibold mb-1", theme.text)}>Prestaciones sociales</p>
                      <Row theme={theme} label="Cesantias (8.33%)" value={l.prestaciones.cesantias} />
                      <Row theme={theme} label="Prima (8.33%)" value={l.prestaciones.prima} />
                      <Row theme={theme} label="Vacaciones (4.17%)" value={l.prestaciones.vacaciones} />
                      <Row theme={theme} label="Int. cesantias (12%)" value={l.prestaciones.intCesantias} />
                      <div className={cx("flex justify-between font-semibold pt-1 border-t mt-1", theme.border)}><span>Total</span><span className="nx-mono">{fmtCOP(l.prestacionesTotal)}</span></div>
                    </div>
                  </div>
                  <div className={cx("flex justify-between font-bold pt-2 border-t text-base", theme.border)}>
                    <span>Costo total empresa (mes)</span>
                    <span className="nx-mono" style={{ color: BRAND.navy }}>{fmtCOP(l.costoTotalEmpresa)}</span>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function previsualizarLiquidacion(e) {
  const SM = 1300000;
  const deduccionesTotal = Math.round(e.salario * 0.04) * 2 + (e.salario > 4 * SM ? Math.round(e.salario * 0.01) : 0);
  const auxTransporte = e.salario <= 2 * SM ? 200000 : 0;
  return { deduccionesTotal, netoPagar: e.salario + auxTransporte - deduccionesTotal, auxTransporte };
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
        <KPICard theme={theme} label="Borrador" value={porEstado("borrador")} icon={Clock} tone="warn" />
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
          filters={[{ key: "estadoDian", label: "Estado", options: ["borrador", "aceptado", "contingencia", "rechazado", "anulado"].map((e) => ({ value: e, label: ESTADOS[e]?.label || e })) }]}
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

function IntegracionesPage({ data, theme }) {
  const catalogos = [
    {
      grupo: "Facturacion electronica",
      icon: BadgeCheck,
      items: [
        { nombre: "DIAN — Facturacion electronica", detalle: "Emision, recepcion y validacion de documentos electronicos ante la DIAN via proveedor tecnologico autorizado.", estado: "pendiente", docs: "Requiere certificado digital, credenciales de habilitacion y resolucion de facturacion." },
        { nombre: "Documento soporte (DS)", detalle: "Documento equivalente para operaciones con no obligados a facturar.", estado: "pendiente", docs: "Complementa la factura electronica para ciertos regimenes y sectores." },
        { nombre: "Nomina electronica (PILA)", detalle: "Transmision de novedades y liquidacion de aportes al sistema de seguridad social.", estado: "pendiente", docs: "Formato 1001, 1002 y anexos piloto de la UGPP." },
      ],
    },
    {
      grupo: "Banca y pagos",
      icon: Landmark,
      items: [
        { nombre: "Conciliacion bancaria", detalle: "Importacion de extractos (CSV, TXT, OFX) y conciliacion automatica contra movimientos de tesoreria.", estado: "parcial", docs: "El modulo de tesoreria ya registra movimientos; falta el parser de extractos." },
        { nombre: "Pasarela de pago (PSE / NEQUI / Daviplata)", detalle: "Generacion de link de pago, verificacion de transaccion y conciliacion automatica.", estado: "pendiente", docs: "Requiere cuenta activa en la pasarela y credenciales API." },
        { nombre: "Transferencias programadas", detalle: "Archivos planos para pagos masivos a proveedores y nomina (ACH Colombia).", estado: "pendiente", docs: "Formato estandar ACH: referencia, monto, cuenta destino." },
      ],
    },
    {
      grupo: "Comunicaciones y mensajeria",
      icon: Mail,
      items: [
        { nombre: "Correo electronico (SMTP)", detalle: "Envio de facturas, estados de cuenta y alertas de cartera.", estado: "parcial", docs: "La vista de impresion genera PDF; falta el despachador SMTP para entrega automatica." },
        { nombre: "WhatsApp Business API", detalle: "Envio de facturas, recordatorios de pago y notificaciones de despacho por WhatsApp.", estado: "pendiente", docs: "Requiere numero de telefono verificado en Meta Business y plantillas aprobadas." },
      ],
    },
    {
      grupo: "E-commerce y marketplaces",
      icon: Store,
      items: [
        { nombre: "Tiendas virtuales (VTEX, Shopify, WooCommerce)", detalle: "Sincronizacion de productos, stock y pedidos desde plataformas de e-commerce.", estado: "pendiente", docs: "Webhook entrante: pedido creado → cotizacion automatica en Lunaris. Webhook saliente: stock actualizado → marketplace." },
        { nombre: "Marketplaces (Mercado Libre, Linio, Amazon)", detalle: "Recepcion de ordenes, actualizacion de inventario y guias de envio.", estado: "pendiente", docs: "Requiere credenciales de API por marketplace." },
      ],
    },
    {
      grupo: "Punto de venta y operaciones",
      icon: Printer,
      items: [
        { nombre: "Impresoras termicas (POS-80, ESC/POS)", detalle: "Impresion directa de ticket, factura POS y cierre de caja desde el navegador.", estado: "parcial", docs: "El POS ya genera factura; falta el driver de impresion ESC/POS via WebUSB o Web Bluetooth." },
        { nombre: "Lectores de codigo de barras", detalle: "Entrada por teclado (wedge) ya soportada en el campo de busqueda del POS.", estado: "operativo", docs: "Conecta cualquier lector USB en modo HID y escanea directamente en el campo Buscar." },
        { nombre: "Basculas y balanzas electronicas", detalle: "Captura de peso desde puerto serial o USB para productos de venta por peso.", estado: "pendiente", docs: "Requiere Web Serial API o driver de fabricante." },
      ],
    },
    {
      grupo: "APIs y automatizacion",
      icon: Puzzle,
      items: [
        { nombre: "API REST Lunaris", detalle: "Endpoints publicos para terceros: consulta de factura por CUFE, estado de cartera, notificacion de pago.", estado: "pendiente", docs: "Ruta sugerida: /api/v1/facturas/{cufe}, /api/v1/terceros/{doc}/estado-cuenta. Autenticacion via API Key." },
        { nombre: "Webhooks salientes", detalle: "Notifica eventos a URLs externas: factura.emitida, pago.recibido, pedido.creado, producto.stock-bajo.", estado: "pendiente", docs: "Retry exponencial, firma HMAC del payload, panel de intentos fallidos." },
        { nombre: "Exportacion a herramientas BI", detalle: "Conexion directa a Power BI, Tableau o Looker Studio via exportacion periodica programada.", estado: "parcial", docs: "El modulo de Reportes ya exporta Excel; la automatizacion periodica esta pendiente." },
      ],
    },
  ];

  const badgeEstado = (e) => {
    const map = { operativo: "bg-emerald-100 text-emerald-700", parcial: "bg-amber-100 text-amber-700", pendiente: "bg-slate-200 text-slate-500" };
    return <span className={cx("text-[10px] font-bold px-2 py-0.5 rounded-full", map[e] || map.pendiente)}>{e === "operativo" ? "Operativo" : e === "parcial" ? "Parcial" : "Pendiente"}</span>;
  };

  return (
    <div className="space-y-4">
      <Breadcrumb theme={theme} items={["Lunaris", "Integraciones"]} />
      <div><h2 className={cx("nx-display text-xl font-bold", theme.text)}>Catalogo de integraciones</h2><p className={cx("text-sm", theme.textMuted)}>Conectores disponibles, en desarrollo y planeados. Los marcados como Operativo ya funcionan en el entorno actual.</p></div>

      {catalogos.map((g) => (
        <Panel key={g.grupo} theme={theme} title={g.grupo} subtitle={`${g.items.length} integracion(es)`}>
          <div className="space-y-2.5">
            {g.items.map((it) => (
              <div key={it.nombre} className={cx("rounded-lg border p-3 flex items-start gap-3", theme.border)}>
                <div className={cx("h-9 w-9 rounded-lg grid place-items-center shrink-0", theme.surfaceAlt)}><g.icon size={16} style={{ color: it.estado === "operativo" ? BRAND.gold : undefined }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={cx("text-sm font-semibold", theme.text)}>{it.nombre}</p>
                    {badgeEstado(it.estado)}
                  </div>
                  <p className={cx("text-xs", theme.textMuted)}>{it.detalle}</p>
                  <p className={cx("text-[10px] mt-1.5", theme.textFaint)}>{it.docs}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ))}

      <div className={cx("rounded-lg p-4 text-xs text-center", theme.surfaceAlt, theme.textMuted)}>
        Todas las integraciones marcadas como Pendiente requieren credenciales reales de produccion de cada proveedor externo. Lunaris no almacena ni transmite datos sin que el administrador configure explicitamente cada conector.
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
        <Panel theme={theme} title="Roles del sistema" subtitle="Permisos configurables por modulo y accion. Los roles se asignan a cada usuario autenticado.">
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
  const { isAuthenticated, role, actor, logout, user } = useAuth();
  const {
    data, lastResult, dbReady, dark, sedeActiva, currentModule,
    collapsed, mobileOpen, searchQuery, printPayload, toast,
    setDark, setSedeActiva, setMobileOpen, setCollapsed,
    setSearchQuery, setPrintPayload, setToast,
    init, dispatch, goTo,
  } = useAppStore();

  useEffect(() => { init(); }, []);

  const theme = useMemo(() => themeOf(dark), [dark]);

  useEffect(() => {
    if (!lastResult) return;
    setToast(lastResult.ok
      ? { ok: true, message: "Operacion realizada correctamente." }
      : { ok: false, message: lastResult.error });
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [lastResult]);

  useEffect(() => { if (!puedeVer(role, currentModule)) goTo("dashboard"); }, [role, currentModule]);

  const notifications = useMemo(() => computeAlerts(data), [data]);

  if (!dbReady) return (
    <div className={cx("nx-root flex h-screen w-full items-center justify-center", themeOf(false).bg)}>
      <style>{FONT_IMPORT}</style>
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center" style={{ backgroundColor: BRAND.navy }}>
          <span className="text-white font-bold text-lg nx-display">L</span>
        </div>
        <p className="nx-display font-bold text-lg" style={{ color: BRAND.navy }}>Lunaris</p>
        <p className="text-sm text-slate-500">Conectando con el servidor...</p>
      </div>
    </div>
  );

  if (printPayload) return <FacturaImprimible factura={printPayload.factura} tercero={printPayload.tercero} sede={printPayload.sede} onClose={() => setPrintPayload(null)} />;

  if (!isAuthenticated) return <Login />;

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
    case "configuracion": content = <ConfiguracionPage {...pageProps} onResetDemo={() => dispatch({ type: "RESET_DEMO", payload: {} })} />; break;
    default: content = <DashboardPage {...pageProps} />;
  }

  return (
    <div className={cx("nx-root flex h-screen w-full overflow-hidden", theme.bg)}>
      <style>{FONT_IMPORT}</style>
      <Sidebar current={currentModule} setCurrent={goTo} collapsed={collapsed} setCollapsed={setCollapsed} role={role} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} logout={logout} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar theme={theme} dark={dark} setDark={setDark} role={role} user={user} logout={logout} sede={sedeActiva} setSede={setSedeActiva} setMobileOpen={setMobileOpen} collapsed={collapsed} setCollapsed={setCollapsed} notifications={notifications} onSearch={setSearchQuery} searchQuery={searchQuery} actor={actor} />
        <main className="flex-1 overflow-y-auto nx-scroll p-4 sm:p-6">
          <div className="max-w-[1400px] mx-auto nx-fade">{content}</div>
        </main>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

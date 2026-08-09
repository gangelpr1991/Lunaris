import React, { useState, useMemo, useEffect } from "react";
import {
  X, Search, FileText, FileSpreadsheet, ChevronDown,
  ChevronLeft, ChevronRight, CheckCircle2, AlertOctagon,
  Plus, Trash2, Printer
} from "lucide-react";
import * as XLSX from "xlsx";
import { fmtCOP, fmtDate } from "../../data/utils.js";
import { EMPRESA } from "../../data/constants.js";

export const BRAND = { navyDark: "#141C33", navy: "#1E2A4A", navySoft: "#2A3B63", gold: "#C9A227", goldSoft: "#E7C766" };

export const FONT_IMPORT = `
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

export function themeOf(dark) {
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

export const cx = (...xs) => xs.filter(Boolean).join(" ");

export const ESTADOS = {
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

export function facturaEstadoVisual(fac) {
  if (fac.estado === "anulada") return "anulada";
  if (fac.estado === "pagada") return "pagada";
  if (fac.saldo < fac.total && fac.saldo > 0) return new Date(fac.vencimiento) < new Date() ? "parcial" : "parcial";
  if (new Date(fac.vencimiento) < new Date() && fac.estado !== "pagada") return "vencida";
  return "pendiente";
}

export function Badge({ estado, children }) {
  const info = ESTADOS[estado] || { label: estado, cls: "bg-slate-200 text-slate-600" };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", info.cls)}>{children || info.label}</span>;
}

export function exportExcel(filename, rows) {
  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  } catch (e) { console.error("Error exportando a Excel", e); }
}

export function Btn({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled, type = "button", title, theme }) {
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

export function IconBtn({ icon: Icon, onClick, theme, title, active }) {
  return (
    <button title={title} onClick={onClick} className={cx("h-9 w-9 grid place-items-center rounded-lg transition-colors", active ? "bg-amber-500/15 text-amber-500" : theme.dark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
      <Icon size={18} strokeWidth={2} />
    </button>
  );
}

export function KPICard({ label, value, sub, icon: Icon, tone = "default", theme, onClick }) {
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

export function Panel({ title, actions, children, theme, className, subtitle }) {
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

export function EmptyState({ icon: Icon = FileText, title, hint, action, theme }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className={cx("h-12 w-12 rounded-full grid place-items-center mb-3", theme.surfaceAlt)}><Icon size={22} className={theme.textFaint} /></div>
      <p className={cx("font-semibold text-sm", theme.text)}>{title}</p>
      {hint && <p className={cx("text-xs mt-1 max-w-sm", theme.textMuted)}>{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint, required, theme, error, className }) {
  return (
    <label className={cx("flex flex-col gap-1.5 text-sm", className)}>
      {label && <span className={cx("text-xs font-semibold", theme.textMuted)}>{label}{required && <span className="text-red-500"> *</span>}</span>}
      {children}
      {hint && !error && <span className={cx("text-xs", theme.textFaint)}>{hint}</span>}
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </label>
  );
}

export function inputCls(theme) { return cx("w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors", theme.input, theme.ring); }

export function Modal({ open, onClose, title, children, theme, width = "max-w-lg", footer }) {
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

export function Toast({ toast, onClose }) {
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

export function DataTable({ columns, rows, theme, searchKeys = [], filters = [], pageSize = 8, exportName, rowActions, onRowClick, emptyTitle = "Sin resultados", emptyHint, selectable, selected, onSelectChange }) {
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

export function Breadcrumb({ items, theme }) {
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

export function ItemsEditor({ productos, items, setItems, theme, priceField = "precio", label = "Precio unitario" }) {
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

export function FacturaImprimible({ factura, tercero, sede, onClose }) {
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

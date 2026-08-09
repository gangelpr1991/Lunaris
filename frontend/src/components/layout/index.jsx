import React, { useState } from "react";
import {
  LayoutDashboard, Users, Receipt, Store, Wallet2, ShoppingCart,
  Boxes, Landmark, Calculator, BadgeCheck, UserCog, FileBarChart,
  History, Smartphone, Puzzle, Settings,
  Menu, Search, Bell, Sun, Moon, HelpCircle, AlertTriangle, ChevronsUpDown, LogOut
} from "lucide-react";
import { BRAND, ESTADO_MODULO_BADGE, SEDES, ROLES, puedeVer, cx } from "../../data/constants.js";
import appleTouchIcon from "../../../apple-touch-icon.png";

const NAV = [
  { group: "General", items: [
    { key: "dashboard", label: "Inicio", icon: LayoutDashboard, estado: "funcional" },
    { key: "terceros", label: "Terceros", icon: Users, estado: "funcional" },
  ]},
  { group: "Comercial", items: [
    { key: "ventas", label: "Ventas y facturacion", icon: Receipt, estado: "funcional" },
    { key: "pos", label: "Punto de venta (POS)", icon: Store, estado: "funcional" },
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
    { key: "nomina", label: "Nomina y talento humano", icon: UserCog, estado: "funcional" },
  ]},
  { group: "Analisis", items: [
    { key: "reportes", label: "Reportes", icon: FileBarChart, estado: "funcional" },
    { key: "auditoria", label: "Auditoria", icon: History, estado: "funcional" },
  ]},
  { group: "Sistema", items: [
    { key: "movil", label: "Vista movil / PWA", icon: Smartphone, estado: "funcional" },
    { key: "integraciones", label: "Integraciones", icon: Puzzle, estado: "funcional" },
    { key: "configuracion", label: "Configuracion", icon: Settings, estado: "funcional" },
  ]},
];

function IconBtn({ icon: Icon, onClick, theme, title, active }) {
  return (
    <button title={title} onClick={onClick} className={cx("h-9 w-9 grid place-items-center rounded-lg transition-colors", active ? "bg-amber-500/15 text-amber-500" : theme.dark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
      <Icon size={18} strokeWidth={2} />
    </button>
  );
}

export function Sidebar({ current, setCurrent, collapsed, setCollapsed, role, mobileOpen, setMobileOpen, logout }) {
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
          {!collapsed && (
            <button
              onClick={logout}
              title="Cerrar sesion"
              className="ml-auto h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-red-400 hover:bg-white/10 transition-colors"
            >
              <LogOut size={16} strokeWidth={2} />
            </button>
          )}
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

export function Topbar({ theme, dark, setDark, role, user, logout, sede, setSede, setMobileOpen, collapsed, setCollapsed, notifications, onSearch, searchQuery, actor }) {
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
            <div className={cx("absolute right-0 mt-2 w-56 rounded-xl border shadow-2xl nx-fade overflow-hidden", theme.surface, theme.border)}>
              <div className={cx("px-4 py-3 border-b", theme.border)}>
                <p className={cx("text-xs font-semibold", theme.text)}>{user?.nombre || user?.email}</p>
                <p className={cx("text-[11px]", theme.textMuted)}>{user?.email}</p>
                <p className={cx("text-[11px] mt-0.5", theme.textMuted)}>Rol: {ROLES.find((r) => r.id === role)?.nombre}</p>
              </div>
              <div className="p-2">
                <button onClick={() => { setShowProfile(false); logout(); }} className="w-full text-left px-3 py-2 text-xs rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                  Cerrar sesion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

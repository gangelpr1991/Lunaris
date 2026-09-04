import { create } from "zustand";
import { api } from "../api.js";
import { buildSeed, SEED } from "../data/seed.js";

// Mismas claves que SEED/el estado real, pero todo vacio - se usa cuando
// el usuario logueado no tiene empresa asociada (superadmin de plataforma
// "puro", tenantId null). GET /api/estado exige un tenantId real (ver
// backend/server/index.js, requireTenant) y devuelve 400 si no hay uno, asi
// que ni siquiera tiene sentido intentarlo - mostrarle datos DEMO (SEED) a
// un superadmin sin empresa seria confuso, parecerian datos reales.
const EMPTY_STATE = {
  empresa: null, sedes: [], bodegas: [], planCuentas: [], cajasBancos: [],
  terceros: [], productos: [], empleados: [], consecutivos: {},
  cotizaciones: [], pedidos: [], remisiones: [], facturas: [],
  ordenesCompra: [], recepciones: [], facturasCompra: [],
  movimientosInventario: [], movimientosTesoreria: [], comprobantes: [],
  nominas: [], auditLog: [], usuarios: [],
};

const useAppStore = create((set, get) => ({
  data: SEED,
  lastResult: null,
  dbReady: false,
  noTenant: false,
  dark: false,
  sedeActiva: "sede-bog",
  currentModule: "dashboard",
  collapsed: false,
  mobileOpen: false,
  searchQuery: "",
  printPayload: null,
  toast: null,

  setDark: (dark) => set({ dark }),
  setSedeActiva: (sedeActiva) => set({ sedeActiva }),
  setCurrentModule: (currentModule) => set({ currentModule }),
  setCollapsed: (collapsed) => set({ collapsed }),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setPrintPayload: (printPayload) => set({ printPayload }),
  setToast: (toast) => set({ toast }),

  init: async (tenantId) => {
    if (!tenantId) {
      // Superadmin de plataforma sin empresa asociada: no hay estado de
      // negocio que cargar (ver EMPTY_STATE arriba). App.jsx lo manda
      // directo al panel de Plataforma en vez de al dashboard.
      set({ data: EMPTY_STATE, dbReady: true, noTenant: true });
      return;
    }
    try {
      const data = await api.getEstado();
      if (data && (data.terceros || data.productos)) {
        set({ data, dbReady: true, noTenant: false });
      } else {
        const seed = buildSeed();
        await api.saveEstado(seed);
        set({ data: seed, dbReady: true, noTenant: false });
      }
    } catch {
      set({ data: SEED, dbReady: true, noTenant: false });
    }
  },

  dispatch: async (action) => {
    try {
      if (action.type === "RESET_DEMO") {
        const seed = buildSeed();
        await api.saveEstado(seed);
        set({ data: seed, lastResult: { ok: true, ts: Date.now() } });
        return {};
      }
      const res = await api.accion(action.type, action.payload);
      if (!res.ok) throw new Error(res.error);
      const newData = await api.getEstado();
      set({ data: newData, lastResult: { ok: true, result: res.result, ts: Date.now() } });
      return res.result;
    } catch (e) {
      set({ lastResult: { ok: false, error: e.message, ts: Date.now() } });
      throw e;
    }
  },

  goTo: (mod) => set({ currentModule: mod, mobileOpen: false }),
}));

export default useAppStore;

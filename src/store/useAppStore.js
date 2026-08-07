import { create } from "zustand";
import { api } from "../api.js";
import { buildSeed, SEED } from "../data/seed.js";

const useAppStore = create((set, get) => ({
  data: SEED,
  lastResult: null,
  dbReady: false,
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

  init: async () => {
    try {
      const data = await api.getEstado();
      if (data && (data.terceros || data.productos)) {
        set({ data, dbReady: true });
      } else {
        const seed = buildSeed();
        await api.saveEstado(seed);
        set({ data: seed, dbReady: true });
      }
    } catch {
      set({ data: SEED, dbReady: true });
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

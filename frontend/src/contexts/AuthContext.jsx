import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

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

const TOKEN_KEY = "lunaris_token";
const USER_KEY = "lunaris_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      api.setToken(token);
    } else {
      api.setToken(null);
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      const { token: newToken, user: userData } = res;
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    api.setToken(null);
  }, []);

  const role = user?.rol || "consulta";
  const username = user?.nombre || user?.email || "Invitado";

  const puedeVer = (modulo) => role === "superadmin" || role === "admin_empresa" || (PERMISOS_MODULO[modulo] || []).includes(role);
  const puedeEscribir = () => !["consulta", "auditor"].includes(role);
  const puedeAprobar = () => ["superadmin", "admin_empresa", "gerente", "contador"].includes(role);
  const isAuthenticated = !!user && !!token;

  const actor = { usuario: username, rol: role };

  const value = {
    user, token, loading, error, role, username, actor,
    isAuthenticated, login, logout,
    puedeVer, puedeEscribir, puedeAprobar,
    ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
}

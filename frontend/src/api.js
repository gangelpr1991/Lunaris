const BASE = "/api";

// Se inicializa leyendo localStorage directamente (no esperando a que
// AuthContext lo empuje via setToken) porque los modulos ES se evaluan
// ANTES de que se monte cualquier componente React - esto elimina una
// condicion de carrera real: al recargar la pagina con sesion ya
// guardada, el efecto que llama a AuthContext.setToken() y el efecto de
// App.jsx que dispara la primera peticion (init -> getEstado) corren en
// el mismo commit, pero de HIJO a PADRE (App primero, AuthProvider
// despues, porque AuthProvider envuelve a App) - sin esto, esa primera
// peticion saldria sin el header Authorization y caeria en un 401. La
// clave debe coincidir con TOKEN_KEY en contexts/AuthContext.jsx.
let _token = (typeof localStorage !== "undefined" && localStorage.getItem("lunaris_token")) || null;

async function request(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }
  const res = await fetch(`${BASE}${url}`, { headers, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  setToken: (token) => { _token = token; },

  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getEstado: () => request("/estado"),

  saveEstado: (data) =>
    request("/estado", { method: "PUT", body: JSON.stringify(data) }),

  accion: (type, payload) =>
    request("/accion", { method: "POST", body: JSON.stringify({ type, payload }) }),

  // Solo superadmin de plataforma (tenantId null en su usuario) - lista y
  // crea empresas. Crear una empresa tambien pasa por /accion (tipo
  // CREAR_EMPRESA), como cualquier otra accion de negocio.
  getTenants: () => request("/tenants"),

  health: () => request("/health"),
};

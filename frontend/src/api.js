const BASE = "/api";

let _token = null;

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

  health: () => request("/health"),
};

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

let __clock = null;
const todayISO = () => __clock || new Date().toISOString();
const setClock = (v) => { __clock = v; };
const uniq = (arr) => Array.from(new Set(arr));

export { nid, fmtCOP, fmtNum, fmtDate, fmtDateTime, addDays, daysBetween, todayISO, setClock, uniq };

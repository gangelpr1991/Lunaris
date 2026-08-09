import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { SCHEMA } from "./schema.js";
import { env } from "./env.js";
import pgPool, { initPGDB, loadFullStatePG, saveFullStatePG, closePGDB } from "./pgdb.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
let usePG = env.DB_TYPE === "postgresql";

export function initDB() {
  if (usePG) {
    return initPGDB();
  }
  throw new Error("SQLite no está soportado. Usa DB_TYPE=postgresql en .env");
}

export function loadFullState() {
  if (usePG) return loadFullStatePG();
  throw new Error("SQLite no está soportado");
}

export function saveFullState(data) {
  if (usePG) return saveFullStatePG(data);
  throw new Error("SQLite no está soportado");
}

export function closeDB() {
  if (usePG) return closePGDB();
}

export function jsonCol(val) { return val ? JSON.stringify(val) : null; }
export function parseCol(val) { return val ? JSON.parse(val) : null; }

const TABLES = {
  empresa: { pk: "id" },
  sedes: { pk: "id" },
  bodegas: { pk: "id" },
  roles: { pk: "id", colMap: { desc: "descripcion" } },
  planCuentas: { pk: "codigo" },
  terceros: { pk: "id" },
  productos: { pk: "id" },
  facturas: { pk: "id" },
  facturaItems: { pk: "id" },
  compras: { pk: "id" },
  compraItems: { pk: "id" },
  pagos: { pk: "id" },
  cuentasBancarias: { pk: "id" },
  movimientos: { pk: "id" },
  nominas: { pk: "id" },
  nominaItems: { pk: "id" },
  usuarios: { pk: "id" },
  logs: { pk: "id" },
  empresas: { pk: "id" }
};

function getTable(tableName) {
  return TABLES[tableName];
}

export async function query(sql, params = []) {
  if (!usePG) {
    throw new Error("SQLite no está soportado");
  }
  const client = await pgPool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function insert(table, data) {
  const tableDef = getTable(table);
  if (!tableDef) throw new Error(`Tabla ${table} no existe`);
  
  const keys = Object.keys(data);
  const values = keys.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${values.join(", ")}) RETURNING *`;
  const result = await query(sql, Object.values(data));
  return result[0] || null;
}

export async function update(table, id, data) {
  const tableDef = getTable(table);
  if (!tableDef) throw new Error(`Tabla ${table} no existe`);
  
  const keys = Object.keys(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${tableDef.pk} = $${keys.length + 1} RETURNING *`;
  const result = await query(sql, [...Object.values(data), id]);
  return result[0] || null;
}

export async function remove(table, id) {
  const tableDef = getTable(table);
  if (!tableDef) throw new Error(`Tabla ${table} no existe`);
  
  const sql = `DELETE FROM ${table} WHERE ${tableDef.pk} = $1 RETURNING *`;
  const result = await query(sql, [id]);
  return result[0] || null;
}

export async function find(table, filters = {}) {
  const keys = Object.keys(filters);
  if (keys.length === 0) {
    const sql = `SELECT * FROM ${table}`;
    return await query(sql);
  }
  const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(" AND ");
  const sql = `SELECT * FROM ${table} WHERE ${conditions}`;
  return await query(sql, Object.values(filters));
}

export async function findOne(table, filters = {}) {
  const rows = await find(table, filters);
  return rows[0] || null;
}

export default {
  initDB,
  loadFullState,
  saveFullState,
  closeDB,
  query,
  queryOne,
  insert,
  update,
  remove,
  find,
  findOne,
  jsonCol,
  parseCol
};

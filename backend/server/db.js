import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { SCHEMA } from "./schema.js";
import { env } from "./env.js";
import pgPool, { initPGDB, loadFullStatePG, saveFullStatePG, closePGDB, COLUMN_CASE_MAP } from "./pgdb.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
let usePG = env.DB_TYPE === "postgresql";

export function initDB() {
  if (usePG) {
    return initPGDB();
  }
  throw new Error("SQLite no está soportado. Usa DB_TYPE=postgresql en .env");
}

export function loadFullState(tenantId) {
  if (usePG) return loadFullStatePG(tenantId);
  throw new Error("SQLite no está soportado");
}

export function saveFullState(data, tenantId) {
  if (usePG) return saveFullStatePG(data, tenantId);
  throw new Error("SQLite no está soportado");
}

export function closeDB() {
  if (usePG) return closePGDB();
}

export function jsonCol(val) { return val ? JSON.stringify(val) : null; }
export function parseCol(val) { return val ? JSON.parse(val) : null; }

// Postgres guarda cualquier nombre de columna SIN comillas en minusculas -
// aunque el CREATE TABLE en pgdb.js este escrito como "pedidoId", la
// columna real en la base de datos queda "pedidoid", y pg devuelve las
// filas con esa misma clave en minusculas. Todo el codigo de negocio (el
// original y el restaurado) fue escrito esperando camelCase
// (fila.pedidoId, fila.saldoCartera, etc.) - sin esto, cada lectura de un
// campo con mas de una palabra devuelve undefined en silencio. Mapa
// explicito (no adivinado por regex) porque una conversion automatica
// minuscula->camelCase no es reversible de forma confiable.
function camelizeRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[COLUMN_CASE_MAP[key] || key] = value;
  }
  return out;
}

function camelizeRows(rows) {
  return rows.map(camelizeRow);
}

const TABLES = {
  empresa: { pk: "id" },
  sedes: { pk: "id" },
  bodegas: { pk: "id" },
  roles: { pk: "id" },
  planCuentas: { pk: "codigo" },
  cajasBancos: { pk: "id" },
  terceros: { pk: "id" },
  productos: { pk: "id" },
  productoStock: { pk: null }, // clave compuesta (productoId, bodegaId) - no usar update()/remove() genericos con esta tabla
  empleados: { pk: "id" },
  consecutivos: { pk: "tipo" },
  cotizaciones: { pk: "id" },
  pedidos: { pk: "id" },
  remisiones: { pk: "id" },
  facturas: { pk: "id" },
  ordenesCompra: { pk: "id" },
  recepciones: { pk: "id" },
  facturasCompra: { pk: "id" },
  movimientosInventario: { pk: "id" },
  movimientosTesoreria: { pk: "id" },
  comprobantes: { pk: "id" },
  nominas: { pk: "id" },
  auditLog: { pk: "id" },
  usuarios: { pk: "id" }
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
    return camelizeRows(result.rows);
  } finally {
    client.release();
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Corre un bloque de operaciones dentro de una unica transaccion real de
 * Postgres (BEGIN/COMMIT/ROLLBACK sobre la MISMA conexion) - query()/
 * queryOne() de arriba, en cambio, sacan una conexion nueva del pool en
 * cada llamada, asi que dos queries seguidas ahi nunca comparten
 * transaccion. Esto es necesario para las operaciones de negocio reales
 * (facturar, recibir pago, liquidar nomina, etc.) donde varias tablas se
 * actualizan juntas (factura + saldo del tercero + comprobante contable) y
 * o se guardan todas o ninguna - antes de esto, un error a mitad de camino
 * podia dejar la factura creada pero el comprobante contable sin cuadrar.
 *
 * El callback recibe un objeto { query, queryOne } que corre sobre la
 * conexion en transaccion (NO usar el query()/queryOne() de arriba adentro
 * del callback, romperia el aislamiento).
 */
/**
 * tenantId (opcional): si se pasa, queda activo para TODA la transaccion
 * via `set_config('app.current_tenant_id', ..., true)` - el `true` final es
 * el flag "is_local" de Postgres, que hace que el valor se resetee solo al
 * terminar la transaccion (COMMIT o ROLLBACK), sin filtrar a la proxima vez
 * que este mismo cliente pooled se reutilice para otra request.
 *
 * Esto es lo que hace que las politicas RLS de la migracion 002
 * (tenant_isolation, ver migrations.js) filtren de verdad: sin este SET, el
 * current_setting() que lee cada politica siempre devuelve NULL/'' y esa
 * politica lo interpreta como "sin tenant activo -> ver todo" (el modo
 * superadmin de plataforma) para CUALQUIER conexion, no solo para el
 * superadmin real. Omitir tenantId (o pasar '') es exactamente ese modo
 * superadmin/plataforma - lo usan las migraciones y el bootstrap de admin.
 */
export async function transaction(callback, tenantId) {
  if (!usePG) {
    throw new Error("SQLite no está soportado");
  }
  const client = await pgPool.connect();
  // tx.tenantId queda disponible para cualquier helper que reciba `tx` (
  // pushAuditTx, nextConsecutivoTx, crearComprobanteSQLTx,
  // moverInventarioSQLTx) sin tener que agregarles un parametro nuevo a
  // cada uno - todos ya reciben `tx`, y el valor coincide exactamente con
  // el que se acaba de fijar en la sesion de Postgres via set_config.
  const tx = {
    query: async (sql, params = []) => camelizeRows((await client.query(sql, params)).rows),
    queryOne: async (sql, params = []) => camelizeRow((await client.query(sql, params)).rows[0]) || null,
    tenantId: tenantId || null,
  };
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId || ""]);
    const result = await callback(tx);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Todas las columnas existentes se crearon SIN comillas en el CREATE TABLE
// original, asi que Postgres las plego a minusculas (sedeId -> sedeid) y
// referenciarlas sin comillas (como hacen insert/update/find de abajo) las
// resuelve bien. "tenantId" es la unica excepcion: la migracion 002 la
// agrego CON comillas (`ADD COLUMN IF NOT EXISTS "tenantId"`) a proposito,
// para que coincida con como ya se referencia en todo el resto del codigo
// (business.js, pgdb.js) - sin citarla aca tambien, Postgres la plegaria a
// "tenantid" y fallaria con "no existe la columna «tenantid»" (columna
// real: "tenantId", mixed-case).
const qcol = (c) => (c === "tenantId" ? '"tenantId"' : c);

export async function insert(table, data) {
  const tableDef = getTable(table);
  if (!tableDef) throw new Error(`Tabla ${table} no existe`);

  const keys = Object.keys(data);
  const values = keys.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO ${table} (${keys.map(qcol).join(", ")}) VALUES (${values.join(", ")}) RETURNING *`;
  const result = await query(sql, Object.values(data));
  return result[0] || null;
}

export async function update(table, id, data) {
  const tableDef = getTable(table);
  if (!tableDef) throw new Error(`Tabla ${table} no existe`);

  const keys = Object.keys(data);
  const setClause = keys.map((key, i) => `${qcol(key)} = $${i + 1}`).join(", ");
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
  const conditions = keys.map((key, i) => `${qcol(key)} = $${i + 1}`).join(" AND ");
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
  transaction,
  insert,
  update,
  remove,
  find,
  findOne,
  jsonCol,
  parseCol
};

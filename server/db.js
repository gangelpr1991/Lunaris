import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { SCHEMA } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "..", "lunaris_v2.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA);

export function initDB() {}

function jsonCol(val) { return val ? JSON.stringify(val) : null; }
function parseCol(val) { return val ? JSON.parse(val) : null; }

const TABLES = {
  empresa: { pk: "id" },
  sedes: { pk: "id" },
  bodegas: { pk: "id" },
  roles: { pk: "id", colMap: { desc: "descripcion" } },
  planCuentas: { pk: "codigo" },
  cajasBancos: { pk: "id" },
  terceros: { pk: "id" },
  productos: { pk: "id", exclude: ["stock"] },
  empleados: { pk: "id" },
  cotizaciones: { pk: "id", jsonCols: ["items"] },
  pedidos: { pk: "id", jsonCols: ["items"] },
  remisiones: { pk: "id", jsonCols: ["items"] },
  facturas: { pk: "id", jsonCols: ["items", "pagos"] },
  ordenesCompra: { pk: "id", jsonCols: ["items", "recibidoItems"] },
  recepciones: { pk: "id", jsonCols: ["items"] },
  facturasCompra: { pk: "id", jsonCols: ["items"] },
  movimientosInventario: { pk: "id" },
  movimientosTesoreria: { pk: "id" },
  comprobantes: { pk: "id", jsonCols: ["lineas", "origen"] },
  nominas: { pk: "id", jsonCols: ["deducciones", "aportesPatronales", "prestaciones"] },
  auditLog: { pk: "id" },
};

const CONSECUTIVOS_TABLE = "consecutivos";
const STOCK_TABLE = "producto_stock";

function mapRow(row, tableConfig) {
  if (!row) return null;
  const result = { ...row };
  if (tableConfig.jsonCols) {
    for (const col of tableConfig.jsonCols) {
      if (result[col] !== undefined) result[col] = parseCol(result[col]);
    }
  }
  if (tableConfig.colMap) {
    for (const [dbCol, jsKey] of Object.entries(tableConfig.colMap)) {
      if (result[dbCol] !== undefined) {
        result[jsKey] = result[dbCol];
        delete result[dbCol];
      }
    }
  }
  return result;
}

export function loadFullState() {
  const state = { consecutivos: {} };

  for (const [table, config] of Object.entries(TABLES)) {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    state[table] = rows.map((r) => mapRow(r, config));
  }

  const consecutivos = db.prepare(`SELECT * FROM ${CONSECUTIVOS_TABLE}`).all();
  for (const r of consecutivos) state.consecutivos[r.tipo] = r.valor;

  const stockRows = db.prepare(`SELECT * FROM ${STOCK_TABLE}`).all();
  for (const p of state.productos) {
    p.stock = {};
    for (const s of stockRows) {
      if (s.productoId === p.id) p.stock[s.bodegaId] = s.cantidad;
    }
  }

  return state;
}

export function saveFullState(data) {
  const tx = db.transaction(() => {
    const orderedTables = [
      "nominas", "comprobantes", "auditLog",
      "movimientosTesoreria", "movimientosInventario",
      "facturasCompra", "recepciones", "ordenesCompra",
      "facturas", "remisiones", "pedidos", "cotizaciones",
      "terceros", "productos", "empleados",
      "cajasBancos", "bodegas", "sedes",
      "roles", "planCuentas", "empresa",
    ];

    for (const table of orderedTables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.prepare(`DELETE FROM ${CONSECUTIVOS_TABLE}`).run();
    db.prepare(`DELETE FROM ${STOCK_TABLE}`).run();

    for (const [table, config] of Object.entries(TABLES)) {
      const rows = data[table] || [];
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0])
        .filter((c) => !config.exclude?.includes(c))
        .map((c) => (config.colMap?.[c] ? config.colMap[c] : c));

      const insert = db.prepare(
        `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
      );

      for (const row of rows) {
        const values = cols.map((c) => {
          const val = row[c];
          if (config.jsonCols?.includes(c)) return jsonCol(val);
          if (config.colMap) {
            const reverse = Object.entries(config.colMap).find(([, v]) => v === c);
            if (reverse) c = reverse[0];
          }
          return val;
        });
        insert.run(...values);
      }
    }

    if (data.consecutivos) {
      const cs = db.prepare("INSERT INTO consecutivos (tipo, valor) VALUES (?, ?)");
      for (const [tipo, valor] of Object.entries(data.consecutivos)) {
        cs.run(tipo, valor);
      }
    }

    const st = db.prepare("INSERT INTO producto_stock (productoId, bodegaId, cantidad) VALUES (?, ?, ?)");
    for (const p of data.productos || []) {
      if (p.stock) {
        for (const [bodegaId, cantidad] of Object.entries(p.stock)) {
          st.run(p.id, bodegaId, cantidad);
        }
      }
    }
  });

  tx();
}

export default db;

import pg from "pg";
import { env } from "./env.js";

const pool = new pg.Pool({
  host: env.PG_HOST || "localhost",
  port: env.PG_PORT || 5432,
  database: env.PG_DATABASE || "lunaris",
  user: env.PG_USER || "postgres",
  password: env.PG_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let initialized = false;

export async function initPGDB() {
  if (initialized) return;
  const client = await pool.connect();
  try {
    await client.query(PG_SCHEMA);
    initialized = true;
  } finally {
    client.release();
  }
}

export async function closePGDB() {
  await pool.end();
  initialized = false;
}

function jsonCol(val) {
  return val ? JSON.stringify(val) : null;
}

const TABLES = {
  empresa: { pk: "id" },
  sedes: { pk: "id" },
  bodegas: { pk: "id" },
  roles: { pk: "id", colMap: { descripcion: "desc" } },
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
  usuarios: { pk: "id" },
};

const CONSECUTIVOS_TABLE = "consecutivos";
const STOCK_TABLE = "productoStock";

export const COLUMN_CASE_MAP = {
  sedeid: "sedeId", tipodoc: "tipoDoc", numdoc: "numDoc", cupocredito: "cupoCredito",
  condicionpagodias: "condicionPagoDias", listaprecios: "listaPrecios", saldocartera: "saldoCartera",
  saldocxp: "saldoCxP", creadoen: "creadoEn", costopromedio: "costoPromedio", tienelote: "tieneLote",
  productoid: "productoId", bodegaid: "bodegaId", areaid: "areaId", tipocontrato: "tipoContrato",
  fechaingreso: "fechaIngreso", terceroid: "terceroId", cotizacionid: "cotizacionId",
  pedidoid: "pedidoId", remisionid: "remisionId", ocid: "ocId", proveedorid: "proveedorId",
  recepcionid: "recepcionId", vencimiento: "vencimiento", estadodian: "estadoDian", cufe: "cufe",
  motivoanulacion: "motivoAnulacion", recibiditems: "recibidoItems", costounitario: "costoUnitario",
  saldoresultante: "saldoResultante", cajabancoid: "cajaBancoId", totaldebito: "totalDebito",
  totalcredito: "totalCredito", empleadoid: "empleadoId", empleadonombre: "empleadoNombre",
  salariobase: "salarioBase", auxtransporte: "auxTransporte", deduccionestotal: "deduccionesTotal",
  netopagar: "netoPagar", aportespatronales: "aportesPatronales", aportespatronalestotal: "aportesPatronalesTotal",
  prestacionestotal: "prestacionesTotal", costototalempresa: "costoTotalEmpresa", password_hash: "passwordHash",
  created_at: "createdAt", razonsocial: "razonSocial", zonahoraria: "zonaHoraria"
};

function camelizeRowPG(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[COLUMN_CASE_MAP[key] || key] = value;
  }
  return out;
}

function mapRow(row, tableConfig) {
  if (!row) return null;
  let result = { ...row };
  if (tableConfig.jsonCols) {
    for (const col of tableConfig.jsonCols) {
      if (result[col] !== undefined && typeof result[col] === "string") {
        result[col] = JSON.parse(result[col]);
      }
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
  result = camelizeRowPG(result);
  return result;
}

/**
 * tenantId es OBLIGATORIO aca (a diferencia de db.transaction, que lo trata
 * como opcional para las migraciones): estos dos endpoints (/api/estado
 * GET/PUT) leen y sobreescriben TODAS las tablas de negocio de un tenant de
 * una sola vez, y saveFullStatePG hace un DELETE por tabla antes de
 * reinsertar - sin un tenantId real para acotar ese DELETE, un guardado de
 * cualquier empresa borraria los datos de TODAS las empresas (ver
 * index.js, que rechaza la llamada si el usuario autenticado no tiene
 * tenantId - hoy eso es solo el superadmin de plataforma, que no deberia
 * usar el sync de estado completo de una empresa puntual de todas formas).
 */
export async function loadFullStatePG(tenantId) {
  if (!tenantId) throw new Error("loadFullStatePG requiere un tenantId.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
    const state = { consecutivos: {} };

    for (const [table, config] of Object.entries(TABLES)) {
      const result = await client.query(`SELECT * FROM ${table}`);
      state[table] = result.rows.map((r) => mapRow(r, config));
    }

    const consecRes = await client.query(`SELECT * FROM ${CONSECUTIVOS_TABLE}`);
    for (const r of consecRes.rows) state.consecutivos[r.tipo] = r.valor;

    const stockRes = await client.query(`SELECT * FROM ${STOCK_TABLE}`);
    for (const p of state.productos) {
      p.stock = {};
      for (const s of stockRes.rows) {
        if (s.productoid === p.id) p.stock[s.bodegaid] = s.cantidad;
      }
    }

    // "empresa" es la unica tabla de TABLES que conceptualmente tiene
    // exactamente UNA fila por tenant (la sembrada por crearTenant en
    // business.js) - el loop generico de arriba la deja como array (como
    // cualquier otra tabla), pero el frontend siempre la trato como un
    // objeto unico (data.empresa.razonSocial, nunca data.empresa[0]...).
    // Esto nunca se habia notado porque el frontend nunca leyo data.empresa
    // de verdad hasta el panel de Plataforma - antes usaba una constante
    // estatica de demostracion en su lugar.
    state.empresa = state.empresa[0] || null;

    await client.query("COMMIT");
    return state;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function saveFullStatePG(data, tenantId) {
  if (!tenantId) throw new Error("saveFullStatePG requiere un tenantId.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);

    const orderedTables = [
      "nominas", "comprobantes", "auditLog",
      "movimientosTesoreria", "movimientosInventario",
      "facturasCompra", "recepciones", "ordenesCompra",
      "facturas", "remisiones", "pedidos", "cotizaciones",
      "terceros", "productos", "empleados",
      "cajasBancos", "bodegas", "sedes",
      "roles", "planCuentas", "empresa",
      "usuarios",
    ];

    // DELETE acotado por tenantId: sin el WHERE, esto borraria la tabla
    // entera (todos los tenants). RLS ya filtraria las lecturas, pero un
    // DELETE FROM sin WHERE no depende de RLS para decidir que filas
    // toca - toca todas las que la politica deja ver, y con FORCE ROW
    // LEVEL SECURITY activo (migracion 002) eso ya esta acotado al tenant
    // actual de la sesion - el WHERE explicito es una segunda capa
    // (defensa en profundidad) por si alguna vez se corre esto con un rol
    // que bypasea RLS.
    for (const table of orderedTables) {
      if (Object.prototype.hasOwnProperty.call(data, table)) {
        await client.query(`DELETE FROM ${table} WHERE "tenantId" = $1`, [tenantId]);
      }
    }
    if (Object.prototype.hasOwnProperty.call(data, CONSECUTIVOS_TABLE)) {
      await client.query(`DELETE FROM ${CONSECUTIVOS_TABLE} WHERE "tenantId" = $1`, [tenantId]);
    }
    if (Object.prototype.hasOwnProperty.call(data, "productos")) {
      await client.query(`DELETE FROM ${STOCK_TABLE} WHERE "tenantId" = $1`, [tenantId]);
    }

    for (const [table, config] of Object.entries(TABLES)) {
      if (!Object.prototype.hasOwnProperty.call(data, table)) continue;
      const rows = Array.isArray(data[table]) ? data[table] : data[table] ? [data[table]] : [];
      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0])
        .filter((c) => !config.exclude?.includes(c) && c !== "tenantId")
        .map((c) => {
          const reverse = Object.entries(config.colMap || {}).find(([, v]) => v === c);
          return reverse ? reverse[0] : c;
        });
      // "tenantId" SIEMPRE se fija server-side con el tenant del usuario
      // autenticado, nunca con lo que venga en el payload - de lo
      // contrario un cliente malicioso (o un bug de frontend) podria
      // escribir filas en el tenant de otra empresa con solo mandar un
      // tenantId distinto en el JSON.
      cols.push('"tenantId"');

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const insertSQL = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = cols.slice(0, -1).map((c) => {
          const jsKey = config.colMap?.[c] || c;
          let val = row[jsKey];
          if (config.jsonCols?.includes(jsKey)) val = jsonCol(val);
          return val;
        });
        values.push(tenantId);
        await client.query(insertSQL, values);
      }
    }

    if (data.consecutivos) {
      for (const [tipo, valor] of Object.entries(data.consecutivos)) {
        await client.query(
          `INSERT INTO consecutivos ("tenantId", tipo, valor) VALUES ($1, $2, $3) ON CONFLICT ("tenantId", tipo) DO UPDATE SET valor = $3`,
          [tenantId, tipo, valor]
        );
      }
    }

    for (const p of data.productos || []) {
      if (p.stock) {
        for (const [bodegaId, cantidad] of Object.entries(p.stock)) {
          await client.query(
            `INSERT INTO productoStock ("tenantId", productoId, bodegaId, cantidad) VALUES ($1, $2, $3, $4) ON CONFLICT ("tenantId", productoId, bodegaId) DO UPDATE SET cantidad = $4`,
            [tenantId, p.id, bodegaId, cantidad]
          );
        }
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export default pool;

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS empresa (
  id TEXT PRIMARY KEY, razonSocial TEXT, nit TEXT, responsabilidad TEXT,
  direccion TEXT, telefono TEXT, email TEXT, moneda TEXT, zonaHoraria TEXT
);

CREATE TABLE IF NOT EXISTS sedes (
  id TEXT PRIMARY KEY, nombre TEXT, ciudad TEXT
);

CREATE TABLE IF NOT EXISTS bodegas (
  id TEXT PRIMARY KEY, nombre TEXT, sedeId TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY, nombre TEXT, descripcion TEXT
);

CREATE TABLE IF NOT EXISTS planCuentas (
  codigo TEXT PRIMARY KEY, nombre TEXT, clase TEXT, naturaleza TEXT
);

CREATE TABLE IF NOT EXISTS cajasBancos (
  id TEXT PRIMARY KEY, tipo TEXT, nombre TEXT, sedeId TEXT, saldo REAL
);

CREATE TABLE IF NOT EXISTS terceros (
  id TEXT PRIMARY KEY, tipo TEXT, tipoDoc TEXT, numDoc TEXT, nombre TEXT,
  email TEXT, telefono TEXT, ciudad TEXT, cupoCredito REAL, condicionPagoDias INTEGER,
  listaPrecios TEXT, saldoCartera REAL DEFAULT 0, saldoCxP REAL DEFAULT 0, creadoEn TEXT
);

CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY, codigo TEXT UNIQUE, nombre TEXT, categoria TEXT, unidad TEXT,
  precio REAL, costoPromedio REAL, iva INTEGER DEFAULT 19, tieneLote INTEGER DEFAULT 0, minimo REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productoStock (
  productoId TEXT, bodegaId TEXT, cantidad REAL DEFAULT 0,
  PRIMARY KEY (productoId, bodegaId)
);

CREATE TABLE IF NOT EXISTS empleados (
  id TEXT PRIMARY KEY, nombre TEXT, cargo TEXT, areaId TEXT, sedeId TEXT,
  salario REAL, tipoContrato TEXT, fechaIngreso TEXT
);

CREATE TABLE IF NOT EXISTS consecutivos (
  tipo TEXT PRIMARY KEY, valor INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cotizaciones (
  id TEXT PRIMARY KEY, numero TEXT, terceroId TEXT, sedeId TEXT, vendedor TEXT,
  fecha TEXT, subtotal REAL, iva REAL, total REAL, estado TEXT,
  items TEXT
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY, numero TEXT, cotizacionId TEXT, terceroId TEXT, sedeId TEXT,
  fecha TEXT, subtotal REAL, iva REAL, total REAL, estado TEXT,
  items TEXT
);

CREATE TABLE IF NOT EXISTS remisiones (
  id TEXT PRIMARY KEY, numero TEXT, pedidoId TEXT, terceroId TEXT, bodegaId TEXT,
  fecha TEXT, items TEXT, estado TEXT
);

CREATE TABLE IF NOT EXISTS facturas (
  id TEXT PRIMARY KEY, numero TEXT, remisionId TEXT, pedidoId TEXT, terceroId TEXT,
  sedeId TEXT, fecha TEXT, vencimiento TEXT, subtotal REAL, iva REAL, total REAL,
  saldo REAL, estado TEXT, estadoDian TEXT, cufe TEXT, motivoAnulacion TEXT,
  items TEXT, pagos TEXT
);

CREATE TABLE IF NOT EXISTS ordenesCompra (
  id TEXT PRIMARY KEY, numero TEXT, proveedorId TEXT, sedeId TEXT, bodegaId TEXT,
  fecha TEXT, total REAL, estado TEXT, recibidoItems TEXT,
  items TEXT
);

CREATE TABLE IF NOT EXISTS recepciones (
  id TEXT PRIMARY KEY, numero TEXT, ocId TEXT, fecha TEXT, items TEXT
);

CREATE TABLE IF NOT EXISTS facturasCompra (
  id TEXT PRIMARY KEY, numero TEXT, recepcionId TEXT, ocId TEXT, proveedorId TEXT,
  fecha TEXT, vencimiento TEXT, subtotal REAL, iva REAL, total REAL, saldo REAL,
  estado TEXT, items TEXT
);

CREATE TABLE IF NOT EXISTS movimientosInventario (
  id TEXT PRIMARY KEY, productoId TEXT, bodegaId TEXT, cantidad REAL,
  tipo TEXT, origen TEXT, fecha TEXT, saldoResultante REAL
);

CREATE TABLE IF NOT EXISTS movimientosTesoreria (
  id TEXT PRIMARY KEY, cajaBancoId TEXT, tipo TEXT, concepto TEXT, monto REAL, fecha TEXT
);

CREATE TABLE IF NOT EXISTS comprobantes (
  id TEXT PRIMARY KEY, numero TEXT, tipo TEXT, fecha TEXT, origen TEXT,
  glosa TEXT, totalDebito REAL, totalCredito REAL, balanceado INTEGER,
  lineas TEXT
);

CREATE TABLE IF NOT EXISTS nominas (
  id TEXT PRIMARY KEY, periodo TEXT, fecha TEXT, empleadoId TEXT,
  empleadoNombre TEXT, cargo TEXT, salarioBase REAL, auxTransporte REAL,
  deducciones TEXT, deduccionesTotal REAL, netoPagar REAL,
  aportesPatronales TEXT, aportesPatronalesTotal REAL,
  prestaciones TEXT, prestacionesTotal REAL, costoTotalEmpresa REAL
);

CREATE TABLE IF NOT EXISTS auditLog (
  id TEXT PRIMARY KEY, fecha TEXT, usuario TEXT, rol TEXT, accion TEXT, detalle TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL, rol TEXT NOT NULL DEFAULT 'consulta',
  activo INTEGER DEFAULT 1, created_at TEXT
);
`;

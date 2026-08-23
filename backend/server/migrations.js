import db from "./db.js";
import logger from "./logger.js";

const MIGRATIONS_TABLE = "_migrations";

export async function initMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

const migrations = [];

export function defineMigration(name, up) {
  migrations.push({ name, up });
}

async function getApplied() {
  const rows = await db.query(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`);
  return new Set(rows.map((r) => r.name));
}

export async function runMigrations() {
  await initMigrations();
  const applied = await getApplied();
  const pending = migrations.filter((m) => !applied.has(m.name));

  if (pending.length === 0) {
    logger.info("Migraciones: todas al dia.");
    return;
  }

  logger.info(`Migraciones: ${pending.length} pendiente(s).`);
  for (const m of pending) {
    try {
      logger.info(`Migrando: ${m.name}`);
      await db.transaction(async (tx) => {
        await m.up(tx);
        await tx.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (name, applied_at) VALUES ($1, $2)`,
          [m.name, new Date().toISOString()]
        );
      });
      logger.info(`Migracion aplicada: ${m.name}`);
    } catch (e) {
      logger.error(`Error en migracion: ${e.message}`);
      throw e;
    }
  }
  logger.info(`Migraciones completadas: ${pending.length} aplicada(s).`);
}

defineMigration("001_create_usuarios", async (tx) => {
  await tx.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'consulta',
      activo INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);
});

// ============================================================
// 002 — Multi-tenancy: tabla de tenants + tenantId en cada tabla + RLS
// ============================================================
// IMPORTANTE: esta migracion NO fue probada contra Postgres real todavia
// (mi entorno de pruebas se cayo a mitad de camino). Antes de correrla
// contra tu base real, prueba primero contra una copia (ver instrucciones
// que te di aparte). Si algo falla, la migracion completa se revierte sola
// (esta dentro de una transaccion), asi que no deberia dejar tu base a
// medio migrar - pero aun asi, prueba primero contra la copia.
defineMigration("002_add_multitenancy", async (tx) => {
  // 1. La tabla de tenants (empresas cliente) en si
  await tx.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      activo INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);

  // 2. Un tenant "de transicion" que se queda con todos los datos que ya
  // existen hoy (los de tus pruebas locales) - asi ninguna fila queda
  // huerfana cuando la columna tenantId se vuelva obligatoria mas abajo.
  const existeDemo = await tx.queryOne("SELECT id FROM tenants WHERE slug = $1", ["demo"]);
  const demoTenantId = existeDemo?.id || "tenant-demo";
  if (!existeDemo) {
    await tx.query(
      "INSERT INTO tenants (id, slug, nombre, activo, created_at) VALUES ($1,$2,$3,$4,$5)",
      [demoTenantId, "demo", "Empresa Demo (datos de prueba previos a multi-tenant)", 1, new Date().toISOString()]
    );
  }

  // 3. Las 24 tablas de negocio que necesitan quedar aisladas por tenant.
  // Nota: "usuarios" se maneja aparte mas abajo porque su tenantId debe
  // quedar NULLABLE (un usuario sin tenant = superadmin de plataforma, ve
  // todas las empresas - el resto de usuarios SI tienen un tenant fijo).
  const tablasNegocio = [
    "sedes", "bodegas", "roles", "planCuentas", "cajasBancos", "terceros",
    "productos", "productoStock", "empleados", "consecutivos", "cotizaciones",
    "pedidos", "remisiones", "facturas", "ordenesCompra", "recepciones",
    "facturasCompra", "movimientosInventario", "movimientosTesoreria",
    "comprobantes", "nominas", "auditLog", "empresa",
  ];

  for (const tabla of tablasNegocio) {
    // Se agrega nullable primero (para poder rellenar los datos que ya
    // existen), luego se rellena, y AL FINAL se vuelve NOT NULL - hacerlo
    // NOT NULL desde el insert fallaria contra las filas que ya existen.
    await tx.query(`ALTER TABLE ${tabla} ADD COLUMN IF NOT EXISTS "tenantId" TEXT`);
    await tx.query(`UPDATE ${tabla} SET "tenantId" = $1 WHERE "tenantId" IS NULL`, [demoTenantId]);
    await tx.query(`ALTER TABLE ${tabla} ALTER COLUMN "tenantId" SET NOT NULL`);
    await tx.query(`ALTER TABLE ${tabla} ADD CONSTRAINT fk_${tabla.toLowerCase()}_tenant FOREIGN KEY ("tenantId") REFERENCES tenants(id)`);
    await tx.query(`CREATE INDEX IF NOT EXISTS idx_${tabla.toLowerCase()}_tenant ON ${tabla} ("tenantId")`);
  }

  // 4. usuarios: tenantId SI puede ser nulo (superadmin de plataforma).
  await tx.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "tenantId" TEXT REFERENCES tenants(id)`);
  await tx.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios ("tenantId")`);

  // 5. Restricciones de unicidad que antes eran globales y ahora deben ser
  // por tenant (dos empresas distintas SI pueden usar el mismo codigo de
  // producto o el mismo tipo de consecutivo, cada una con su propia
  // numeracion independiente).
  await tx.query(`ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_codigo_key`);
  await tx.query(`ALTER TABLE productos ADD CONSTRAINT productos_tenant_codigo_key UNIQUE ("tenantId", codigo)`);

  await tx.query(`ALTER TABLE consecutivos DROP CONSTRAINT IF EXISTS consecutivos_pkey`);
  await tx.query(`ALTER TABLE consecutivos ADD PRIMARY KEY ("tenantId", tipo)`);

  await tx.query(`ALTER TABLE "planCuentas" DROP CONSTRAINT IF EXISTS "planCuentas_pkey"`);
  await tx.query(`ALTER TABLE "planCuentas" ADD PRIMARY KEY ("tenantId", codigo)`);

  await tx.query(`ALTER TABLE "productoStock" DROP CONSTRAINT IF EXISTS "productoStock_pkey"`);
  await tx.query(`ALTER TABLE "productoStock" ADD PRIMARY KEY ("tenantId", "productoId", "bodegaId")`);

  // 6. Row Level Security: el candado real. Aunque alguna consulta de
  // negocio se olvide del WHERE tenantId = ..., Postgres bloquea igual
  // que se vea/toque una fila de otro tenant. FORCE es necesario ademas de
  // ENABLE porque, sin FORCE, el dueno de la tabla (el usuario "postgres"
  // que usa la app) se salta las politicas por defecto.
  for (const tabla of [...tablasNegocio, "usuarios"]) {
    await tx.query(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
    await tx.query(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
    // Los usuarios de plataforma (tenantId NULL) pasan la politica cuando
    // no hay tenant activo en la sesion (current_setting devuelve NULL con
    // el flag "true" de "no falles si no existe") - esto es lo que le
    // permite a un superadmin ver usuarios de cualquier empresa.
    await tx.query(`
      DROP POLICY IF EXISTS tenant_isolation ON ${tabla};
      CREATE POLICY tenant_isolation ON ${tabla}
        USING ("tenantId" = current_setting('app.current_tenant_id', true)
               OR current_setting('app.current_tenant_id', true) IS NULL
               OR current_setting('app.current_tenant_id', true) = '')
    `);
  }
});

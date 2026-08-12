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

import db from "./db.js";
import logger from "./logger.js";

const MIGRATIONS_TABLE = "_migrations";

export function initMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

const migrations = [];

export function defineMigration(name, up) {
  migrations.push({ name, up });
}

function getApplied() {
  const rows = db.prepare(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`).all();
  return new Set(rows.map((r) => r.name));
}

export function runMigrations() {
  initMigrations();
  const applied = getApplied();
  const pending = migrations.filter((m) => !applied.has(m.name));

  if (pending.length === 0) {
    logger.info("Migraciones: todas al dia.");
    return;
  }

  logger.info(`Migraciones: ${pending.length} pendiente(s).`);
  const tx = db.transaction(() => {
    for (const m of pending) {
      logger.info(`Migrando: ${m.name}`);
      m.up(db);
      db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (name, applied_at) VALUES (?, ?)`).run(
        m.name,
        new Date().toISOString()
      );
      logger.info(`Migracion aplicada: ${m.name}`);
    }
  });

  try {
    tx();
    logger.info(`Migraciones completadas: ${pending.length} aplicada(s).`);
  } catch (e) {
    logger.error(`Error en migracion: ${e.message}`);
    throw e;
  }
}

defineMigration("001_create_usuarios", (db) => {
  db.exec(`
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

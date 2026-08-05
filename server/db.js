import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "..", "lunaris.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS estado (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL
  );
  INSERT OR IGNORE INTO estado (id, data) VALUES (1, '{}');
`);

const getStmt = db.prepare("SELECT data FROM estado WHERE id = 1");
const saveStmt = db.prepare("UPDATE estado SET data = ? WHERE id = 1");

export async function initDB() {
  console.log("SQLite conectado — lunaris.db lista.");
}

export async function getEstado() {
  const row = getStmt.get();
  return row ? JSON.parse(row.data) : {};
}

export async function saveEstado(data) {
  saveStmt.run(JSON.stringify(data));
}

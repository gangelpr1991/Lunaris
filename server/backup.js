import { CronJob } from "cron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { env } from "./env.js";
import logger from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = join(__dirname, "..", env.BACKUP_DIR || "./backups");

function ensureDir() {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

function cleanupOldBackups() {
  const retentionMs = (env.BACKUP_RETENTION_DAYS || 30) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    const files = readdirSync(BACKUP_DIR);
    for (const file of files) {
      const filePath = join(BACKUP_DIR, file);
      const stats = statSync(filePath);
      if (now - stats.mtimeMs > retentionMs) {
        unlinkSync(filePath);
        logger.info(`Backup eliminado (expirado): ${file}`);
      }
    }
  } catch (e) {
    logger.warn(`Error limpiando backups antiguos: ${e.message}`);
  }
}

function backupSQLite() {
  const dbPath = join(__dirname, "..", "lunaris_v2.db");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = join(BACKUP_DIR, `lunaris_v2_${timestamp}.db`);

  try {
    copyFileSync(dbPath, backupFile);
    logger.info(`Backup SQLite creado: ${backupFile}`);
    return backupFile;
  } catch (e) {
    logger.error(`Error en backup SQLite: ${e.message}`);
    return null;
  }
}

function backupPostgreSQL() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = join(BACKUP_DIR, `lunaris_pg_${timestamp}.sql`);

  try {
    const envVars = `PGPASSWORD=${env.PG_PASSWORD}`;
    execSync(
      `${envVars} pg_dump -h ${env.PG_HOST} -p ${env.PG_PORT} -U ${env.PG_USER} -d ${env.PG_DATABASE} -F p > "${backupFile}"`,
      { stdio: "pipe", timeout: 30000 }
    );
    logger.info(`Backup PostgreSQL creado: ${backupFile}`);
    return backupFile;
  } catch (e) {
    logger.error(`Error en backup PostgreSQL: ${e.message}. ¿pg_dump está instalado?`);
    return null;
  }
}

function runBackup() {
  ensureDir();

  if (env.DB_TYPE === "postgresql") {
    backupPostgreSQL();
  } else {
    backupSQLite();
  }

  cleanupOldBackups();
}

let backupJob = null;

export function startBackupScheduler() {
  if (env.BACKUP_ENABLED !== "true") {
    logger.info("Backups automáticos deshabilitados (BACKUP_ENABLED=false)");
    return;
  }

  const intervalHours = env.BACKUP_INTERVAL_HOURS || 24;
  const cronExpression = `0 */${intervalHours} * * *`;

  ensureDir();
  logger.info(`Backups automáticos configurados: cada ${intervalHours}h, retención ${env.BACKUP_RETENTION_DAYS}d`);
  logger.info(`Directorio de backups: ${BACKUP_DIR}`);

  runBackup();

  backupJob = new CronJob(cronExpression, runBackup, null, false, "America/Bogota");
  backupJob.start();
}

export function stopBackupScheduler() {
  if (backupJob) {
    backupJob.stop();
    backupJob = null;
  }
}

export { runBackup, BACKUP_DIR };

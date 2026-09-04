import "dotenv/config";
import { z } from "zod";
import logger from "./logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("24h"),
  ADMIN_DEFAULT_PASSWORD: z.string().min(8, "ADMIN_DEFAULT_PASSWORD debe tener al menos 8 caracteres"),

  DB_TYPE: z.enum(["sqlite", "postgresql"]).default("sqlite"),
  PG_HOST: z.string().optional().default("localhost"),
  PG_PORT: z.coerce.number().int().min(1).max(65535).optional().default(5432),
  PG_DATABASE: z.string().optional().default("lunaris"),
  PG_USER: z.string().optional().default("postgres"),
  PG_PASSWORD: z.string().optional().default("postgres"),
  // Credenciales SEPARADAS para pg_dump (ver backup.js). PG_USER/PG_PASSWORD
  // ahora apuntan a un rol de aplicacion sin privilegios de superusuario
  // (lunaris_app, NOSUPERUSER NOBYPASSRLS - necesario para que Row Level
  // Security aisle de verdad entre empresas, ver migrations.js) y pg_dump
  // usa COPY internamente, que Postgres rechaza sobre una tabla con FORCE
  // ROW LEVEL SECURITY para cualquier rol sujeto a esas politicas, sea o
  // no el dueno de la tabla. Sin credenciales de backup con permiso de
  // bypasear RLS (superusuario, o un rol con BYPASSRLS), el backup
  // automatico simplemente falla en silencio cada vez que corre. Si no se
  // definen, cae de vuelta a PG_USER/PG_PASSWORD (compatibilidad con
  // instalaciones que todavia no separaron los roles).
  PG_BACKUP_USER: z.string().optional(),
  PG_BACKUP_PASSWORD: z.string().optional(),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  BACKUP_ENABLED: z.enum(["true", "false"]).default("true"),
  BACKUP_INTERVAL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  BACKUP_DIR: z.string().default("./backups"),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    logger.error(`Configuracion de entorno invalida:\n${errors}`);
    console.error(`\n[Lunaris] ERROR: Variables de entorno invalidas:\n${errors}\n`);
    process.exit(1);
  }

  if (parsed.data.DB_TYPE === "postgresql") {
    if (!process.env.PG_HOST || !process.env.PG_DATABASE) {
      logger.error("DB_TYPE=postgresql requiere PG_HOST, PG_DATABASE, PG_USER y PG_PASSWORD");
      console.error("\n[Lunaris] ERROR: Configuracion PostgreSQL incompleta. Verifica .env\n");
      process.exit(1);
    }
  }

  return parsed.data;
}

export const env = validateEnv();

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.test apunta a su propia base (lunaris_test_mt), separada de la real
// (.env -> lunaris). Antes de este archivo, .env.test existia pero nada lo
// cargaba: vitest no tenia config con setupFiles, asi que "npm test" corria
// contra la base de desarrollo real sin que nadie lo notara. override:true
// porque este archivo debe ganar - env.js hace su propio "dotenv/config"
// (carga .env) cuando se importa business.js/db.js mas abajo en la cadena,
// pero dotenv nunca pisa una variable que ya existe en process.env, asi que
// cargar .env.test PRIMERO (aca, en setupFiles, que vitest siempre corre
// antes que los archivos de test y sus imports) es lo que decide cual gana.
dotenv.config({ path: join(__dirname, "..", ".env.test"), override: true });

process.env.NODE_ENV = "test";

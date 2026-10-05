// Aplica las migraciones de /drizzle a la base de DATABASE_URL.
// Con Neon se usa la conexión directa (DATABASE_URL_UNPOOLED) si existe: las migraciones van mejor sin pooler.
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { limpiarUrlBd, urlBdDirecta } from "../src/db/url";

const url = urlBdDirecta();
if (!url) {
  console.log("DATABASE_URL no definida: se omiten las migraciones.");
  process.exit(0);
}
const cliente = postgres(limpiarUrlBd(url), { max: 1 });
console.log("Aplicando migraciones…");
await migrate(drizzle(cliente), { migrationsFolder: "drizzle" });
await cliente.end();
console.log("Migraciones aplicadas.");

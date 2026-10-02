// Aplica las migraciones de /drizzle a la base de DATABASE_URL.
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL no definida: se omiten las migraciones.");
  process.exit(0);
}
const cliente = postgres(url, { max: 1 });
await migrate(drizzle(cliente), { migrationsFolder: "drizzle" });
await cliente.end();
console.log("Migraciones aplicadas.");

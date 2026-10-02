import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";
import { limpiarUrlBd } from "./url";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instancia: Db | null = null;

/** Conexión perezosa. Los tests inyectan una base en memoria con `setDb`. */
export function getDb(): Db {
  if (!instancia) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL (ver .env.example)");
    const cliente = postgres(limpiarUrlBd(url), { max: 5, prepare: false });
    instancia = drizzle(cliente, { schema, casing: "snake_case" }) as unknown as Db;
  }
  return instancia;
}

export function setDb(db: Db) {
  instancia = db;
}

export { schema };

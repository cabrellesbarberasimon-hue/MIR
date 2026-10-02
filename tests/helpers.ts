// Base de datos Postgres en memoria (PGlite) con las migraciones reales.
// Se crea una vez por fichero de tests y se vacía entre tests.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { setDb, type Db } from "@/db";

let cliente: PGlite | null = null;
let db: Db | null = null;

export async function dbDePrueba(): Promise<Db> {
  if (!cliente) {
    cliente = new PGlite();
    const d = drizzle(cliente, { schema, casing: "snake_case" });
    await migrate(d, { migrationsFolder: "drizzle" });
    db = d as unknown as Db;
  } else {
    const { rows } = await cliente.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public'",
    );
    await cliente.exec(`truncate ${rows.map((r) => `"${r.tablename}"`).join(", ")} restart identity cascade`);
  }
  setDb(db!);
  return db!;
}

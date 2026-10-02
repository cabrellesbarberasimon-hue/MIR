import { it, expect } from "vitest";
import { dbDePrueba } from "./helpers";
import { asignaturas } from "@/db/schema";

it("las migraciones crean el esquema", async () => {
  const db = await dbDePrueba();
  await db.insert(asignaturas).values({ nombre: "Cardiología" });
  expect(await db.select().from(asignaturas)).toHaveLength(1);
});

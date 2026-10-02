import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ajustes } from "@/db/schema";

export type Ajustes = typeof ajustes.$inferSelect;

export async function leerAjustes(): Promise<Ajustes> {
  const db = getDb();
  const [a] = await db.select().from(ajustes).where(eq(ajustes.id, 1));
  if (a) return a;
  const [nuevo] = await db.insert(ajustes).values({ id: 1 }).onConflictDoNothing().returning();
  return nuevo ?? (await db.select().from(ajustes).where(eq(ajustes.id, 1)))[0];
}

export async function guardarAjustes(datos: Partial<Omit<Ajustes, "id">>) {
  await leerAjustes();
  const limpio = { ...datos };
  if (limpio.nuevasPorDia != null) limpio.nuevasPorDia = Math.max(0, Math.min(200, Math.round(limpio.nuevasPorDia)));
  if (limpio.maxPorDia != null) limpio.maxPorDia = Math.max(1, Math.min(500, Math.round(limpio.maxPorDia)));
  if (limpio.objetivoPreguntas != null) limpio.objetivoPreguntas = Math.max(0, Math.min(1000, Math.round(limpio.objetivoPreguntas) || 0));
  if (limpio.fechaExamen !== undefined && limpio.fechaExamen && !/^\d{4}-\d{2}-\d{2}$/.test(limpio.fechaExamen)) limpio.fechaExamen = null;
  await getDb().update(ajustes).set(limpio).where(eq(ajustes.id, 1));
}

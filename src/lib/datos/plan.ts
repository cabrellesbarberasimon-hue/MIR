import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { planificacion, temas, asignaturas, TIPOS_PLAN } from "@/db/schema";
import { marcarRealizado } from "./temario";

export type TipoPlan = (typeof TIPOS_PLAN)[number];

function consultaPlan() {
  return getDb()
    .select({
      id: planificacion.id, fecha: planificacion.fecha, tipo: planificacion.tipo,
      completado: planificacion.completado, temaId: temas.id, tema: temas.nombre,
      realizado: temas.realizado, asignatura: asignaturas.nombre,
    })
    .from(planificacion)
    .innerJoin(temas, eq(temas.id, planificacion.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .$dynamic();
}

export async function planEntre(desde: string, hasta: string) {
  return consultaPlan()
    .where(and(gte(planificacion.fecha, desde), lte(planificacion.fecha, hasta)))
    .orderBy(asc(planificacion.fecha), asc(planificacion.id));
}

export async function planDelDia(fecha: string) {
  return planEntre(fecha, fecha);
}

export async function anadirPlan(fecha: string, temaIds: number[], tipo: TipoPlan = "estudio") {
  if (!temaIds.length) return;
  await getDb().insert(planificacion).values(temaIds.map((temaId) => ({ fecha, temaId, tipo })));
}

export async function quitarPlan(id: number) {
  await getDb().delete(planificacion).where(eq(planificacion.id, id));
}

export async function moverPlan(id: number, fecha: string) {
  await getDb().update(planificacion).set({ fecha }).where(eq(planificacion.id, id));
}

/** Marcar una entrada de estudio como completada marca también el tema como realizado. */
export async function completarPlan(id: number, completado: boolean) {
  const db = getDb();
  const [p] = await db.update(planificacion).set({ completado }).where(eq(planificacion.id, id)).returning();
  if (p && p.tipo === "estudio" && completado) await marcarRealizado(p.temaId, true);
}

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { asignaturas, temas, conceptos, repasos } from "@/db/schema";
import { normalizar } from "@/lib/texto";
import { hoy, sumarDias } from "@/lib/fechas";

/** Intervalos (días) de repaso de un tema tras marcarlo como realizado. */
export const INTERVALOS_REPASO_TEMA = [1, 7, 30];

export async function listarTemario() {
  const db = getDb();
  const asigs = await db.select().from(asignaturas).orderBy(asc(asignaturas.orden), asc(asignaturas.nombre));
  const ts = await db.select().from(temas).orderBy(asc(temas.orden), asc(temas.id));
  return asigs.map((a) => ({ ...a, temas: ts.filter((t) => t.asignaturaId === a.id) }));
}

export async function obtenerTema(id: number) {
  const db = getDb();
  const [fila] = await db
    .select({ tema: temas, asignatura: asignaturas.nombre })
    .from(temas).innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .where(eq(temas.id, id));
  return fila ? { ...fila.tema, asignatura: fila.asignatura } : null;
}

export async function crearAsignatura(nombre: string) {
  const db = getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(asignaturas);
  const [a] = await db.insert(asignaturas).values({ nombre: nombre.trim(), orden: n })
    .onConflictDoNothing().returning();
  return a ?? (await db.select().from(asignaturas).where(eq(asignaturas.nombre, nombre.trim())))[0];
}

/** Crea varios temas (uno por línea). Ignora los que ya existen. */
export async function crearTemas(asignaturaId: number, nombres: string[]) {
  const db = getDb();
  const limpios = nombres.map((n) => n.trim()).filter(Boolean);
  if (!limpios.length) return [];
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(temas)
    .where(eq(temas.asignaturaId, asignaturaId));
  return db.insert(temas)
    .values(limpios.map((nombre, i) => ({ asignaturaId, nombre, orden: n + i })))
    .onConflictDoNothing().returning();
}

export async function renombrarTema(id: number, nombre: string) {
  await getDb().update(temas).set({ nombre: nombre.trim() }).where(eq(temas.id, id));
}
export async function borrarTema(id: number) {
  await getDb().delete(temas).where(eq(temas.id, id));
}
export async function renombrarAsignatura(id: number, nombre: string) {
  await getDb().update(asignaturas).set({ nombre: nombre.trim() }).where(eq(asignaturas.id, id));
}
export async function borrarAsignatura(id: number) {
  await getDb().delete(asignaturas).where(eq(asignaturas.id, id));
}

/**
 * Marca un tema como realizado (o no). Al marcarlo se programan sus repasos;
 * al desmarcarlo se eliminan los repasos de tema aún no hechos.
 */
export async function marcarRealizado(temaId: number, realizado: boolean, fecha = hoy()) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(temas).where(eq(temas.id, temaId));
    if (!t || t.realizado === realizado) return;
    await tx.update(temas).set({ realizado, realizadoEn: realizado ? fecha : null }).where(eq(temas.id, temaId));
    if (realizado) {
      await tx.insert(repasos).values(
        INTERVALOS_REPASO_TEMA.map((d) => ({ tipo: "tema" as const, temaId, fecha: sumarDias(fecha, d) })),
      );
    } else {
      await tx.delete(repasos).where(and(eq(repasos.temaId, temaId), eq(repasos.tipo, "tema"), isNull(repasos.hechoEn)));
    }
  });
}

/** Devuelve el id del concepto (lo crea si no existe en ese tema). */
export async function asegurarConcepto(temaId: number, nombre: string): Promise<number | null> {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (!limpio) return null;
  const db = getDb();
  const nombreNorm = normalizar(limpio);
  const [nuevo] = await db.insert(conceptos).values({ temaId, nombre: limpio, nombreNorm })
    .onConflictDoNothing().returning({ id: conceptos.id });
  if (nuevo) return nuevo.id;
  const [ex] = await db.select({ id: conceptos.id }).from(conceptos)
    .where(and(eq(conceptos.temaId, temaId), eq(conceptos.nombreNorm, nombreNorm)));
  return ex.id;
}

export async function conceptosDeTema(temaId: number) {
  return getDb().select().from(conceptos).where(eq(conceptos.temaId, temaId)).orderBy(asc(conceptos.nombre));
}

/** Para los scripts: obtiene o crea asignatura y tema por nombre. */
export async function asegurarTema(asignatura: string, tema: string) {
  const a = await crearAsignatura(asignatura);
  const db = getDb();
  await crearTemas(a.id, [tema]);
  const [t] = await db.select().from(temas).where(and(eq(temas.asignaturaId, a.id), eq(temas.nombre, tema.trim())));
  return t;
}

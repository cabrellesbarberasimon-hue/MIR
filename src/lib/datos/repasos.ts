import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { repasos, temas, asignaturas, errores, conceptos } from "@/db/schema";
import { hoy } from "@/lib/fechas";

/** Repasos pendientes hasta la fecha dada, agrupados por tema. */
export async function repasosPendientes(hasta = hoy()) {
  const filas = await getDb()
    .select({
      id: repasos.id, tipo: repasos.tipo, fecha: repasos.fecha, temaId: temas.id, tema: temas.nombre,
      asignatura: asignaturas.nombre, motivo: errores.motivo, nota: errores.nota, concepto: conceptos.nombre,
    })
    .from(repasos)
    .innerJoin(temas, eq(temas.id, repasos.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .leftJoin(errores, eq(errores.id, repasos.errorId))
    .leftJoin(conceptos, eq(conceptos.id, errores.conceptoId))
    .where(and(isNull(repasos.hechoEn), lte(repasos.fecha, hasta)))
    .orderBy(asc(repasos.fecha), asc(repasos.id));

  const grupos = new Map<number, {
    temaId: number; tema: string; asignatura: string; fecha: string;
    repasoTema: number[]; errores: typeof filas;
  }>();
  for (const f of filas) {
    const g = grupos.get(f.temaId) ?? {
      temaId: f.temaId, tema: f.tema, asignatura: f.asignatura, fecha: f.fecha, repasoTema: [], errores: [],
    };
    if (f.tipo === "tema") g.repasoTema.push(f.id);
    else g.errores.push(f);
    grupos.set(f.temaId, g);
  }
  return [...grupos.values()];
}

export async function contarRepasosPendientes(hasta = hoy()) {
  const [{ n }] = await getDb().select({ n: sql<number>`count(distinct ${repasos.temaId})::int` })
    .from(repasos).where(and(isNull(repasos.hechoEn), lte(repasos.fecha, hasta)));
  return n;
}

export async function marcarRepasosHechos(ids: number[]) {
  if (!ids.length) return;
  await getDb().update(repasos).set({ hechoEn: new Date() }).where(inArray(repasos.id, ids));
}

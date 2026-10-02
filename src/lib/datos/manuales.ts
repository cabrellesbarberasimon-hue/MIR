import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { manuales, secciones, tarjetas, temas, asignaturas, conceptos } from "@/db/schema";
import { asegurarConcepto } from "./temario";

export async function listarSecciones() {
  const db = getDb();
  const ms = await db.select({ id: manuales.id, nombre: manuales.nombre, archivo: manuales.archivo, calidad: manuales.calidadTexto, paginas: manuales.paginas })
    .from(manuales).orderBy(asc(manuales.nombre));
  const ss = await db.select({
    id: secciones.id, manualId: secciones.manualId, titulo: secciones.titulo, orden: secciones.orden,
    paginaInicio: secciones.paginaInicio, paginaFin: secciones.paginaFin, temaId: secciones.temaId,
    tema: temas.nombre, asignatura: asignaturas.nombre, asociacion: secciones.asociacion, confianza: secciones.confianza,
    estado: secciones.estado, prioridad: secciones.prioridad,
    refs: sql<number>`jsonb_array_length(${secciones.refsMir})::int`,
    tarjetas: sql<number>`(select count(*) from ${tarjetas} where ${tarjetas.seccionId} = ${secciones.id})::int`,
  }).from(secciones)
    .leftJoin(temas, eq(temas.id, secciones.temaId))
    .leftJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .orderBy(asc(secciones.manualId), asc(secciones.orden));
  return ms.map((m) => ({ ...m, secciones: ss.filter((s) => s.manualId === m.id) }));
}

/**
 * Corrige a mano el tema de una sección. Sus tarjetas se mueven al nuevo tema
 * (y sus conceptos se recrean en él).
 */
export async function asociarSeccion(seccionId: number, temaId: number | null) {
  const db = getDb();
  await db.update(secciones).set({ temaId, asociacion: "manual" }).where(eq(secciones.id, seccionId));
  if (temaId == null) return;
  const ts = await db.select({ id: tarjetas.id, concepto: conceptos.nombre }).from(tarjetas)
    .leftJoin(conceptos, eq(conceptos.id, tarjetas.conceptoId))
    .where(eq(tarjetas.seccionId, seccionId));
  for (const t of ts) {
    const conceptoId = t.concepto ? await asegurarConcepto(temaId, t.concepto) : null;
    await db.update(tarjetas).set({ temaId, conceptoId }).where(eq(tarjetas.id, t.id));
  }
}

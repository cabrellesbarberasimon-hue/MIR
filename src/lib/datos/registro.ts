import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bloquesPreguntas, errores, repasos, temas, asignaturas, conceptos, ORIGENES_BLOQUE, type MotivoError } from "@/db/schema";
import { hoy, sumarDias } from "@/lib/fechas";
import { asegurarConcepto } from "./temario";

export type ErrorEntrada = { motivo?: MotivoError | null; concepto?: string; nota?: string };

export type RegistroEntrada = {
  fecha?: string;
  temaId: number;
  origen?: (typeof ORIGENES_BLOQUE)[number];
  total?: number;      // si se indica, se guarda el bloque de preguntas (rendimiento)
  aciertos?: number;
  blancos?: number;
  errores: ErrorEntrada[]; // detalle (puede ir vacío; se completa hasta el nº de fallos)
};

/** Días tras el error en que toca repasarlo. */
export const DIAS_REPASO_ERROR = 1;

/**
 * Registra un bloque de preguntas y sus errores en una sola operación.
 * Si hay total/aciertos, fallos = total − aciertos − blancos y se crean tantos errores
 * como fallos (los no detallados quedan sin motivo).
 */
export async function registrar(e: RegistroEntrada) {
  const fecha = e.fecha ?? hoy();
  const db = getDb();
  let bloqueId: number | null = null;
  let detalle = e.errores;

  if (e.total != null && e.total > 0) {
    const aciertos = Math.max(0, Math.min(e.aciertos ?? 0, e.total));
    const blancos = Math.max(0, Math.min(e.blancos ?? 0, e.total - aciertos));
    const fallos = e.total - aciertos - blancos;
    const [b] = await db.insert(bloquesPreguntas).values({
      fecha, temaId: e.temaId, origen: e.origen ?? "test", total: e.total, aciertos, blancos, fallos,
    }).returning();
    bloqueId = b.id;
    detalle = detalle.slice(0, fallos);
    while (detalle.length < fallos) detalle = [...detalle, {}];
  }

  const ids: number[] = [];
  for (const d of detalle) {
    const conceptoId = d.concepto ? await asegurarConcepto(e.temaId, d.concepto) : null;
    const [err] = await db.insert(errores).values({
      fecha, temaId: e.temaId, bloqueId, conceptoId, motivo: d.motivo ?? null, nota: d.nota?.trim() || null,
    }).returning({ id: errores.id });
    ids.push(err.id);
  }
  if (ids.length) {
    await db.insert(repasos).values(ids.map((errorId) => ({
      tipo: "error" as const, temaId: e.temaId, errorId, fecha: sumarDias(fecha, DIAS_REPASO_ERROR),
    })));
  }
  return { bloqueId, errores: ids.length };
}

export async function borrarBloque(id: number) {
  await getDb().delete(bloquesPreguntas).where(eq(bloquesPreguntas.id, id));
}

export async function actualizarError(id: number, datos: { motivo?: MotivoError | null; nota?: string; concepto?: string }) {
  const db = getDb();
  const [err] = await db.select().from(errores).where(eq(errores.id, id));
  if (!err) return;
  const conceptoId = datos.concepto !== undefined ? await asegurarConcepto(err.temaId, datos.concepto) : err.conceptoId;
  await db.update(errores).set({
    motivo: datos.motivo !== undefined ? datos.motivo : err.motivo,
    nota: datos.nota !== undefined ? datos.nota.trim() || null : err.nota,
    conceptoId,
  }).where(eq(errores.id, id));
}

export async function borrarError(id: number) {
  await getDb().delete(errores).where(eq(errores.id, id));
}

export async function ultimosBloques(limite = 20) {
  return getDb()
    .select({
      id: bloquesPreguntas.id, fecha: bloquesPreguntas.fecha, total: bloquesPreguntas.total,
      aciertos: bloquesPreguntas.aciertos, fallos: bloquesPreguntas.fallos, blancos: bloquesPreguntas.blancos,
      origen: bloquesPreguntas.origen, tema: temas.nombre, asignatura: asignaturas.nombre,
    })
    .from(bloquesPreguntas)
    .leftJoin(temas, eq(temas.id, bloquesPreguntas.temaId))
    .leftJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .orderBy(desc(bloquesPreguntas.fecha), desc(bloquesPreguntas.id))
    .limit(limite);
}

export async function erroresRecientes(opts: { temaId?: number; desde?: string; limite?: number } = {}) {
  const conds = [];
  if (opts.temaId) conds.push(eq(errores.temaId, opts.temaId));
  if (opts.desde) conds.push(gte(errores.fecha, opts.desde));
  return getDb()
    .select({
      id: errores.id, fecha: errores.fecha, motivo: errores.motivo, nota: errores.nota, origen: errores.origen,
      temaId: errores.temaId, tema: temas.nombre, asignatura: asignaturas.nombre, concepto: conceptos.nombre,
    })
    .from(errores)
    .innerJoin(temas, eq(temas.id, errores.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .leftJoin(conceptos, eq(conceptos.id, errores.conceptoId))
    .where(conds.length ? and(...conds) : sql`true`)
    .orderBy(desc(errores.fecha), desc(errores.id))
    .limit(opts.limite ?? 50);
}

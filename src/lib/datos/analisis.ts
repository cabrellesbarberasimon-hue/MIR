import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  asignaturas, temas, bloquesPreguntas, errores, conceptos, tarjetas, historialTarjetas,
} from "@/db/schema";
import { hoy, sumarDias } from "@/lib/fechas";

export async function rendimientoPorAsignatura(desde?: string) {
  const db = getDb();
  return db.select({
    asignaturaId: asignaturas.id, asignatura: asignaturas.nombre,
    total: sql<number>`coalesce(sum(${bloquesPreguntas.total}), 0)::int`,
    aciertos: sql<number>`coalesce(sum(${bloquesPreguntas.aciertos}), 0)::int`,
    fallos: sql<number>`coalesce(sum(${bloquesPreguntas.fallos}), 0)::int`,
  })
    .from(bloquesPreguntas)
    .innerJoin(temas, eq(temas.id, bloquesPreguntas.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .where(desde ? gte(bloquesPreguntas.fecha, desde) : sql`true`)
    .groupBy(asignaturas.id, asignaturas.nombre)
    .orderBy(asc(asignaturas.nombre));
}

export async function progresoTemario() {
  return getDb().select({
    asignaturaId: asignaturas.id, asignatura: asignaturas.nombre,
    total: sql<number>`count(${temas.id})::int`,
    realizados: sql<number>`count(${temas.id}) filter (where ${temas.realizado})::int`,
  }).from(asignaturas).leftJoin(temas, eq(temas.asignaturaId, asignaturas.id))
    .groupBy(asignaturas.id, asignaturas.nombre).orderBy(asc(asignaturas.orden), asc(asignaturas.nombre));
}

export async function erroresPorMotivo(desde?: string) {
  return getDb().select({ motivo: errores.motivo, n: sql<number>`count(*)::int` })
    .from(errores).where(desde ? gte(errores.fecha, desde) : sql`true`)
    .groupBy(errores.motivo).orderBy(desc(sql`count(*)`));
}

/**
 * Conceptos débiles: los que acumulan más errores (preguntas + tarjetas falladas)
 * en los últimos `dias` días. Los errores recientes pesan el doble (últimos 7 días).
 */
export async function conceptosDebiles(limite = 10, dias = 60, ahora = new Date()) {
  const dia = hoy(ahora);
  const desde = sumarDias(dia, -dias);
  const reciente = sumarDias(dia, -7);
  return getDb().select({
    conceptoId: conceptos.id, concepto: conceptos.nombre, temaId: temas.id, tema: temas.nombre,
    asignatura: asignaturas.nombre,
    errores: sql<number>`count(${errores.id})::int`,
    puntuacion: sql<number>`sum(case when ${errores.fecha} >= ${reciente} then 2 else 1 end)::int`,
  })
    .from(errores)
    .innerJoin(conceptos, eq(conceptos.id, errores.conceptoId))
    .innerJoin(temas, eq(temas.id, conceptos.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .where(and(isNotNull(errores.conceptoId), gte(errores.fecha, desde)))
    .groupBy(conceptos.id, conceptos.nombre, temas.id, temas.nombre, asignaturas.nombre)
    .orderBy(desc(sql`sum(case when ${errores.fecha} >= ${reciente} then 2 else 1 end)`), asc(conceptos.nombre))
    .limit(limite);
}

/** Temas con peor % de acierto (mínimo 10 preguntas) — útil cuando no hay conceptos registrados. */
export async function temasDebiles(limite = 5) {
  return getDb().select({
    temaId: temas.id, tema: temas.nombre, asignatura: asignaturas.nombre,
    total: sql<number>`sum(${bloquesPreguntas.total})::int`,
    aciertos: sql<number>`sum(${bloquesPreguntas.aciertos})::int`,
  }).from(bloquesPreguntas)
    .innerJoin(temas, eq(temas.id, bloquesPreguntas.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .groupBy(temas.id, temas.nombre, asignaturas.nombre)
    .having(sql`sum(${bloquesPreguntas.total}) >= 10`)
    .orderBy(asc(sql`sum(${bloquesPreguntas.aciertos})::float / sum(${bloquesPreguntas.total})`))
    .limit(limite);
}

/**
 * Mini-esquema de un concepto: lo esencial en una pantalla, sin IA, a partir de
 * sus tarjetas (pregunta → respuesta) y de las notas de los errores cometidos.
 */
export async function miniEsquema(conceptoId: number) {
  const db = getDb();
  const [c] = await db.select({ id: conceptos.id, nombre: conceptos.nombre, tema: temas.nombre, asignatura: asignaturas.nombre })
    .from(conceptos).innerJoin(temas, eq(temas.id, conceptos.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId)).where(eq(conceptos.id, conceptoId));
  if (!c) return null;
  const puntos = await db.select({ pregunta: tarjetas.pregunta, respuesta: tarjetas.respuesta, pagina: tarjetas.pagina, refsMir: tarjetas.refsMir })
    .from(tarjetas).where(and(eq(tarjetas.conceptoId, conceptoId), inArray(tarjetas.estado, ["activa", "pendiente_revision"])))
    .orderBy(desc(tarjetas.prioridad)).limit(8);
  const notas = await db.select({ fecha: errores.fecha, motivo: errores.motivo, nota: errores.nota })
    .from(errores).where(eq(errores.conceptoId, conceptoId)).orderBy(desc(errores.fecha)).limit(8);
  return { ...c, puntos, notas };
}

export async function estadisticasTarjetas(ahora = new Date()) {
  const db = getDb();
  const desde = sumarDias(hoy(ahora), -30);
  const [r] = await db.select({
    respuestas: sql<number>`count(*)::int`,
    sabia: sql<number>`count(*) filter (where ${historialTarjetas.respuesta} = 'sabia')::int`,
    dudosa: sql<number>`count(*) filter (where ${historialTarjetas.respuesta} = 'dudosa')::int`,
    fallada: sql<number>`count(*) filter (where ${historialTarjetas.respuesta} = 'fallada')::int`,
  }).from(historialTarjetas).where(gte(historialTarjetas.dia, desde));
  const [t] = await db.select({
    activas: sql<number>`count(*) filter (where ${tarjetas.estado} = 'activa')::int`,
    nuevas: sql<number>`count(*) filter (where ${tarjetas.estado} = 'activa' and ${tarjetas.state} = 0)::int`,
    maduras: sql<number>`count(*) filter (where ${tarjetas.estado} = 'activa' and ${tarjetas.scheduledDays} >= 21)::int`,
  }).from(tarjetas);
  return { ...r, ...t };
}

/** Actividad de los últimos días (preguntas y tarjetas) para el dashboard. */
export async function actividadReciente(dias = 7, ahora = new Date()) {
  const db = getDb();
  const desde = sumarDias(hoy(ahora), -(dias - 1));
  const p = await db.select({ fecha: bloquesPreguntas.fecha, total: sql<number>`sum(${bloquesPreguntas.total})::int`, aciertos: sql<number>`sum(${bloquesPreguntas.aciertos})::int` })
    .from(bloquesPreguntas).where(gte(bloquesPreguntas.fecha, desde)).groupBy(bloquesPreguntas.fecha);
  const t = await db.select({ fecha: historialTarjetas.dia, n: sql<number>`count(*)::int` })
    .from(historialTarjetas).where(gte(historialTarjetas.dia, desde)).groupBy(historialTarjetas.dia);
  return Array.from({ length: dias }, (_, i) => {
    const f = sumarDias(desde, i);
    const pp = p.find((x) => x.fecha === f);
    return { fecha: f, preguntas: pp?.total ?? 0, aciertos: pp?.aciertos ?? 0, tarjetas: t.find((x) => x.fecha === f)?.n ?? 0 };
  });
}

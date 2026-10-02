// Tiempo de estudio, objetivo diario, racha y cuenta atrás al examen.
import { gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sesionesEstudio, bloquesPreguntas, historialTarjetas } from "@/db/schema";
import { hoy, sumarDias } from "@/lib/fechas";
import { leerAjustes } from "./ajustes";

export async function registrarEstudio(minutos: number, temaId: number | null, fecha = hoy()) {
  const m = Math.round(minutos);
  if (m < 1) return;
  await getDb().insert(sesionesEstudio).values({ fecha, minutos: Math.min(m, 600), temaId });
}

export async function minutosDesde(desde: string) {
  return getDb().select({ fecha: sesionesEstudio.fecha, minutos: sql<number>`sum(${sesionesEstudio.minutos})::int` })
    .from(sesionesEstudio).where(gte(sesionesEstudio.fecha, desde)).groupBy(sesionesEstudio.fecha);
}

export function diasHasta(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000);
}

/**
 * Racha: días consecutivos (terminando hoy, o ayer si hoy aún no cuenta) en los que se cumplió
 * el objetivo de preguntas; sin objetivo, basta con haber estudiado algo (preguntas, tarjetas o tiempo).
 */
export function calcularRacha(diasCumplidos: Set<string>, dia: string) {
  let d = diasCumplidos.has(dia) ? dia : sumarDias(dia, -1);
  let n = 0;
  while (diasCumplidos.has(d)) { n++; d = sumarDias(d, -1); }
  return n;
}

export async function resumenEstudio(ahora = new Date()) {
  const db = getDb();
  const dia = hoy(ahora);
  const desde = sumarDias(dia, -400);
  const aj = await leerAjustes();
  const [preg, tarj, mins] = await Promise.all([
    db.select({ fecha: bloquesPreguntas.fecha, n: sql<number>`sum(${bloquesPreguntas.total})::int` })
      .from(bloquesPreguntas).where(gte(bloquesPreguntas.fecha, desde)).groupBy(bloquesPreguntas.fecha),
    db.select({ fecha: historialTarjetas.dia }).from(historialTarjetas)
      .where(gte(historialTarjetas.dia, desde)).groupBy(historialTarjetas.dia),
    minutosDesde(desde),
  ]);
  const cumplidos = new Set<string>();
  if (aj.objetivoPreguntas > 0) {
    for (const p of preg) if (p.n >= aj.objetivoPreguntas) cumplidos.add(p.fecha);
  } else {
    for (const x of [...preg, ...tarj, ...mins]) cumplidos.add(x.fecha);
  }
  return {
    preguntasHoy: preg.find((p) => p.fecha === dia)?.n ?? 0,
    minutosHoy: mins.find((m) => m.fecha === dia)?.minutos ?? 0,
    objetivo: aj.objetivoPreguntas,
    racha: calcularRacha(cumplidos, dia),
    diasExamen: aj.fechaExamen ? diasHasta(dia, aj.fechaExamen) : null,
  };
}


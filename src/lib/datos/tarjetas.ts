import { and, asc, desc, eq, inArray, lte, ne, notInArray, or, sql } from "drizzle-orm";
import { fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";
import { getDb } from "@/db";
import {
  tarjetas, historialTarjetas, temas, asignaturas, conceptos, planificacion, errores,
  type RespuestaTarjeta, type MotivoError,
} from "@/db/schema";
import { hoy } from "@/lib/fechas";
import { leerAjustes } from "./ajustes";
import { asegurarConcepto } from "./temario";

const planificador = fsrs({ enable_fuzz: true });

export const RATING: Record<RespuestaTarjeta, Grade> = {
  fallada: Rating.Again,
  dudosa: Rating.Hard,
  sabia: Rating.Good,
};

type FilaTarjeta = typeof tarjetas.$inferSelect;

export function aCard(t: FilaTarjeta): Card {
  return {
    due: t.due, stability: t.stability, difficulty: t.difficulty, elapsed_days: t.elapsedDays,
    scheduled_days: t.scheduledDays, learning_steps: t.learningSteps, reps: t.reps, lapses: t.lapses,
    state: t.state as State, last_review: t.lastReview ?? undefined,
  };
}

/** Margen para mostrar antes de tiempo una tarjeta en aprendizaje si no queda nada más. */
const ADELANTO_MS = 20 * 60 * 1000;

/** Temas cuyas tarjetas nuevas pueden entrar: realizados o con planificación hasta hoy. */
function temaElegible(dia: string) {
  return or(
    eq(temas.realizado, true),
    sql`exists (select 1 from ${planificacion} where ${planificacion.temaId} = ${temas.id} and ${planificacion.fecha} <= ${dia})`,
  );
}

export async function estadoCupo(ahora = new Date()) {
  const db = getDb();
  const dia = hoy(ahora);
  const aj = await leerAjustes();
  const [r] = await db.select({
    hechas: sql<number>`count(distinct ${historialTarjetas.tarjetaId})::int`,
    nuevas: sql<number>`count(distinct ${historialTarjetas.tarjetaId}) filter (where ${historialTarjetas.estadoPrevio} = 0)::int`,
  }).from(historialTarjetas).where(eq(historialTarjetas.dia, dia));
  return {
    dia, hechas: r.hechas, nuevasHechas: r.nuevas,
    restantes: Math.max(0, aj.maxPorDia - r.hechas),
    nuevasRestantes: Math.max(0, Math.min(aj.nuevasPorDia - r.nuevas, aj.maxPorDia - r.hechas)),
  };
}

const camposTarjeta = {
  id: tarjetas.id, pregunta: tarjetas.pregunta, respuesta: tarjetas.respuesta, fragmento: tarjetas.fragmento,
  pagina: tarjetas.pagina, refsMir: tarjetas.refsMir, state: tarjetas.state, temaId: tarjetas.temaId,
  tema: temas.nombre, asignatura: asignaturas.nombre, concepto: conceptos.nombre,
};

function base() {
  return getDb().select(camposTarjeta).from(tarjetas)
    .innerJoin(temas, eq(temas.id, tarjetas.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .leftJoin(conceptos, eq(conceptos.id, tarjetas.conceptoId))
    .$dynamic();
}

export type TarjetaSesion = Awaited<ReturnType<typeof siguienteTarjeta>>;

/**
 * Siguiente tarjeta de la sesión diaria. Orden:
 *  1) en aprendizaje ya vistas hoy y vencidas (no gastan cupo),
 *  2) repasos vencidos (según cupo total),
 *  3) nuevas (según cupo de nuevas), por prioridad MIR,
 *  4) en aprendizaje que vencen en breve.
 * `excluir`: ids ya mostrados en esta tanda (p.ej. modo 10 minutos).
 */
export async function siguienteTarjeta(ahora = new Date(), excluir: number[] = []) {
  const cupo = await estadoCupo(ahora);
  const activa = and(
    eq(tarjetas.estado, "activa"),
    excluir.length ? notInArray(tarjetas.id, excluir) : sql`true`,
  );
  const vistaHoy = sql`exists (select 1 from ${historialTarjetas} h where h.tarjeta_id = ${tarjetas.id} and h.dia = ${cupo.dia})`;

  const [aprendiendo] = await base()
    .where(and(activa, inArray(tarjetas.state, [State.Learning, State.Relearning]), lte(tarjetas.due, ahora), vistaHoy))
    .orderBy(asc(tarjetas.due)).limit(1);
  if (aprendiendo) return { ...aprendiendo, cupo };

  if (cupo.restantes > 0) {
    const [vencida] = await base()
      .where(and(activa, ne(tarjetas.state, State.New), lte(tarjetas.due, ahora)))
      .orderBy(asc(tarjetas.due), desc(tarjetas.prioridad)).limit(1);
    if (vencida) return { ...vencida, cupo };
  }
  if (cupo.nuevasRestantes > 0) {
    const [nueva] = await base()
      .where(and(activa, eq(tarjetas.state, State.New), temaElegible(cupo.dia)))
      .orderBy(desc(tarjetas.prioridad), asc(tarjetas.id)).limit(1);
    if (nueva) return { ...nueva, cupo };
  }
  const [pronto] = await base()
    .where(and(activa, inArray(tarjetas.state, [State.Learning, State.Relearning]),
      lte(tarjetas.due, new Date(ahora.getTime() + ADELANTO_MS)), vistaHoy))
    .orderBy(asc(tarjetas.due)).limit(1);
  return pronto ? { ...pronto, cupo } : null;
}

/** Cuántas tarjetas quedan hoy (aprox. para el dashboard). */
export async function pendientesHoy(ahora = new Date()) {
  const db = getDb();
  const cupo = await estadoCupo(ahora);
  const [v] = await db.select({ n: sql<number>`count(*)::int` }).from(tarjetas)
    .where(and(eq(tarjetas.estado, "activa"), ne(tarjetas.state, State.New), lte(tarjetas.due, ahora)));
  const [n] = await db.select({ n: sql<number>`count(*)::int` }).from(tarjetas)
    .innerJoin(temas, eq(temas.id, tarjetas.temaId))
    .where(and(eq(tarjetas.estado, "activa"), eq(tarjetas.state, State.New), temaElegible(cupo.dia)));
  const vencidas = Math.min(v.n, cupo.restantes);
  const nuevas = Math.min(n.n, cupo.nuevasRestantes, Math.max(0, cupo.restantes - vencidas));
  return { vencidas, nuevas, total: vencidas + nuevas, cupo };
}

/** Registra la respuesta y reprograma con FSRS. Devuelve el id del historial. */
export async function responder(tarjetaId: number, respuesta: RespuestaTarjeta, ahora = new Date()) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [t] = await tx.select().from(tarjetas).where(eq(tarjetas.id, tarjetaId));
    if (!t) throw new Error("Tarjeta no encontrada");
    const { card } = planificador.next(aCard(t), ahora, RATING[respuesta]);
    await tx.update(tarjetas).set({
      due: card.due, stability: card.stability, difficulty: card.difficulty, elapsedDays: card.elapsed_days,
      scheduledDays: card.scheduled_days, learningSteps: card.learning_steps, reps: card.reps,
      lapses: card.lapses, state: card.state, lastReview: card.last_review ?? ahora,
    }).where(eq(tarjetas.id, tarjetaId));
    const [h] = await tx.insert(historialTarjetas).values({
      tarjetaId, fecha: ahora, dia: hoy(ahora), respuesta, rating: RATING[respuesta], estadoPrevio: t.state,
      stability: card.stability, difficulty: card.difficulty, scheduledDays: card.scheduled_days,
    }).returning({ id: historialTarjetas.id });
    if (respuesta === "fallada") {
      // El fallo también es un error del usuario: alimenta conceptos débiles y análisis.
      await tx.insert(errores).values({
        fecha: hoy(ahora), temaId: t.temaId, conceptoId: t.conceptoId, tarjetaId, origen: "tarjeta",
      });
    }
    return h.id;
  });
}

/** Motivo/explicación opcional de un fallo, guardado con la tarjeta (historial) y en el error. */
export async function explicarFallo(historialId: number, motivo: MotivoError | null, nota?: string) {
  const db = getDb();
  const [h] = await db.update(historialTarjetas)
    .set({ motivo, nota: nota?.trim() || null })
    .where(eq(historialTarjetas.id, historialId)).returning();
  if (!h) return;
  const [err] = await db.select({ id: errores.id }).from(errores)
    .where(and(eq(errores.tarjetaId, h.tarjetaId), eq(errores.origen, "tarjeta")))
    .orderBy(desc(errores.id)).limit(1);
  if (err) await db.update(errores).set({ motivo, nota: nota?.trim() || null }).where(eq(errores.id, err.id));
}

/** Notas de fallos anteriores de una tarjeta (se muestran al responderla). */
export async function notasDeTarjeta(tarjetaId: number) {
  return getDb().select({ fecha: historialTarjetas.dia, motivo: historialTarjetas.motivo, nota: historialTarjetas.nota })
    .from(historialTarjetas)
    .where(and(eq(historialTarjetas.tarjetaId, tarjetaId), eq(historialTarjetas.respuesta, "fallada")))
    .orderBy(desc(historialTarjetas.id)).limit(5);
}

export async function marcarMal(tarjetaId: number, comentario?: string) {
  await getDb().update(tarjetas).set({ estado: "mal", comentarioMal: comentario?.trim() || null })
    .where(eq(tarjetas.id, tarjetaId));
}

export async function cambiarEstado(ids: number[], estado: "activa" | "descartada") {
  if (!ids.length) return;
  await getDb().update(tarjetas).set({ estado }).where(inArray(tarjetas.id, ids));
}

export async function editarTarjeta(id: number, pregunta: string, respuesta: string) {
  await getDb().update(tarjetas).set({ pregunta: pregunta.trim(), respuesta: respuesta.trim(), estado: "activa", comentarioMal: null })
    .where(eq(tarjetas.id, id));
}

export async function tarjetasPorEstado(estado: "mal" | "pendiente_revision", limite = 100) {
  return getDb().select({ ...camposTarjeta, comentarioMal: tarjetas.comentarioMal }).from(tarjetas)
    .innerJoin(temas, eq(temas.id, tarjetas.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
    .leftJoin(conceptos, eq(conceptos.id, tarjetas.conceptoId))
    .where(eq(tarjetas.estado, estado))
    .orderBy(desc(tarjetas.prioridad), asc(tarjetas.id)).limit(limite);
}

export async function contarPorEstado() {
  const filas = await getDb().select({ estado: tarjetas.estado, n: sql<number>`count(*)::int` })
    .from(tarjetas).groupBy(tarjetas.estado);
  return Object.fromEntries(filas.map((f) => [f.estado, f.n])) as Partial<Record<string, number>>;
}

export async function tarjetasDeTema(temaId: number) {
  return getDb().select().from(tarjetas)
    .where(and(eq(tarjetas.temaId, temaId), inArray(tarjetas.estado, ["activa", "pendiente_revision", "mal"])))
    .orderBy(desc(tarjetas.prioridad), asc(tarjetas.id));
}


/** Tarjeta creada por el usuario (p. ej. a partir de un error). Entra como nueva en la sesión diaria. */
export async function crearTarjetaPropia(d: { temaId: number; pregunta: string; respuesta: string; concepto?: string }) {
  const conceptoId = d.concepto?.trim() ? await asegurarConcepto(d.temaId, d.concepto) : null;
  const [t] = await getDb().insert(tarjetas).values({
    temaId: d.temaId, conceptoId, pregunta: d.pregunta.trim(), respuesta: d.respuesta.trim(),
    fragmento: "", origen: "propia", prioridad: 1, // un poco por delante de las nuevas sin referencias MIR
  }).returning({ id: tarjetas.id });
  return t.id;
}

// Búsqueda global sencilla (sin tildes ni mayúsculas) en temas, conceptos, errores y tarjetas.
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { temas, asignaturas, conceptos, errores, tarjetas } from "@/db/schema";

const sinTildes = (col: unknown) => sql`translate(lower(${col}), 'áéíóúüñ', 'aeiouun')`;

export async function buscar(texto: string, limite = 15) {
  const q = texto.trim();
  if (q.length < 2) return { temas: [], conceptos: [], errores: [], tarjetas: [] };
  const patron = `%${q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[%_]/g, "")}%`;
  const db = getDb();
  const coincide = (col: unknown) => sql`${sinTildes(col)} like ${patron}`;
  const [t, c, e, tj] = await Promise.all([
    db.select({ id: temas.id, nombre: temas.nombre, asignatura: asignaturas.nombre }).from(temas)
      .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId))
      .where(sql`${coincide(temas.nombre)} or ${coincide(asignaturas.nombre)} or ${coincide(temas.notas)}`).limit(limite),
    db.select({ id: conceptos.id, nombre: conceptos.nombre, tema: temas.nombre }).from(conceptos)
      .innerJoin(temas, eq(temas.id, conceptos.temaId)).where(coincide(conceptos.nombre)).limit(limite),
    db.select({ id: errores.id, nota: errores.nota, fecha: errores.fecha, temaId: errores.temaId, tema: temas.nombre, concepto: conceptos.nombre })
      .from(errores).innerJoin(temas, eq(temas.id, errores.temaId)).leftJoin(conceptos, eq(conceptos.id, errores.conceptoId))
      .where(sql`${errores.nota} is not null and (${coincide(errores.nota)} or ${coincide(conceptos.nombre)})`).limit(limite),
    db.select({ id: tarjetas.id, pregunta: tarjetas.pregunta, respuesta: tarjetas.respuesta, temaId: tarjetas.temaId, tema: temas.nombre })
      .from(tarjetas).innerJoin(temas, eq(temas.id, tarjetas.temaId))
      .where(and(inArray(tarjetas.estado, ["activa", "pendiente_revision", "mal"]),
        sql`(${coincide(tarjetas.pregunta)} or ${coincide(tarjetas.respuesta)})`)).limit(limite),
  ]);
  return { temas: t, conceptos: c, errores: e, tarjetas: tj };
}

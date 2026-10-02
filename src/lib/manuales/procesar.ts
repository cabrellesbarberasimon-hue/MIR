// Carga de manuales y generación de tarjetas contra la base de datos (usado por los scripts locales).
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "@/db";
import { asignaturas, manuales, secciones, temas, tarjetas, planificacion } from "@/db/schema";
import { crearAsignatura, crearTemas, asegurarConcepto } from "@/lib/datos/temario";
import { leerAjustes } from "@/lib/datos/ajustes";
import { mejorCoincidencia } from "@/lib/texto";
import { detectarRefsMir, prioridad } from "@/lib/mir";
import type { PdfLeido } from "./pdf";
import { calidadTexto, detectarCapitulos, nombreDesdeArchivo } from "./estructura";
import { dividirEnFragmentos } from "./fragmentos";
import { lotes, validar, type Generador, type Rechazo, type TarjetaValida } from "./generador";

/** Umbrales de similitud para la asociación automática. */
export const UMBRAL_ASIGNATURA = 0.6;
export const UMBRAL_TEMA = 0.5;

export type ResultadoCarga = { estado: "nuevo" | "sin_cambios" | "cambiado_omitido" | "recargado"; manualId: number; capitulos: number; temasCreados: number };

/**
 * Registra un manual y sus capítulos, asociando cada capítulo a un tema
 * (crea la asignatura o el tema si no existe). Idempotente por hash del archivo.
 */
export async function cargarManual(archivo: string, pdf: PdfLeido, opciones: { forzar?: boolean; anio?: number } = {}): Promise<ResultadoCarga> {
  const db = getDb();
  const [existente] = await db.select().from(manuales).where(eq(manuales.archivo, archivo));
  if (existente && existente.hash === pdf.hash && !opciones.forzar) {
    return { estado: "sin_cambios", manualId: existente.id, capitulos: 0, temasCreados: 0 };
  }
  if (existente && !opciones.forzar) {
    return { estado: "cambiado_omitido", manualId: existente.id, capitulos: 0, temasCreados: 0 };
  }

  const nombre = nombreDesdeArchivo(archivo);
  const asigs = await db.select().from(asignaturas);
  const coincide = mejorCoincidencia(nombre, asigs);
  const asignatura = coincide && coincide.puntuacion >= UMBRAL_ASIGNATURA ? coincide.item : await crearAsignatura(nombre);

  const capitulos = detectarCapitulos(pdf.paginas, pdf.indice, nombre);
  let temasCreados = 0;
  let manualId: number;

  await db.transaction(async (tx) => {
    if (existente) {
      await tx.delete(secciones).where(eq(secciones.manualId, existente.id));
      await tx.update(manuales).set({ hash: pdf.hash, paginas: pdf.paginas.length, calidadTexto: calidadTexto(pdf.paginas), asignaturaId: asignatura.id, nombre })
        .where(eq(manuales.id, existente.id));
      manualId = existente.id;
    } else {
      const [m] = await tx.insert(manuales).values({
        archivo, nombre, asignaturaId: asignatura.id, hash: pdf.hash, paginas: pdf.paginas.length, calidadTexto: calidadTexto(pdf.paginas),
      }).returning();
      manualId = m.id;
    }
  });

  for (const [i, c] of capitulos.entries()) {
    const temasAsig = await db.select().from(temas).where(eq(temas.asignaturaId, asignatura.id));
    const m = mejorCoincidencia(c.titulo, temasAsig);
    let temaId: number;
    let confianza: number;
    if (m && m.puntuacion >= UMBRAL_TEMA) {
      temaId = m.item.id;
      confianza = m.puntuacion;
    } else {
      const [t] = await crearTemas(asignatura.id, [c.titulo]);
      temaId = t?.id ?? temasAsig.find((x) => x.nombre === c.titulo)!.id;
      confianza = 1;
      temasCreados++;
    }
    const paginasTexto = pdf.paginas.slice(c.paginaInicio - 1, c.paginaFin).map((texto, k) => ({ pagina: c.paginaInicio + k, texto }));
    const todo = paginasTexto.map((p) => p.texto).join("\n");
    const refs = detectarRefsMir(todo, opciones.anio);
    await db.insert(secciones).values({
      manualId: manualId!, temaId, orden: i + 1, titulo: c.titulo, paginaInicio: c.paginaInicio, paginaFin: c.paginaFin,
      paginasTexto, hash: createHash("sha256").update(todo).digest("hex"), asociacion: "auto", confianza,
      refsMir: refs, prioridad: prioridad(refs, opciones.anio),
      estado: todo.replace(/\s/g, "").length < 200 ? "omitida" : "pendiente",
    });
  }
  return { estado: existente ? "recargado" : "nuevo", manualId: manualId!, capitulos: capitulos.length, temasCreados };
}

/** Secciones pendientes de generar (o con error), opcionalmente solo de temas planificados. */
export async function seccionesPendientes(filtro: { manualId?: number; seccionId?: number; soloPlanificados?: boolean; reintentarErrores?: boolean } = {}) {
  const conds = [
    inArray(secciones.estado, filtro.reintentarErrores === false ? ["pendiente"] : ["pendiente", "error"]),
    sql`${secciones.temaId} is not null`,
  ];
  if (filtro.manualId) conds.push(eq(secciones.manualId, filtro.manualId));
  if (filtro.seccionId) conds.push(eq(secciones.id, filtro.seccionId));
  if (filtro.soloPlanificados) {
    conds.push(sql`exists (select 1 from ${planificacion} where ${planificacion.temaId} = ${secciones.temaId})`);
  }
  return getDb().select({
    id: secciones.id, titulo: secciones.titulo, temaId: secciones.temaId, manual: manuales.nombre, paginasTexto: secciones.paginasTexto,
    prioridad: secciones.prioridad,
  }).from(secciones).innerJoin(manuales, eq(manuales.id, secciones.manualId))
    .where(and(...conds)).orderBy(asc(manuales.nombre), asc(secciones.orden));
}

export type ResultadoGeneracion = { tarjetas: TarjetaValida[]; rechazos: Rechazo[]; tokensEntrada: number; tokensSalida: number };

/**
 * Genera y guarda las tarjetas de UNA sección. Todo o nada: si falla, la sección queda
 * en estado "error" sin tarjetas parciales, y se puede reintentar.
 */
export async function generarSeccion(seccionId: number, generador: Generador, opciones: { seco?: boolean } = {}): Promise<ResultadoGeneracion> {
  const db = getDb();
  const [s] = await db.select({
    seccion: secciones, tema: temas.nombre, asignatura: asignaturas.nombre,
  }).from(secciones).innerJoin(temas, eq(temas.id, secciones.temaId))
    .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId)).where(eq(secciones.id, seccionId));
  if (!s) throw new Error(`Sección ${seccionId} sin tema asociado`);
  const { seccion } = s;

  const fragmentos = dividirEnFragmentos(seccion.paginasTexto);
  const existentes = (await db.select({ p: tarjetas.pregunta }).from(tarjetas).where(eq(tarjetas.temaId, seccion.temaId!))).map((x) => x.p);
  const res: ResultadoGeneracion = { tarjetas: [], rechazos: [], tokensEntrada: 0, tokensSalida: 0 };
  try {
    for (const lote of lotes(fragmentos)) {
      const salida = await generador({ asignatura: s.asignatura, tema: s.tema, capitulo: seccion.titulo, fragmentos: lote });
      res.tokensEntrada += salida.tokensEntrada;
      res.tokensSalida += salida.tokensSalida;
      const { validas, rechazos } = validar(salida.tarjetas, lote, [...existentes, ...res.tarjetas.map((t) => t.pregunta)]);
      res.tarjetas.push(...validas);
      res.rechazos.push(...rechazos);
    }
  } catch (e) {
    if (!opciones.seco) {
      await db.update(secciones).set({ estado: "error", error: String((e as Error).message ?? e).slice(0, 500) }).where(eq(secciones.id, seccionId));
    }
    throw e;
  }
  if (opciones.seco) return res;

  const estado: "pendiente_revision" | "activa" = (await leerAjustes()).revisionPrevia ? "pendiente_revision" : "activa";
  const conConcepto: (TarjetaValida & { conceptoId: number | null })[] = [];
  for (const t of res.tarjetas) conConcepto.push({ ...t, conceptoId: await asegurarConcepto(seccion.temaId!, t.concepto) });
  await db.transaction(async (tx) => {
    if (conConcepto.length) {
      await tx.insert(tarjetas).values(conConcepto.map((t) => ({
        seccionId, temaId: seccion.temaId!, conceptoId: t.conceptoId, pregunta: t.pregunta, respuesta: t.respuesta,
        fragmento: t.fragmento, pagina: t.pagina, refsMir: t.refsMir, prioridad: t.prioridad + seccion.prioridad / 100, estado,
      })));
    }
    await tx.update(secciones).set({
      estado: "generada", error: null, generadaEn: new Date(),
      tokensEntrada: seccion.tokensEntrada + res.tokensEntrada, tokensSalida: seccion.tokensSalida + res.tokensSalida,
    }).where(eq(secciones.id, seccionId));
  });
  return res;
}

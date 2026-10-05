"use server";
// Server actions: capa fina sobre src/lib/datos (validación de entrada + revalidación).
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COOKIE, DURACION_S, contrasenaCorrecta, crearToken, tokenValido } from "@/lib/sesion";
import { MOTIVOS_ERROR, TIPOS_PLAN, ORIGENES_BLOQUE, RESPUESTAS_TARJETA } from "@/db/schema";
import * as temario from "@/lib/datos/temario";
import * as plan from "@/lib/datos/plan";
import * as registro from "@/lib/datos/registro";
import * as rep from "@/lib/datos/repasos";
import * as tj from "@/lib/datos/tarjetas";
import { guardarAjustes } from "@/lib/datos/ajustes";
import { registrarEstudio } from "@/lib/datos/estudio";
import { asociarSeccion } from "@/lib/datos/manuales";

async function sesion() {
  const c = await cookies();
  if (!(await tokenValido(c.get(COOKIE)?.value))) redirect("/login");
}

const id = z.coerce.number().int().positive();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const motivo = z.enum(MOTIVOS_ERROR).nullable();

function refrescar() {
  revalidatePath("/", "layout");
}

// ───── Login ─────
export async function entrar(_: unknown, fd: FormData) {
  if (!(await contrasenaCorrecta(String(fd.get("contrasena") ?? "")))) return { error: "Contraseña incorrecta" };
  (await cookies()).set(COOKIE, await crearToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: DURACION_S, path: "/",
  });
  redirect("/");
}

export async function salir() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

// ───── Temario ─────
export async function accCrearAsignatura(fd: FormData) {
  await sesion();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (nombre) await temario.crearAsignatura(nombre);
  refrescar();
}

export async function accCrearTemas(fd: FormData) {
  await sesion();
  const asignaturaId = id.parse(fd.get("asignaturaId"));
  await temario.crearTemas(asignaturaId, String(fd.get("nombres") ?? "").split("\n"));
  refrescar();
}

export async function accRealizado(temaId: number, realizado: boolean) {
  await sesion();
  await temario.marcarRealizado(id.parse(temaId), realizado);
  refrescar();
}

export async function accRenombrarTema(fd: FormData) {
  await sesion();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (nombre) await temario.renombrarTema(id.parse(fd.get("id")), nombre);
  refrescar();
}

export async function accBorrarTema(fd: FormData) {
  await sesion();
  await temario.borrarTema(id.parse(fd.get("id")));
  refrescar();
  redirect("/temario");
}

export async function accRenombrarAsignatura(fd: FormData) {
  await sesion();
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (nombre) await temario.renombrarAsignatura(id.parse(fd.get("id")), nombre);
  refrescar();
}

export async function accBorrarAsignatura(fd: FormData) {
  await sesion();
  await temario.borrarAsignatura(id.parse(fd.get("id")));
  refrescar();
}

// ───── Planificación ─────
export async function accAnadirPlan(datos: { fecha: string; temaIds: number[]; tipo: string }) {
  await sesion();
  await plan.anadirPlan(fecha.parse(datos.fecha), z.array(id).parse(datos.temaIds), z.enum(TIPOS_PLAN).parse(datos.tipo));
  refrescar();
}

export async function accQuitarPlan(planId: number) {
  await sesion();
  await plan.quitarPlan(id.parse(planId));
  refrescar();
}

export async function accMoverPlan(planId: number, nuevaFecha: string) {
  await sesion();
  await plan.moverPlan(id.parse(planId), fecha.parse(nuevaFecha));
  refrescar();
}

export async function accCompletarPlan(planId: number, completado: boolean) {
  await sesion();
  await plan.completarPlan(id.parse(planId), completado);
  refrescar();
}

// ───── Registro ─────
const esquemaRegistro = z.object({
  fecha: fecha.optional(),
  temaId: id,
  origen: z.enum(ORIGENES_BLOQUE).optional(),
  total: z.number().int().min(0).max(1000).optional(),
  aciertos: z.number().int().min(0).max(1000).optional(),
  blancos: z.number().int().min(0).max(1000).optional(),
  errores: z.array(z.object({
    motivo: motivo.optional(), concepto: z.string().max(200).optional(), nota: z.string().max(2000).optional(),
  })).max(1000),
});

export async function accRegistrar(datos: z.input<typeof esquemaRegistro>) {
  await sesion();
  const r = await registro.registrar(esquemaRegistro.parse(datos));
  refrescar();
  return r;
}

export async function accBorrarBloque(bloqueId: number) {
  await sesion();
  await registro.borrarBloque(id.parse(bloqueId));
  refrescar();
}

export async function accActualizarError(errorId: number, datos: { motivo?: string | null; nota?: string; concepto?: string }) {
  await sesion();
  await registro.actualizarError(id.parse(errorId), {
    motivo: datos.motivo === undefined ? undefined : motivo.parse(datos.motivo),
    nota: datos.nota, concepto: datos.concepto,
  });
  refrescar();
}

export async function accBorrarError(errorId: number) {
  await sesion();
  await registro.borrarError(id.parse(errorId));
  refrescar();
}

// ───── Repasos ─────
export async function accRepasosHechos(ids: number[]) {
  await sesion();
  await rep.marcarRepasosHechos(z.array(id).parse(ids));
  refrescar();
}

// ───── Tarjetas ─────
export async function accSiguienteTarjeta(excluir: number[] = [], temaId?: number) {
  await sesion();
  const t = temaId != null
    ? await tj.siguienteTarjetaDeTema(id.parse(temaId))
    : await tj.siguienteTarjeta(new Date(), z.array(id).parse(excluir));
  if (!t) return null;
  return { ...t, notas: await tj.notasDeTarjeta(t.id) };
}

export async function accResponder(tarjetaId: number, respuesta: string) {
  await sesion();
  return tj.responder(id.parse(tarjetaId), z.enum(RESPUESTAS_TARJETA).parse(respuesta));
}

export async function accExplicarFallo(historialId: number, m: string | null, nota?: string) {
  await sesion();
  await tj.explicarFallo(id.parse(historialId), motivo.parse(m), nota?.slice(0, 2000));
}

export async function accMarcarMal(tarjetaId: number, comentario?: string) {
  await sesion();
  await tj.marcarMal(id.parse(tarjetaId), comentario?.slice(0, 2000));
}

export async function accEstadoTarjetas(ids: number[], estado: "activa" | "descartada") {
  await sesion();
  await tj.cambiarEstado(z.array(id).parse(ids), z.enum(["activa", "descartada"]).parse(estado));
  refrescar();
}

export async function accEditarTarjeta(fd: FormData) {
  await sesion();
  const pregunta = String(fd.get("pregunta") ?? "").trim();
  const respuesta = String(fd.get("respuesta") ?? "").trim();
  if (pregunta && respuesta) await tj.editarTarjeta(id.parse(fd.get("id")), pregunta, respuesta);
  refrescar();
}

// ───── Ajustes y manuales ─────
export async function accGuardarAjustes(fd: FormData) {
  await sesion();
  await guardarAjustes({
    nuevasPorDia: Number(fd.get("nuevasPorDia")),
    maxPorDia: Number(fd.get("maxPorDia")),
    revisionPrevia: fd.get("revisionPrevia") === "on",
    preguntarMotivo: fd.get("preguntarMotivo") === "on",
    objetivoPreguntas: Number(fd.get("objetivoPreguntas") ?? 0),
    fechaExamen: String(fd.get("fechaExamen") ?? "") || null,
  });
  refrescar();
}

export async function accAsociarSeccion(fd: FormData) {
  await sesion();
  const temaId = fd.get("temaId") ? id.parse(fd.get("temaId")) : null;
  await asociarSeccion(id.parse(fd.get("seccionId")), temaId);
  refrescar();
}

// ───── Estudio: temporizador, notas y tarjetas propias ─────
export async function accRegistrarEstudio(minutos: number, temaId: number | null) {
  await sesion();
  await registrarEstudio(z.number().min(0).max(600).parse(minutos), temaId == null ? null : id.parse(temaId));
  refrescar();
}

export async function accGuardarNotas(fd: FormData) {
  await sesion();
  await temario.guardarNotasTema(id.parse(fd.get("id")), String(fd.get("notas") ?? "").slice(0, 20000));
  refrescar();
}

export async function accCrearTarjeta(fd: FormData) {
  await sesion();
  const pregunta = String(fd.get("pregunta") ?? "").trim().slice(0, 1000);
  const respuesta = String(fd.get("respuesta") ?? "").trim().slice(0, 1000);
  const temaId = id.parse(fd.get("temaId"));
  if (!pregunta || !respuesta) return;
  await tj.crearTarjetaPropia({ temaId, pregunta, respuesta, concepto: String(fd.get("concepto") ?? "").slice(0, 200) });
  refrescar();
  const volver = String(fd.get("volver") ?? "");
  redirect(/^\/(?!\/)/.test(volver) ? volver : `/temario/${temaId}`);
}

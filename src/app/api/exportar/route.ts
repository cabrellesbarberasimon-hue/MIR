import { cookies } from "next/headers";
import { getTableColumns } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { COOKIE, tokenValido } from "@/lib/sesion";
import { hoy } from "@/lib/fechas";

export const dynamic = "force-dynamic";

/** Exportación completa y estructurada (sin el texto bruto de los manuales). */
export async function GET() {
  if (!(await tokenValido((await cookies()).get(COOKIE)?.value))) return new Response("No autorizado", { status: 401 });
  const db = getDb();
  const { paginasTexto: _omitido, ...columnasSeccion } = getTableColumns(s.secciones);
  void _omitido;
  const datos = {
    exportadoEn: new Date().toISOString(),
    asignaturas: await db.select().from(s.asignaturas),
    temas: await db.select().from(s.temas),
    conceptos: await db.select().from(s.conceptos),
    planificacion: await db.select().from(s.planificacion),
    bloquesPreguntas: await db.select().from(s.bloquesPreguntas),
    errores: await db.select().from(s.errores),
    repasos: await db.select().from(s.repasos),
    manuales: await db.select().from(s.manuales),
    secciones: await db.select(columnasSeccion).from(s.secciones),
    tarjetas: await db.select().from(s.tarjetas),
    historialTarjetas: await db.select().from(s.historialTarjetas),
    ajustes: await db.select().from(s.ajustes),
  };
  return new Response(JSON.stringify(datos, null, 1), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="mir-${hoy()}.json"`,
    },
  });
}

import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { dbDePrueba } from "./helpers";
import { tarjetas, historialTarjetas, errores } from "@/db/schema";
import type { Db } from "@/db";
import { crearAsignatura, crearTemas, marcarRealizado, asegurarConcepto } from "@/lib/datos/temario";
import { anadirPlan } from "@/lib/datos/plan";
import { guardarAjustes } from "@/lib/datos/ajustes";
import {
  siguienteTarjeta, responder, explicarFallo, marcarMal, pendientesHoy, estadoCupo, notasDeTarjeta, cambiarEstado,
} from "@/lib/datos/tarjetas";
import { conceptosDebiles, miniEsquema, estadisticasTarjetas } from "@/lib/datos/analisis";
import { hoy, sumarDias } from "@/lib/fechas";

let db: Db, temaA: number, temaB: number, conc: number;
const AHORA = new Date("2026-05-10T08:00:00Z");

async function crearTarjetas(temaId: number, n: number, prioridad = 0) {
  const filas = Array.from({ length: n }, (_, i) => ({
    temaId, conceptoId: conc, pregunta: `P${temaId}-${i}`, respuesta: `R${i}`, fragmento: `frag ${i}`, pagina: 1, prioridad: prioridad + i,
  }));
  return db.insert(tarjetas).values(filas).returning();
}

beforeEach(async () => {
  db = await dbDePrueba();
  const a = await crearAsignatura("Cardiología");
  [temaA, temaB] = (await crearTemas(a.id, ["IC", "Valvulopatías"])).map((t) => t.id);
  conc = (await asegurarConcepto(temaA, "BNP"))!;
});

describe("sesión diaria", () => {
  it("solo entran nuevas de temas realizados o planificados hasta hoy", async () => {
    await crearTarjetas(temaA, 3);
    await crearTarjetas(temaB, 3);
    expect(await siguienteTarjeta(AHORA)).toBeNull();
    await anadirPlan(sumarDias(hoy(AHORA), 3), [temaB]); // futuro: no cuenta
    expect(await siguienteTarjeta(AHORA)).toBeNull();
    await marcarRealizado(temaA, true, hoy(AHORA));
    const t = await siguienteTarjeta(AHORA);
    expect(t?.temaId).toBe(temaA);
    expect(t?.pregunta).toBe(`P${temaA}-2`); // mayor prioridad primero
  });

  it("respeta el cupo de nuevas (10) y el tope total (30)", async () => {
    await marcarRealizado(temaA, true, hoy(AHORA));
    await crearTarjetas(temaA, 15);
    let n = 0;
    let ahora = AHORA;
    for (;;) {
      const t = await siguienteTarjeta(ahora);
      if (!t) break;
      await responder(t.id, "sabia", ahora);
      ahora = new Date(ahora.getTime() + 60_000);
      if (++n > 100) throw new Error("bucle");
    }
    const c = await estadoCupo(ahora);
    expect(c.nuevasHechas).toBe(10);
    await guardarAjustes({ nuevasPorDia: 12 });
    expect((await pendientesHoy(ahora)).nuevas).toBe(2);
    await guardarAjustes({ maxPorDia: 11 });
    expect((await pendientesHoy(ahora)).nuevas).toBe(1);
  });

  it("FSRS: fallada→Again, dudosa→Hard, sabía→Good; los fallos se repiten en la sesión", async () => {
    await marcarRealizado(temaA, true, hoy(AHORA));
    const [t1, t2, t3] = await crearTarjetas(temaA, 3);
    await responder(t1.id, "fallada", AHORA);
    await responder(t2.id, "dudosa", AHORA);
    await responder(t3.id, "sabia", AHORA);
    const h = await db.select().from(historialTarjetas);
    expect(h.map((x) => x.rating)).toEqual([1, 2, 3]);
    const [f] = await db.select().from(tarjetas).where(eq(tarjetas.id, t1.id));
    expect(f.state).toBe(1);
    expect(f.due.getTime() - AHORA.getTime()).toBeLessThan(15 * 60_000);
    // 2 minutos después vuelve a salir la fallada sin gastar cupo
    const sig = await siguienteTarjeta(new Date(AHORA.getTime() + 2 * 60_000));
    expect(sig?.id).toBe(t1.id);
    // el fallo genera un error vinculado al concepto
    const e = await db.select().from(errores);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ origen: "tarjeta", tarjetaId: t1.id, conceptoId: conc });
  });

  it("motivo opcional del fallo y notas guardadas con la tarjeta", async () => {
    const [t] = await crearTarjetas(temaA, 1);
    const hId = await responder(t.id, "fallada", AHORA);
    await explicarFallo(hId, "confusion", "Confundí BNP con NT-proBNP");
    const notas = await notasDeTarjeta(t.id);
    expect(notas[0]).toMatchObject({ motivo: "confusion", nota: "Confundí BNP con NT-proBNP" });
    const [e] = await db.select().from(errores);
    expect(e.motivo).toBe("confusion");
    const deb = await conceptosDebiles(10, 60, AHORA);
    expect(deb[0].concepto).toBe("BNP");
    const esq = await miniEsquema(conc);
    expect(esq?.puntos).toHaveLength(1);
    expect(esq?.notas[0].nota).toContain("NT-proBNP");
  });

  it("'Esta tarjeta está mal' la saca de la sesión", async () => {
    await marcarRealizado(temaA, true, hoy(AHORA));
    const [t] = await crearTarjetas(temaA, 1);
    await marcarMal(t.id, "la respuesta es incompleta");
    expect(await siguienteTarjeta(AHORA)).toBeNull();
    await cambiarEstado([t.id], "activa");
    expect((await siguienteTarjeta(AHORA))?.id).toBe(t.id);
  });

  it("excluir ids (modo 10 minutos) y estadísticas", async () => {
    await marcarRealizado(temaA, true, hoy(AHORA));
    const ts = await crearTarjetas(temaA, 2);
    const s = await siguienteTarjeta(AHORA, [ts[1].id]);
    expect(s?.id).toBe(ts[0].id);
    await responder(ts[0].id, "sabia", AHORA);
    const est = await estadisticasTarjetas(AHORA);
    expect(est).toMatchObject({ respuestas: 1, sabia: 1, activas: 2, nuevas: 1 });
  });
});

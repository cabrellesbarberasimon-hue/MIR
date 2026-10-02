import { describe, it, expect, beforeEach } from "vitest";
import { dbDePrueba } from "./helpers";
import { crearAsignatura, crearTemas, marcarRealizado, listarTemario, asegurarConcepto, asegurarTema } from "@/lib/datos/temario";
import { anadirPlan, planDelDia, completarPlan, planEntre } from "@/lib/datos/plan";
import { registrar, erroresRecientes, ultimosBloques } from "@/lib/datos/registro";
import { repasosPendientes, marcarRepasosHechos, contarRepasosPendientes } from "@/lib/datos/repasos";
import { conceptosDebiles, rendimientoPorAsignatura, progresoTemario, erroresPorMotivo, temasDebiles } from "@/lib/datos/analisis";
import { planDiezMinutos } from "@/lib/datos/diez-minutos";
import { cuadriculaMes, sumarDias, hoy } from "@/lib/fechas";

let temaA: number, temaB: number;

beforeEach(async () => {
  await dbDePrueba();
  const a = await crearAsignatura("Cardiología");
  const ts = await crearTemas(a.id, ["Insuficiencia cardiaca", "Valvulopatías", ""]);
  [temaA, temaB] = ts.map((t) => t.id);
});

describe("temario", () => {
  it("crea asignaturas y temas sin duplicar", async () => {
    await crearAsignatura("Cardiología");
    const a = await crearAsignatura("Neumología");
    await crearTemas(a.id, ["EPOC", "Asma"]);
    await crearTemas(a.id, ["EPOC"]);
    const t = await listarTemario();
    expect(t.map((x) => x.nombre)).toEqual(["Cardiología", "Neumología"]);
    expect(t[1].temas.map((x) => x.nombre)).toEqual(["EPOC", "Asma"]);
  });

  it("marcar realizado programa repasos y desmarcar los elimina", async () => {
    await marcarRealizado(temaA, true, "2026-01-10");
    expect(await repasosPendientes("2026-01-10")).toHaveLength(0);
    const r = await repasosPendientes("2026-01-11");
    expect(r).toHaveLength(1);
    expect(r[0].repasoTema).toHaveLength(1);
    expect((await repasosPendientes("2026-02-15"))[0].repasoTema).toHaveLength(3);
    await marcarRealizado(temaA, true, "2026-01-10"); // idempotente
    expect((await repasosPendientes("2026-02-15"))[0].repasoTema).toHaveLength(3);
    await marcarRealizado(temaA, false);
    expect(await repasosPendientes("2026-02-15")).toHaveLength(0);
  });

  it("conceptos: normaliza y no duplica", async () => {
    const c1 = await asegurarConcepto(temaA, "Péptido natriurético");
    const c2 = await asegurarConcepto(temaA, "  peptido   NATRIURETICO ");
    expect(c1).toBe(c2);
    expect(await asegurarConcepto(temaA, "  ")).toBeNull();
  });

  it("asegurarTema crea lo que falta", async () => {
    const t = await asegurarTema("Digestivo", "Hepatitis");
    const t2 = await asegurarTema("Digestivo", "Hepatitis");
    expect(t.id).toBe(t2.id);
  });
});

describe("planificación", () => {
  it("añade, lista y completa (marca el tema realizado)", async () => {
    await anadirPlan("2026-03-02", [temaA, temaB]);
    await anadirPlan("2026-03-05", [temaB], "repaso");
    const dia = await planDelDia("2026-03-02");
    expect(dia.map((p) => p.tema)).toEqual(["Insuficiencia cardiaca", "Valvulopatías"]);
    expect((await planEntre("2026-03-01", "2026-03-31"))).toHaveLength(3);
    await completarPlan(dia[0].id, true);
    const t = await listarTemario();
    expect(t[0].temas.find((x) => x.id === temaA)?.realizado).toBe(true);
  });

  it("cuadrícula del mes empieza en lunes y cubre el mes", () => {
    const c = cuadriculaMes("2026-10");
    expect(c[0]).toBe("2026-09-28");
    expect(c.length % 7).toBe(0);
    expect(c).toContain("2026-10-31");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(hoy(new Date("2026-03-01T23:30:00Z"))).toBe("2026-03-02");
  });
});

describe("registro de preguntas y errores", () => {
  it("bloque con detalle parcial completa los fallos sin motivo", async () => {
    const r = await registrar({
      fecha: "2026-04-01", temaId: temaA, total: 20, aciertos: 15, blancos: 1,
      errores: [{ motivo: "confusion", concepto: "BNP" }, { motivo: "no_lo_sabia" }],
    });
    expect(r.errores).toBe(4);
    const b = await ultimosBloques();
    expect(b[0]).toMatchObject({ total: 20, aciertos: 15, fallos: 4, blancos: 1 });
    const e = await erroresRecientes();
    expect(e).toHaveLength(4);
    expect(e.filter((x) => x.motivo === null)).toHaveLength(2);
    expect(e.find((x) => x.concepto)?.concepto).toBe("BNP");
    // repasos de error al día siguiente, agrupados por tema
    const rp = await repasosPendientes("2026-04-02");
    expect(rp).toHaveLength(1);
    expect(rp[0].errores).toHaveLength(4);
    expect(await contarRepasosPendientes("2026-04-02")).toBe(1);
    await marcarRepasosHechos(rp[0].errores.map((x) => x.id));
    expect(await repasosPendientes("2026-04-02")).toHaveLength(0);
  });

  it("errores sueltos sin bloque (registro en bloque con motivo común)", async () => {
    await registrar({ temaId: temaB, errores: Array(3).fill({ motivo: "lectura" }) });
    expect(await ultimosBloques()).toHaveLength(0);
    const m = await erroresPorMotivo();
    expect(m).toEqual([{ motivo: "lectura", n: 3 }]);
  });

  it("detalle excedente se recorta al nº de fallos", async () => {
    const r = await registrar({ temaId: temaA, total: 10, aciertos: 9, errores: [{ motivo: "duda" }, { motivo: "duda" }] });
    expect(r.errores).toBe(1);
  });
});

describe("análisis", () => {
  it("rendimiento, progreso, conceptos y temas débiles, 10 minutos", async () => {
    const d = hoy();
    await registrar({ fecha: d, temaId: temaA, total: 10, aciertos: 5, errores: [{ concepto: "BNP" }, { concepto: "BNP" }, { concepto: "IECA" }] });
    await registrar({ fecha: d, temaId: temaB, total: 10, aciertos: 9, errores: [] });
    await marcarRealizado(temaB, true);
    const rend = await rendimientoPorAsignatura();
    expect(rend[0]).toMatchObject({ total: 20, aciertos: 14, fallos: 6 });
    const prog = await progresoTemario();
    expect(prog[0]).toMatchObject({ total: 2, realizados: 1 });
    const deb = await conceptosDebiles();
    expect(deb[0]).toMatchObject({ concepto: "BNP", errores: 2, puntuacion: 4 });
    expect((await temasDebiles())[0].temaId).toBe(temaA);
    const p = await planDiezMinutos();
    expect(p.esquema?.nombre).toBe("BNP");
    expect(p.tarjetas).toBe(0);
    expect(p.erroresConNota.every((e) => e.concepto !== "BNP")).toBe(true);
  });
});

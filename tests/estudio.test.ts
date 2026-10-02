import { describe, it, expect, beforeEach } from "vitest";
import { dbDePrueba } from "./helpers";
import { crearAsignatura, crearTemas, marcarRealizado, guardarNotasTema, obtenerTema } from "@/lib/datos/temario";
import { registrar } from "@/lib/datos/registro";
import { guardarAjustes } from "@/lib/datos/ajustes";
import { registrarEstudio, resumenEstudio, calcularRacha, diasHasta } from "@/lib/datos/estudio";
import { crearTarjetaPropia, siguienteTarjeta } from "@/lib/datos/tarjetas";
import { buscar } from "@/lib/datos/buscar";
import { hoy, sumarDias } from "@/lib/fechas";

let tema: number;
beforeEach(async () => {
  await dbDePrueba();
  const a = await crearAsignatura("Neumología");
  tema = (await crearTemas(a.id, ["Derrame pleural"]))[0].id;
});

describe("estudio", () => {
  it("racha y días hasta el examen", () => {
    const d = "2026-05-10";
    expect(calcularRacha(new Set(["2026-05-10", "2026-05-09", "2026-05-07"]), d)).toBe(2);
    expect(calcularRacha(new Set(["2026-05-09", "2026-05-08"]), d)).toBe(2); // hoy aún no cuenta
    expect(calcularRacha(new Set(["2026-05-08"]), d)).toBe(0);
    expect(diasHasta("2026-10-02", "2027-01-23")).toBe(113);
  });

  it("resumen: objetivo, minutos, racha y cuenta atrás", async () => {
    const d = hoy();
    await registrar({ fecha: d, temaId: tema, total: 30, aciertos: 25, errores: [] });
    await registrar({ fecha: sumarDias(d, -1), temaId: tema, total: 10, aciertos: 8, errores: [] });
    await registrarEstudio(25, tema);
    await registrarEstudio(0.2, null); // ignorado
    let r = await resumenEstudio();
    expect(r).toMatchObject({ preguntasHoy: 30, minutosHoy: 25, objetivo: 0, racha: 2, diasExamen: null });
    await guardarAjustes({ objetivoPreguntas: 20, fechaExamen: sumarDias(d, 100) });
    r = await resumenEstudio();
    expect(r).toMatchObject({ objetivo: 20, racha: 1, diasExamen: 100 });
  });

  it("notas de tema, tarjeta propia y búsqueda sin tildes", async () => {
    await guardarNotasTema(tema, "  Criterios de Light: proteínas y LDH  ");
    expect((await obtenerTema(tema))?.notas).toBe("Criterios de Light: proteínas y LDH");
    await registrar({ temaId: tema, errores: [{ concepto: "Criterios de Light", nota: "Exudado si LDH > 2/3" }] });
    await crearTarjetaPropia({ temaId: tema, pregunta: "¿Cuándo es exudado un derrame según Light?", respuesta: "Proteínas pleura/suero > 0,5 o LDH > 0,6", concepto: "Criterios de Light" });
    await marcarRealizado(tema, true);
    const t = await siguienteTarjeta();
    expect(t?.concepto).toBe("Criterios de Light");
    const r = await buscar("LIGHT");
    expect(r.conceptos).toHaveLength(1);
    expect(r.tarjetas).toHaveLength(1);
    expect(r.errores).toHaveLength(1);
    expect((await buscar("neumologia")).temas).toHaveLength(1);
    expect((await buscar("x")).temas).toHaveLength(0);
  });
});

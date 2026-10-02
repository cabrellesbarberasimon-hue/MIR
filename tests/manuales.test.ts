import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { dbDePrueba } from "./helpers";
import type { Db } from "@/db";
import { secciones, tarjetas, temas, asignaturas } from "@/db/schema";
import { calidadTexto, detectarCapitulos, nombreDesdeArchivo } from "@/lib/manuales/estructura";
import { dividirEnFragmentos, localizarCita, limpiarTextoPagina, contextoCita } from "@/lib/manuales/fragmentos";
import { validar, lotes, generadorSimulado, mensajeUsuario, type Generador } from "@/lib/manuales/generador";
import { cargarManual, generarSeccion, seccionesPendientes } from "@/lib/manuales/procesar";
import { estimarCoste } from "@/lib/manuales/coste";
import { crearAsignatura, crearTemas } from "@/lib/datos/temario";
import { anadirPlan } from "@/lib/datos/plan";
import { guardarAjustes } from "@/lib/datos/ajustes";
import { asociarSeccion } from "@/lib/datos/manuales";

const relleno = " Texto de relleno para que la página tenga contenido suficiente y sea considerada extraíble correctamente.".repeat(3);
const PAGINAS = [
  "ÍNDICE\nTema 1. Insuficiencia cardiaca ........ 2\nTema 2. Valvulopatías ........ 4",
  "TEMA 1. INSUFICIENCIA CARDIACA\nEl péptido natriurético tipo B (BNP) elevado apoya el diagnóstico de insuficiencia cardiaca (MIR 19, 21)." + relleno,
  "Los IECA reducen la mortalidad en la insuficiencia cardiaca con FEVI reducida (MIR 2015)." + relleno,
  "Tema 2. Valvulopatías\nLa causa más frecuente de estenosis aórtica en ancianos es la degenerativa (MIR 18-19)." + relleno,
  "El síncope de esfuerzo en la estenosis aórtica severa indica cirugía." + relleno,
];

describe("estructura de manuales", () => {
  it("nombre de asignatura desde el archivo", () => {
    expect(nombreDesdeArchivo("03 - Cardiología (AMIR 2025).pdf")).toBe("Cardiología");
    expect(nombreDesdeArchivo("manuales/CTO_Neumologia_y_Cirugia_Toracica.pdf")).toBe("CTO Neumologia y Cirugia Toracica".replace("CTO ", ""));
    expect(nombreDesdeArchivo("Digestivo.pdf")).toBe("Digestivo");
    // Manuales AMIR 19ª ed. con código pegado al nombre (sin separadores): se reconoce por el código, no por limpieza genérica.
    expect(nombreDesdeArchivo("MnCDMIR19aED_v3.pdf")).toBe("Cardiología y Cirugía Cardiovascular");
    expect(nombreDesdeArchivo("MnNRMIR19aED_v3.pdf")).toBe("Neurología y Neurocirugía");
  });

  it("capítulos por encabezados 'Tema N' (ignora el índice)", () => {
    const c = detectarCapitulos(PAGINAS, [], "Cardiología");
    expect(c).toEqual([
      { titulo: "Insuficiencia cardiaca", paginaInicio: 2, paginaFin: 3 },
      { titulo: "Valvulopatías", paginaInicio: 4, paginaFin: 5 },
    ]);
  });

  it("capítulos por marcadores del PDF (prioritarios)", () => {
    const c = detectarCapitulos(PAGINAS, [
      { titulo: "Portada", pagina: 1, nivel: 0 },
      { titulo: "Tema 1. Insuficiencia cardiaca", pagina: 2, nivel: 0 },
      { titulo: "1.1. Clínica", pagina: 2, nivel: 1 },
      { titulo: "Tema 2. Valvulopatías", pagina: 4, nivel: 0 },
    ], "X");
    expect(c.map((x) => [x.titulo, x.paginaInicio, x.paginaFin])).toEqual([
      ["Insuficiencia cardiaca", 2, 3], ["Valvulopatías", 4, 5],
    ]);
  });

  it("marcadores 'Tema N' sin título propio, hermanos de sus subapartados (manuales AMIR)", () => {
    // El índice es plano: "Tema 1" no lleva título y es hermano (incluso de nivel distinto) de "1.2 …",
    // no su padre. El capítulo agrupa todos los subapartados hasta el siguiente marcador.
    const c = detectarCapitulos(["a", "b", "c", "d", "e", "f", "g", "h"], [
      { titulo: "Tema 1", pagina: 1, nivel: 0 },
      { titulo: "1.2. Fisiología básica", pagina: 2, nivel: 0 },
      { titulo: "1.4. Potencial de acción", pagina: 3, nivel: 0 },
      { titulo: "Tema 2", pagina: 5, nivel: 0 },
      { titulo: "2.2. Pulso arterial", pagina: 6, nivel: 0 },
    ], "X");
    expect(c).toEqual([
      { titulo: "Fisiología básica", paginaInicio: 1, paginaFin: 4 },
      { titulo: "Pulso arterial", paginaInicio: 5, paginaFin: 8 },
    ]);
  });

  it("marcadores 'Tema N' consecutivos sin subapartado que los rellene: no se pierden", () => {
    const c = detectarCapitulos(["a", "b", "c"], [
      { titulo: "Tema 1", pagina: 1, nivel: 0 },
      { titulo: "Tema 2", pagina: 2, nivel: 0 },
    ], "X");
    expect(c.map((x) => x.titulo)).toEqual(["Tema", "Tema"]);
  });

  it("sin estructura → un único capítulo; calidad del texto", () => {
    expect(detectarCapitulos(["a", "b"], [], "Manual")).toEqual([{ titulo: "Manual", paginaInicio: 1, paginaFin: 2 }]);
    expect(calidadTexto(PAGINAS.slice(1))).toBe("texto");
    expect(calidadTexto(["", " ", "x"])).toBe("escaneado");
  });
});

describe("fragmentos y citas", () => {
  it("limpia cortes de palabra y divide respetando el máximo", () => {
    expect(limpiarTextoPagina("insufi-\nciencia   cardiaca\n\n\n\n12\n")).toBe("insuficiencia cardiaca");
    const f = dividirEnFragmentos([{ pagina: 7, texto: ("Frase larga de prueba número uno. ".repeat(40) + "\n\n").repeat(3) }], 500);
    expect(f.length).toBeGreaterThan(3);
    expect(f.every((x) => x.texto.length <= 520 && x.pagina === 7)).toBe(true);
  });

  it("localiza citas ignorando espacios y comillas, devolviendo el literal", () => {
    const frag = "El  tratamiento de elección\nes la “cirugía” valvular (MIR 21). Otro dato.";
    expect(localizarCita(frag, 'tratamiento de elección es la "cirugía" valvular')).toBe("tratamiento de elección\nes la “cirugía” valvular");
    expect(localizarCita(frag, "es la cirugía percutánea")).toBeNull();
    expect(contextoCita(frag, "tratamiento de elección\nes la “cirugía” valvular")).toContain("(MIR 21).");
  });
});

describe("validación de propuestas de la IA", () => {
  const frags = [{ id: 1, pagina: 10, texto: "La causa más frecuente de estenosis aórtica en ancianos es la degenerativa (MIR 18-19). Otra frase." }];
  it("acepta citas literales, calcula refs MIR y rechaza inventadas, duplicadas y largas", () => {
    const base = { fragmento_id: 1, concepto: "Estenosis aórtica" };
    const { validas, rechazos } = validar([
      { ...base, pregunta: "¿Causa más frecuente de estenosis aórtica en ancianos?", respuesta: "Degenerativa", cita: "La causa más frecuente de estenosis aórtica en ancianos es la degenerativa" },
      { ...base, pregunta: "¿Causa más frecuente de la estenosis aórtica en ancianos?", respuesta: "Degenerativa", cita: "La causa más frecuente de estenosis aórtica en ancianos es la degenerativa" },
      { ...base, pregunta: "¿Tratamiento de la estenosis aórtica?", respuesta: "TAVI", cita: "El tratamiento de elección es la TAVI en ancianos" },
      { ...base, pregunta: "¿Qué dice el fragmento sobre ancianos?", respuesta: "x", cita: "estenosis aórtica en ancianos es la degenerativa" },
      { ...base, pregunta: "¿Algo muy largo sobre la estenosis?", respuesta: "palabra ".repeat(45), cita: "estenosis aórtica en ancianos es la degenerativa" },
    ], frags, [], 2026);
    expect(validas).toHaveLength(1);
    expect(validas[0]).toMatchObject({ pagina: 10, refsMir: [2019], respuesta: "Degenerativa" });
    expect(validas[0].prioridad).toBeGreaterThan(1);
    expect(rechazos.map((r) => r.motivo)).toEqual([
      "duplicada", "la cita no aparece literalmente en el fragmento", "pregunta sin contexto propio", "respuesta demasiado larga",
    ]);
  });

  it("lotes y mensaje", () => {
    const fs = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, pagina: 1, texto: "x".repeat(5000) }));
    expect(lotes(fs, 14000).map((l) => l.length)).toEqual([2, 2, 2, 2, 2]);
    expect(mensajeUsuario({ asignatura: "A", tema: "T", capitulo: "C", fragmentos: fs.slice(0, 1) })).toContain('<fragmento id="1" pagina="1">');
  });

  it("estimación de coste", () => {
    const c = estimarCoste(3_500_000, 250);
    expect(c.tokensEntrada).toBe(1_000_000 + 250 * 900);
    expect(c.eur).toBeGreaterThan(10);
  });
});

describe("carga de manuales y generación (BD)", () => {
  let db: Db;
  beforeEach(async () => {
    db = await dbDePrueba();
    const a = await crearAsignatura("Cardiología");
    await crearTemas(a.id, ["Insuficiencia cardiaca congestiva"]);
  });
  const pdf = { paginas: PAGINAS, indice: [], hash: "h1" };

  it("asocia capítulos a temas existentes o los crea; es idempotente", async () => {
    const r = await cargarManual("03 - Cardiología (AMIR).pdf", pdf, { anio: 2026 });
    expect(r).toMatchObject({ estado: "nuevo", capitulos: 2, temasCreados: 1 });
    const ss = await db.select({ titulo: secciones.titulo, tema: temas.nombre, refs: secciones.refsMir, asociacion: secciones.asociacion })
      .from(secciones).innerJoin(temas, eq(temas.id, secciones.temaId)).orderBy(secciones.orden);
    expect(ss[0]).toMatchObject({ titulo: "Insuficiencia cardiaca", tema: "Insuficiencia cardiaca congestiva", refs: [2019, 2021, 2015] });
    expect(ss[1]).toMatchObject({ tema: "Valvulopatías", refs: [2019] });
    expect(await db.select().from(asignaturas)).toHaveLength(1);
    expect((await cargarManual("03 - Cardiología (AMIR).pdf", pdf)).estado).toBe("sin_cambios");
    expect((await cargarManual("03 - Cardiología (AMIR).pdf", { ...pdf, hash: "h2" })).estado).toBe("cambiado_omitido");
  });

  it("genera tarjetas por sección, reanudable, y respeta revisión previa y asociación manual", async () => {
    await cargarManual("Cardiologia.pdf", pdf, { anio: 2026 });
    const pendientes = await seccionesPendientes();
    expect(pendientes).toHaveLength(2);

    // Un fallo deja la sección en error, sin tarjetas parciales
    const roto: Generador = async () => { throw new Error("sin conexión"); };
    await expect(generarSeccion(pendientes[0].id, roto)).rejects.toThrow("sin conexión");
    expect((await db.select().from(secciones).where(eq(secciones.id, pendientes[0].id)))[0].estado).toBe("error");
    expect(await db.select().from(tarjetas)).toHaveLength(0);

    // Reintento: genera, y no vuelve a aparecer como pendiente
    const r = await generarSeccion(pendientes[0].id, generadorSimulado);
    expect(r.tarjetas.length).toBeGreaterThan(0);
    const t = await db.select().from(tarjetas);
    expect(t.every((x) => x.estado === "activa" && x.fragmento.length > 0 && x.pagina! >= 2)).toBe(true);
    expect((await seccionesPendientes()).map((s) => s.id)).toEqual([pendientes[1].id]);

    // Solo planificados
    expect(await seccionesPendientes({ soloPlanificados: true })).toHaveLength(0);
    await anadirPlan("2026-01-01", [pendientes[1].temaId!]);
    expect(await seccionesPendientes({ soloPlanificados: true })).toHaveLength(1);

    // Revisión previa
    await guardarAjustes({ revisionPrevia: true });
    await generarSeccion(pendientes[1].id, generadorSimulado);
    const nuevas = await db.select().from(tarjetas).where(eq(tarjetas.seccionId, pendientes[1].id));
    expect(nuevas.every((x) => x.estado === "pendiente_revision")).toBe(true);

    // Modo seco no escribe
    const antes = (await db.select().from(tarjetas)).length;
    await db.update(secciones).set({ estado: "pendiente" }).where(eq(secciones.id, pendientes[1].id));
    await generarSeccion(pendientes[1].id, generadorSimulado, { seco: true });
    expect((await db.select().from(tarjetas)).length).toBe(antes);

    // Corrección manual de la asociación mueve las tarjetas
    const otro = (await crearTemas(nuevas[0].temaId === 1 ? 1 : (await db.select().from(asignaturas))[0].id, ["Cardiopatía valvular"]))[0];
    await asociarSeccion(pendientes[1].id, otro.id);
    const movidas = await db.select().from(tarjetas).where(eq(tarjetas.seccionId, pendientes[1].id));
    expect(movidas.every((x) => x.temaId === otro.id)).toBe(true);
    expect((await db.select().from(secciones).where(eq(secciones.id, pendientes[1].id)))[0].asociacion).toBe("manual");
  });
});

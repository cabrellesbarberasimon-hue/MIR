// Tarjetas redactadas por un asistente (p. ej. Claude Code en local) en vez de por la API.
// 1) exportar: escribe los fragmentos numerados de un capítulo en privado/secciones/<id>.md
//      npm run tarjetas-sin-api -- exportar --seccion 12        (o --siguiente: el pendiente de más prioridad)
// 2) el asistente escribe privado/tarjetas/<id>.json con el formato:
//      {"tarjetas":[{"fragmento_id":3,"concepto":"…","pregunta":"…","respuesta":"…","cita":"texto literal"}]}
//    siguiendo las reglas de PROMPT_SISTEMA (src/lib/manuales/generador.ts).
// 3) importar: valida (cita literal, duplicados, longitud) y guarda, igual que la generación por API.
//      npm run tarjetas-sin-api -- importar --seccion 12
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { arg, privado } from "./comun";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { secciones, temas, asignaturas } from "@/db/schema";
import { dividirEnFragmentos } from "@/lib/manuales/fragmentos";
import { PROMPT_SISTEMA, PropuestaSchema, type Generador } from "@/lib/manuales/generador";
import { generarSeccion, seccionesPendientes } from "@/lib/manuales/procesar";

const accion = process.argv[2];
let id = arg("seccion") ? Number(arg("seccion")) : undefined;
if (arg("siguiente") === "true") {
  const p = (await seccionesPendientes({ soloPlanificados: arg("todo") !== "true" }))
    .sort((a, b) => b.prioridad - a.prioridad)[0] ?? (await seccionesPendientes())[0];
  id = p?.id;
}
if (!id || !["exportar", "importar"].includes(accion)) {
  console.error("Uso: npm run tarjetas-sin-api -- exportar|importar --seccion <id> (o exportar --siguiente)");
  process.exit(1);
}

const [s] = await getDb().select({ seccion: secciones, tema: temas.nombre, asignatura: asignaturas.nombre })
  .from(secciones).innerJoin(temas, eq(temas.id, secciones.temaId))
  .innerJoin(asignaturas, eq(asignaturas.id, temas.asignaturaId)).where(eq(secciones.id, id));
if (!s) { console.error(`Sección ${id} no encontrada o sin tema`); process.exit(1); }
const fragmentos = dividirEnFragmentos(s.seccion.paginasTexto);
const json = path.join(privado, "tarjetas", `${id}.json`);

if (accion === "exportar") {
  await mkdir(path.join(privado, "secciones"), { recursive: true });
  await mkdir(path.join(privado, "tarjetas"), { recursive: true });
  const md = [
    `# Sección ${id}: ${s.seccion.titulo}`, `Asignatura: ${s.asignatura} · Tema: ${s.tema} · Estado: ${s.seccion.estado}`, "",
    "## Instrucciones", PROMPT_SISTEMA, "",
    `Escribe el resultado en ${path.relative(process.cwd(), json)} con el formato {"tarjetas":[{fragmento_id, concepto, pregunta, respuesta, cita}]}`,
    "y luego ejecuta: npm run tarjetas-sin-api -- importar --seccion " + id, "",
    "## Fragmentos", ...fragmentos.map((f) => `<fragmento id="${f.id}" pagina="${f.pagina}">\n${f.texto}\n</fragmento>\n`),
  ].join("\n");
  const ruta = path.join(privado, "secciones", `${id}.md`);
  await writeFile(ruta, md);
  console.log(`Exportado: ${path.relative(process.cwd(), ruta)} (${fragmentos.length} fragmentos)`);
  process.exit(0);
}

const propuestas = PropuestaSchema.parse(JSON.parse(await readFile(json, "utf8"))).tarjetas;
const desdeArchivo: Generador = async (e) => {
  const ids = new Set(e.fragmentos.map((f) => f.id));
  return { tarjetas: propuestas.filter((p) => ids.has(p.fragmento_id)), tokensEntrada: 0, tokensSalida: 0 };
};
const r = await generarSeccion(id, desdeArchivo, { seco: arg("seco") === "true" });
console.log(`Guardadas ${r.tarjetas.length} tarjetas; descartadas ${r.rechazos.length}:`);
for (const x of r.rechazos) console.log(`  - ${x.motivo}: ${x.propuesta.pregunta}`);
process.exit(0);

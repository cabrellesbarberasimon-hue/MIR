// Genera tarjetas con IA capítulo a capítulo y las guarda en la base de datos.
// Reanudable: cada capítulo se guarda entero o queda en "error"; lo ya generado no se repite.
//
// Uso:
//   npm run generar-tarjetas -- --estimar            solo estima el coste
//   npm run generar-tarjetas -- --seccion 12 --seco  prueba un capítulo sin guardar (muestra las tarjetas)
//   npm run generar-tarjetas -- --muestra            además escribe docs/muestra-tarjetas.md (no se sube a git)
//   npm run generar-tarjetas                         procesa lo pendiente (si cuesta > 20 €, solo temas planificados)
//   npm run generar-tarjetas -- --todo               procesa todo aunque supere el límite
// Otras opciones: --manual "cardio"  --limite 5  --esfuerzo low|medium|high  --simulado (sin IA, sin guardar)
import { writeFile, mkdir } from "node:fs/promises";
import { arg } from "./comun";
import { seccionesPendientes, generarSeccion } from "@/lib/manuales/procesar";
import { dividirEnFragmentos } from "@/lib/manuales/fragmentos";
import { lotes, generadorSimulado, VERSION_PROMPT, type Generador } from "@/lib/manuales/generador";
import { generadorAnthropic } from "@/lib/manuales/anthropic";
import { estimarCoste, costeReal, LIMITE_EUR, MODELO } from "@/lib/manuales/coste";
import { getDb } from "@/db";
import { manuales } from "@/db/schema";

const simulado = arg("simulado") === "true";
const seco = simulado || arg("seco") === "true";
const muestra = arg("muestra") === "true";
const limite = Number(arg("limite") ?? Infinity);
const filtroManual = arg("manual")?.toLowerCase();
const seccionId = arg("seccion") ? Number(arg("seccion")) : undefined;
const esfuerzo = (arg("esfuerzo") ?? "medium") as "low" | "medium" | "high";

function estimar(lista: Awaited<ReturnType<typeof seccionesPendientes>>) {
  let chars = 0, peticiones = 0;
  for (const s of lista) {
    const f = dividirEnFragmentos(s.paginasTexto);
    chars += f.reduce((a, x) => a + x.texto.length, 0);
    peticiones += lotes(f).length;
  }
  return { ...estimarCoste(chars, peticiones), secciones: lista.length, peticiones };
}

let manualId: number | undefined;
if (filtroManual) {
  const m = (await getDb().select().from(manuales)).find((x) => x.archivo.toLowerCase().includes(filtroManual));
  if (!m) { console.error(`No hay ningún manual cargado que contenga "${filtroManual}"`); process.exit(1); }
  manualId = m.id;
}

let lista = await seccionesPendientes({ manualId, seccionId });
let est = estimar(lista);
console.log(`Pendientes: ${est.secciones} capítulos, ${est.peticiones} peticiones. Coste estimado: ~${est.eur.toFixed(2)} € (${MODELO}, prompt v${VERSION_PROMPT}).`);

if (!seccionId && est.eur > LIMITE_EUR && arg("todo") !== "true") {
  lista = await seccionesPendientes({ manualId, soloPlanificados: true });
  est = estimar(lista);
  console.log(`Supera ${LIMITE_EUR} € → solo temas con planificación: ${est.secciones} capítulos, ~${est.eur.toFixed(2)} €. Usa --todo para procesar el resto.`);
}
if (arg("estimar") === "true") process.exit(0);
lista = lista.slice(0, limite);

if (!simulado && !process.env.ANTHROPIC_API_KEY) {
  console.error("Falta ANTHROPIC_API_KEY en .env (ver PENDIENTE.md). Puedes probar el flujo con --simulado.");
  process.exit(1);
}
const generador: Generador = simulado ? generadorSimulado : generadorAnthropic({ esfuerzo });

let interrumpido = false;
process.on("SIGINT", () => {
  if (interrumpido) process.exit(130);
  interrumpido = true;
  console.log("\nSe detendrá al terminar el capítulo en curso (Ctrl+C otra vez para salir ya; no se guarda nada a medias).");
});

const lineasMuestra: string[] = ["# Muestra de tarjetas generadas", "", `Modelo ${MODELO}, prompt v${VERSION_PROMPT}. Archivo local, no se sube a git.`, ""];
let tIn = 0, tOut = 0, total = 0, errores = 0;
for (const [i, s] of lista.entries()) {
  if (interrumpido) break;
  process.stdout.write(`[${i + 1}/${lista.length}] ${s.manual} · ${s.titulo}: `);
  try {
    const r = await generarSeccion(s.id, generador, { seco });
    tIn += r.tokensEntrada; tOut += r.tokensSalida; total += r.tarjetas.length;
    console.log(`${r.tarjetas.length} tarjetas (${r.rechazos.length} descartadas por validación) · acumulado ~${costeReal(tIn, tOut).eur.toFixed(2)} €`);
    if (seco || muestra) {
      const bloque = [`## ${s.manual} · ${s.titulo}`, ""];
      for (const t of r.tarjetas) {
        bloque.push(`**P:** ${t.pregunta}  `, `**R:** ${t.respuesta}  `, `*Concepto:* ${t.concepto} · *pág.* ${t.pagina}${t.refsMir.length ? ` · MIR ${t.refsMir.join(", ")}` : ""}  `, `> ${t.fragmento.replace(/\n/g, " ")}`, "");
      }
      if (r.rechazos.length) bloque.push("Descartadas:", ...r.rechazos.map((x) => `- ${x.motivo}: ${x.propuesta.pregunta}`), "");
      lineasMuestra.push(...bloque);
      if (seco) console.log(bloque.join("\n"));
    }
  } catch (e) {
    errores++;
    console.log(`ERROR: ${(e as Error).message} (quedará pendiente para reintentar)`);
  }
}
if (muestra) {
  await mkdir("docs", { recursive: true });
  await writeFile("docs/muestra-tarjetas.md", lineasMuestra.join("\n"));
  console.log("Muestra escrita en docs/muestra-tarjetas.md");
}
console.log(`\nTotal: ${total} tarjetas${seco ? " (sin guardar)" : ""}, ${errores} errores. Tokens: ${tIn} entrada / ${tOut} salida ≈ ${costeReal(tIn, tOut).eur.toFixed(2)} €.`);
process.exit(errores ? 1 : 0);

// Inspección ligera de los manuales: formatos, calidad del texto, estructura y referencias MIR.
// Uso: npm run analizar-manuales [-- --muestras 3]
// Escribe el informe en privado/analisis-manuales.md (no se sube a git).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { arg, dirManuales, listarArchivos, privado } from "./comun";
import { leerPdf } from "@/lib/manuales/pdf";
import { calidadTexto, detectarCapitulos, nombreDesdeArchivo } from "@/lib/manuales/estructura";
import { detectarRefsMir } from "@/lib/mir";
import { dividirEnFragmentos } from "@/lib/manuales/fragmentos";
import { estimarCoste, LIMITE_EUR } from "@/lib/manuales/coste";
import { lotes } from "@/lib/manuales/generador";

const dir = dirManuales();
const archivos = await listarArchivos(dir);
const muestras = Number(arg("muestras") ?? 3);
const l: string[] = [`# Análisis de manuales (local)\n`, `Carpeta: \`${dir}\` · ${archivos.length} archivos\n`];

const formatos = new Map<string, number>();
for (const a of archivos) formatos.set(path.extname(a.relativa).toLowerCase() || "(sin ext.)", (formatos.get(path.extname(a.relativa).toLowerCase()) ?? 0) + 1);
l.push("## Formatos\n", ...[...formatos].map(([e, n]) => `- ${e}: ${n}`), "");

l.push("## Manuales\n", "| Archivo | Asignatura deducida | Págs. | Texto | Capítulos | Método | Refs MIR |", "|---|---|---|---|---|---|---|");
const formatosRef = new Map<string, number>();
let totalChars = 0, totalPeticiones = 0;
const detalle: string[] = [];
let n = 0;
for (const a of archivos.filter((x) => path.extname(x.relativa).toLowerCase() === ".pdf")) {
  process.stdout.write(`Leyendo ${a.relativa}… `);
  try {
    const pdf = await leerPdf(a.absoluta);
    const nombre = nombreDesdeArchivo(a.relativa);
    const caps = detectarCapitulos(pdf.paginas, pdf.indice, nombre);
    const metodo = pdf.indice.length ? "índice PDF" : caps.length > 1 ? "encabezados" : "manual completo";
    const texto = pdf.paginas.join("\n");
    const refs = detectarRefsMir(texto);
    for (const m of texto.matchAll(/\(\s*MIR[^)]{0,40}\)/g)) {
      const forma = m[0].replace(/\d/g, "9").replace(/\s+/g, " ");
      formatosRef.set(forma, (formatosRef.get(forma) ?? 0) + 1);
    }
    const frags = dividirEnFragmentos(pdf.paginas.map((t, i) => ({ pagina: i + 1, texto: t })));
    totalChars += frags.reduce((s, f) => s + f.texto.length, 0);
    totalPeticiones += lotes(frags).length;
    l.push(`| ${a.relativa} | ${nombre} | ${pdf.paginas.length} | ${calidadTexto(pdf.paginas)} | ${caps.length} | ${metodo} | ${refs.length} |`);
    if (n++ < muestras && caps.length) {
      const c = caps[Math.min(1, caps.length - 1)];
      detalle.push(`### ${a.relativa}\n`, `Capítulos detectados: ${caps.slice(0, 15).map((x) => `${x.titulo} (${x.paginaInicio}-${x.paginaFin})`).join("; ")}${caps.length > 15 ? "…" : ""}\n`,
        `Muestra (capítulo «${c.titulo}», pág. ${c.paginaInicio}, primeros 1500 caracteres extraídos):\n`, "```", pdf.paginas[c.paginaInicio - 1]?.slice(0, 1500) ?? "", "```\n");
    }
    console.log(`${pdf.paginas.length} págs., ${caps.length} capítulos`);
  } catch (e) {
    l.push(`| ${a.relativa} | — | — | ERROR: ${(e as Error).message} | | | |`);
    console.log("ERROR", (e as Error).message);
  }
}
l.push("", "## Formatos de referencia MIR encontrados (dígitos → 9)\n", ...[...formatosRef].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([f, c]) => `- \`${f}\`: ${c}`));
const coste = estimarCoste(totalChars, totalPeticiones);
l.push("", "## Estimación de coste de generar todas las tarjetas\n",
  `- Texto útil: ${(totalChars / 1e6).toFixed(1)} M caracteres en ${totalPeticiones} peticiones`,
  `- ~${(coste.tokensEntrada / 1e6).toFixed(1)} M tokens de entrada, ~${(coste.tokensSalida / 1e6).toFixed(1)} M de salida`,
  `- **~${coste.eur.toFixed(0)} €** (${coste.usd.toFixed(0)} USD). Límite sin confirmación: ${LIMITE_EUR} €.`, "",
  "## Muestras\n", ...detalle);
await mkdir(privado, { recursive: true });
await writeFile(path.join(privado, "analisis-manuales.md"), l.join("\n"));
console.log(`\nInforme: privado/analisis-manuales.md · Coste estimado total: ~${coste.eur.toFixed(0)} €`);
process.exit(0);

// Carga los manuales en la base de datos: detecta capítulos, los asocia a temas
// (creando asignaturas/temas si faltan) y calcula referencias MIR y prioridad.
// Uso: npm run cargar-manuales [-- --forzar] [-- --solo "Cardio"] [-- --excluir "Libro Gordo,LG Imagenes"]
// Es idempotente: los manuales sin cambios se saltan.
import path from "node:path";
import { arg, dirManuales, esExamen, listarArchivos } from "./comun";
import { leerPdf } from "@/lib/manuales/pdf";
import { cargarManual } from "@/lib/manuales/procesar";

const forzar = arg("forzar") === "true";
const solo = arg("solo")?.toLowerCase();
const excluir = arg("excluir")?.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
const archivos = (await listarArchivos(dirManuales()))
  .filter((a) => path.extname(a.relativa).toLowerCase() === ".pdf")
  .filter((a) => !solo || a.relativa.toLowerCase().includes(solo))
  .filter((a) => !excluir || !excluir.some((e) => a.relativa.toLowerCase().includes(e)));
const examenes = archivos.filter((a) => esExamen(a.relativa));
if (examenes.length) console.log(`Se omiten ${examenes.length} PDF que parecen exámenes/simulacros: ${examenes.map((a) => a.relativa).join(", ")}`);
archivos.splice(0, archivos.length, ...archivos.filter((a) => !esExamen(a.relativa)));

console.log(`${archivos.length} PDF en ${dirManuales()}`);
let errores = 0;
for (const a of archivos) {
  process.stdout.write(`· ${a.relativa}: `);
  try {
    const r = await cargarManual(a.relativa, await leerPdf(a.absoluta), { forzar });
    console.log({
      nuevo: `${r.capitulos} capítulos (${r.temasCreados} temas nuevos)`,
      recargado: `recargado: ${r.capitulos} capítulos`,
      sin_cambios: "sin cambios",
      cambiado_omitido: "el archivo ha cambiado; usa --forzar para recargarlo (las tarjetas existentes se conservan)",
    }[r.estado]);
  } catch (e) {
    errores++;
    console.log("ERROR:", (e as Error).message);
  }
}
console.log(`Hecho.${errores ? ` ${errores} con error.` : ""} Revisa las asociaciones en la app: Más → Manuales.`);
process.exit(errores ? 1 : 0);

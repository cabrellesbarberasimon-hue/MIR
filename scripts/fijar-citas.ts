// Corrige las citas de privado/tarjetas/<id>.json para que sean el texto LITERAL del fragmento,
// carácter a carácter, incluso si el redactor tecleó una tilde distinta a la del PDF (p. ej. el PDF
// usa letra base + acento combinante Unicode en vez de la letra precompuesta: ver DECISIONS.md).
// Busca cada cita ignorando acentos/mayúsculas y la sustituye por el fragmento exacto del manual.
//      npx tsx scripts/fijar-citas.ts --seccion 12
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { arg, privado } from "./comun";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { secciones } from "@/db/schema";
import { dividirEnFragmentos } from "@/lib/manuales/fragmentos";

const id = Number(arg("seccion"));
if (!id) { console.error("Uso: npx tsx scripts/fijar-citas.ts --seccion <id>"); process.exit(1); }

const [s] = await getDb().select().from(secciones).where(eq(secciones.id, id));
if (!s) { console.error(`Sección ${id} no encontrada`); process.exit(1); }
const fragmentos = dividirEnFragmentos(s.paginasTexto);
const json = path.join(privado, "tarjetas", `${id}.json`);
const data = JSON.parse(await readFile(json, "utf8"));

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const espacios = (s: string) => s.replace(/\s+/g, " ").trim();

/** Busca `cita` en `texto` ignorando acentos y espacios; devuelve el fragmento LITERAL original o null. */
function buscarLiteral(texto: string, cita: string): string | null {
  const objetivo = sinAcentos(espacios(cita)).toLowerCase();
  if (objetivo.length < 10) return null;
  let norm = "";
  const mapa: number[] = [];
  let enEspacio = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (/\s/.test(ch)) {
      if (!enEspacio && norm.length) { norm += " "; mapa.push(i); }
      enEspacio = true;
    } else {
      const limpio = sinAcentos(ch).toLowerCase();
      for (const c of limpio) { norm += c; mapa.push(i); }
      enEspacio = false;
    }
  }
  const pos = norm.indexOf(objetivo);
  if (pos < 0) return null;
  return texto.slice(mapa[pos], mapa[pos + objetivo.length - 1] + 1);
}

let arregladas = 0, sinEncontrar = 0;
for (const t of data.tarjetas) {
  const frag = fragmentos.find((f) => f.id === t.fragmento_id);
  if (!frag) { console.log(`  fragmento_id ${t.fragmento_id} no existe (tarjeta: ${t.pregunta?.slice(0, 60)})`); sinEncontrar++; continue; }
  const literal = buscarLiteral(frag.texto, t.cita);
  if (!literal) { console.log(`  no encontrada: "${t.cita.slice(0, 60)}..." (fragmento ${t.fragmento_id})`); sinEncontrar++; continue; }
  if (literal !== t.cita) arregladas++;
  t.cita = literal;
}
await writeFile(json, JSON.stringify(data, null, 2));
console.log(`Citas arregladas: ${arregladas}. Sin encontrar (revisar a mano): ${sinEncontrar}. Total: ${data.tarjetas.length}.`);
process.exit(0);

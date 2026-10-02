// División del texto de un capítulo en fragmentos con su página, y validación de citas.

export type Fragmento = { id: number; pagina: number; texto: string };

/** Longitud objetivo de cada fragmento (caracteres). */
export const MAX_FRAGMENTO = 1800;

/** Limpia ruido típico de extracción: guiones de corte de línea, espacios repetidos, cabeceras numéricas. */
export function limpiarTextoPagina(t: string): string {
  return t
    .replace(/\r/g, "")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2") // pala-\nbra → palabra
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*\d{1,4}\s*$/gm, "") // número de página suelto
    .trim();
}

export function dividirEnFragmentos(paginas: { pagina: number; texto: string }[], max = MAX_FRAGMENTO): Fragmento[] {
  const out: Fragmento[] = [];
  for (const { pagina, texto } of paginas) {
    const limpio = limpiarTextoPagina(texto);
    if (limpio.replace(/\s/g, "").length < 40) continue;
    // Párrafos (o líneas, si la extracción no deja líneas en blanco)
    const partes = limpio.split(/\n\s*\n/).length > 1 ? limpio.split(/\n\s*\n/) : limpio.split("\n");
    let actual = "";
    const volcar = () => {
      if (actual.trim()) out.push({ id: out.length + 1, pagina, texto: actual.trim() });
      actual = "";
    };
    for (const p of partes) {
      if (p.length > max) {
        volcar();
        // Párrafo enorme: cortar por frases
        for (const frase of p.split(/(?<=[.;:])\s+/)) {
          if (actual.length + frase.length > max) volcar();
          actual += (actual ? " " : "") + frase;
        }
        volcar();
        continue;
      }
      if (actual.length + p.length + 2 > max) volcar();
      actual += (actual ? "\n" : "") + p;
    }
    volcar();
  }
  return out;
}

const espacios = (s: string) => s.replace(/\s+/g, " ").trim();
const comillas = (s: string) => s.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-");

/**
 * Localiza la cita dentro del fragmento ignorando diferencias de espacios/comillas.
 * Devuelve el texto LITERAL del manual correspondiente (o null si no está).
 */
export function localizarCita(fragmento: string, cita: string): string | null {
  const c = comillas(espacios(cita));
  if (c.length < 15) return null;
  // Mapa de índices del texto normalizado al original
  const original = fragmento;
  let norm = "";
  const mapa: number[] = [];
  let enEspacio = false;
  for (let i = 0; i < original.length; i++) {
    const ch = original[i];
    if (/\s/.test(ch)) {
      if (!enEspacio && norm.length) { norm += " "; mapa.push(i); }
      enEspacio = true;
    } else {
      norm += comillas(ch);
      mapa.push(i);
      enEspacio = false;
    }
  }
  const pos = norm.indexOf(c);
  if (pos < 0) return null;
  return original.slice(mapa[pos], mapa[pos + c.length - 1] + 1);
}

/** Contexto de la cita hasta el final de la frase (donde suelen ir las referencias "(MIR 21)"). */
export function contextoCita(fragmento: string, citaLiteral: string): string {
  const i = fragmento.indexOf(citaLiteral);
  if (i < 0) return citaLiteral;
  const resto = fragmento.slice(i + citaLiteral.length);
  const fin = resto.search(/[.\n]/);
  return citaLiteral + resto.slice(0, fin < 0 ? 80 : Math.min(fin + 1, 120));
}

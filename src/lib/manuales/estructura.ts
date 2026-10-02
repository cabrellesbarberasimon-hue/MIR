// Detección de la estructura de un manual (funciones puras, testeables).
import type { EntradaIndice } from "./pdf";
import { normalizar } from "@/lib/texto";

export type Capitulo = { titulo: string; paginaInicio: number; paginaFin: number };

/** Caracteres "útiles" mínimos para considerar que una página tiene texto extraíble. */
const MIN_CHARS_PAGINA = 200;

export function calidadTexto(paginas: string[]): "texto" | "mixto" | "escaneado" {
  if (!paginas.length) return "escaneado";
  const conTexto = paginas.filter((p) => p.replace(/\s/g, "").length >= MIN_CHARS_PAGINA).length / paginas.length;
  return conTexto >= 0.8 ? "texto" : conTexto >= 0.2 ? "mixto" : "escaneado";
}

// Manuales AMIR 19ª edición nombrados "Mn<código>MIR19aED_v3.pdf" (p. ej. "MnCDMIR19aED_v3.pdf"): el nombre
// va pegado sin separadores y la limpieza genérica no lo reconoce. Comprobado contra el índice real de cada PDF.
const CODIGOS_AMIR: Record<string, string> = {
  cd: "Cardiología y Cirugía Cardiovascular",
  dg: "Digestivo y Cirugía General",
  dm: "Dermatología",
  ed: "Endocrinología, Metabolismo y Nutrición",
  et: "Estadística y Epidemiología",
  gc: "Ginecología y Obstetricia",
  hm: "Hematología",
  if: "Infecciosas y Microbiología",
  im: "Inmunología",
  mc: "Miscelánea",
  nf: "Nefrología",
  nm: "Neumología",
  nr: "Neurología y Neurocirugía",
  of: "Oftalmología",
  or: "Otorrinolaringología",
  pd: "Pediatría",
  pq: "Psiquiatría",
  rm: "Reumatología",
  tm: "Traumatología y Cirugía Ortopédica",
  ur: "Urología",
};

/** Nombre de asignatura a partir del nombre de archivo: "03 - Cardiología (AMIR 2025).pdf" → "Cardiología". */
export function nombreDesdeArchivo(archivo: string): string {
  const base = archivo.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, "");
  const amir = base.match(/^mn([a-z]{2})mir\d/i);
  if (amir && CODIGOS_AMIR[amir[1].toLowerCase()]) return CODIGOS_AMIR[amir[1].toLowerCase()];
  const limpio = base
    .replace(/[_]+/g, " ")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/^\s*(?:\d+[\s.\-–]*)+/, "")
    .replace(/\b(manual|amir|cto|academia\s*mir|mir|ed(icion|ición)?|v\d+|\d{4})\b/gi, " ")
    .replace(/\s*[-–]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return limpio ? limpio[0].toUpperCase() + limpio.slice(1) : base;
}

// Encabezados de capítulo típicos: "Tema 3. Valvulopatías", "TEMA 3 VALVULOPATÍAS",
// "Capítulo 12: Asma", "CAPÍTULO XII. ...". Exige un título real: se usa en el texto de página (sin
// marcadores del PDF), donde una línea suelta de 1-2 palabras no basta para fiarse de que es un encabezado.
const RE_CAPITULO = /^\s*(?:tema|cap[ií]tulo)\s+(\d{1,3}|[ivxlc]{1,7})\b\s*[.:\-–]?\s*(.{3,120})$/i;

// Igual, pero para los marcadores del índice del PDF, donde sí es fiable aunque no lleve título: varios
// manuales AMIR listan "Tema N" (sin título propio) como hermano -no padre- de sus subapartados "N.1 …",
// "N.2 …" en el mismo nivel del índice; admite título vacío para reconocerlo igualmente como marcador.
const RE_MARCADOR = /^\s*(?:tema|cap[ií]tulo)\s+(\d{1,3}|[ivxlc]{1,7})\b\s*[.:\-–]?\s*(.*)$/i;

function limpiarTitulo(t: string) {
  const s = t.replace(/\s+/g, " ").replace(/[.\s]+\d+$/, "").trim();
  // Títulos en mayúsculas → formato frase
  return s === s.toUpperCase() ? s[0] + s.slice(1).toLowerCase() : s;
}

function cerrar(inicios: { titulo: string; pagina: number }[], total: number): Capitulo[] {
  // Un capítulo por página de inicio (si hay dos marcadores en la misma página, vale el primero).
  const unicos = [...inicios].sort((a, b) => a.pagina - b.pagina)
    .filter((c, i, arr) => i === 0 || arr[i - 1].pagina !== c.pagina);
  return unicos.map((c, i) => ({
    titulo: limpiarTitulo(c.titulo),
    paginaInicio: c.pagina,
    // Los capítulos empiezan en página nueva en los manuales MIR habituales.
    paginaFin: unicos[i + 1] ? unicos[i + 1].pagina - 1 : Math.max(c.pagina, total),
  }));
}

/**
 * Si el nivel elegido del índice mezcla marcadores "Tema N" (con o sin título propio) con sus
 * subapartados como hermanos -no hijos- (frecuente en los manuales AMIR), agrupa cada marcador con los
 * subapartados que lo siguen hasta el próximo marcador: usa el título del marcador si lo tiene o, si no,
 * el del primer subapartado (sin su numeración "N.M "). Si el nivel no tiene marcadores reconocibles,
 * cada entrada se trata como su propio capítulo (comportamiento anterior, para índices ya "planos").
 */
function agruparPorMarcador(entradas: EntradaIndice[]): { titulo: string; pagina: number }[] {
  const ordenadas = [...entradas].sort((a, b) => a.pagina - b.pagina);
  if (ordenadas.filter((e) => RE_MARCADOR.test(e.titulo)).length < 2) {
    return ordenadas.map((e) => ({ titulo: e.titulo, pagina: e.pagina }));
  }
  const out: { titulo: string; pagina: number; pendiente: boolean }[] = [];
  for (const e of ordenadas) {
    const m = e.titulo.match(RE_MARCADOR);
    if (m) {
      const desc = m[2].trim();
      out.push({ titulo: desc.length >= 3 ? desc : e.titulo, pagina: e.pagina, pendiente: desc.length < 3 });
    } else if (out.length && out[out.length - 1].pendiente) {
      out[out.length - 1].titulo = e.titulo.replace(/^\s*\d+(\.\d+)*\.?\s*/, "") || out[out.length - 1].titulo;
      out[out.length - 1].pendiente = false;
    }
    // Un subapartado que no es marcador y no completa un título pendiente queda absorbido: su página
    // cae dentro del rango del capítulo abierto (cerrar() calcula paginaFin con el siguiente marcador).
  }
  return out.map(({ titulo, pagina }) => ({ titulo, pagina }));
}

/**
 * Capítulos del manual. Estrategia, de más a menos fiable:
 * 1) índice/marcadores del PDF (nivel con más entradas "tipo capítulo");
 * 2) encabezados "Tema N" / "Capítulo N" al principio de página;
 * 3) el manual entero como un único capítulo.
 */
export function detectarCapitulos(paginas: string[], indice: EntradaIndice[], tituloManual: string): Capitulo[] {
  const total = paginas.length;
  if (indice.length) {
    const esMarcador = (e: EntradaIndice) => RE_MARCADOR.test(e.titulo);
    const niveles = [0, 1, 2].map((n) => indice.filter((e) => e.nivel === n));
    // Preferir el nivel cuyos títulos parecen capítulos; si no, el primer nivel con ≥2 entradas.
    const elegido = niveles.find((l) => l.filter(esMarcador).length >= 2) ?? niveles.find((l) => l.length >= 2);
    if (elegido) {
      const filtrado = elegido.filter((e) => !/^(índice|indice|contents|bibliograf|portada|cr[eé]ditos)/i.test(normalizar(e.titulo)));
      if (filtrado.length) return cerrar(agruparPorMarcador(filtrado), total);
    }
  }
  const inicios: { titulo: string; pagina: number }[] = [];
  const vistos = new Set<string>();
  paginas.forEach((texto, i) => {
    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
    for (const l of lineas) {
      const m = l.match(RE_CAPITULO);
      if (m && !/\.{3,}/.test(l)) { // ignora líneas de índice "Tema 3 ........ 45"
        const clave = m[1].toLowerCase();
        if (!vistos.has(clave)) {
          vistos.add(clave);
          inicios.push({ titulo: m[2], pagina: i + 1 });
        }
        break;
      }
    }
  });
  if (inicios.length >= 2) return cerrar(inicios, total);
  return [{ titulo: tituloManual, paginaInicio: 1, paginaFin: Math.max(1, total) }];
}

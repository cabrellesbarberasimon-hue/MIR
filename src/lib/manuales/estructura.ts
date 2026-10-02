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

/** Nombre de asignatura a partir del nombre de archivo: "03 - Cardiología (AMIR 2025).pdf" → "Cardiología". */
export function nombreDesdeArchivo(archivo: string): string {
  const base = archivo.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, "");
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
// "Capítulo 12: Asma", "CAPÍTULO XII. ...".
const RE_CAPITULO = /^\s*(?:tema|cap[ií]tulo)\s+(\d{1,3}|[ivxlc]{1,7})\b\s*[.:\-–]?\s*(.{3,120})$/i;

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
 * Capítulos del manual. Estrategia, de más a menos fiable:
 * 1) índice/marcadores del PDF (nivel con más entradas "tipo capítulo");
 * 2) encabezados "Tema N" / "Capítulo N" al principio de página;
 * 3) el manual entero como un único capítulo.
 */
export function detectarCapitulos(paginas: string[], indice: EntradaIndice[], tituloManual: string): Capitulo[] {
  const total = paginas.length;
  if (indice.length) {
    const esCap = (e: EntradaIndice) => RE_CAPITULO.test(e.titulo);
    const niveles = [0, 1, 2].map((n) => indice.filter((e) => e.nivel === n));
    // Preferir el nivel cuyos títulos parecen capítulos; si no, el primer nivel con ≥2 entradas.
    const elegido = niveles.find((l) => l.filter(esCap).length >= 2) ?? niveles.find((l) => l.length >= 2);
    if (elegido) {
      const filtrado = elegido.filter((e) => !/^(índice|indice|contents|bibliograf|portada|cr[eé]ditos)/i.test(normalizar(e.titulo)));
      if (filtrado.length) return cerrar(filtrado.map((e) => ({ titulo: e.titulo.replace(RE_CAPITULO, "$2") || e.titulo, pagina: e.pagina })), total);
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

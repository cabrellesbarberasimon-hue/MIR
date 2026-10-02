// Detección de referencias MIR en el texto de los manuales y cálculo de prioridad.
// Formatos admitidos: "(MIR 2021)", "(MIR 21)", "(MIR 19, 21)", "(MIR 19 y 21)",
// "(MIR 18-19)" (convocatoria → se toma el año del examen, el segundo),
// "MIR 2019-2020", varias apariciones "MIR 15; MIR 21".

const BLOQUE = /\bMIR\s*((?:\d{2,4}(?:\s*[-–/]\s*\d{2,4})?)(?:\s*(?:,|;|\by\b)\s*\d{2,4}(?:\s*[-–/]\s*\d{2,4})?)*)/g;

function anioCompleto(n: string, anioActual: number): number | null {
  const v = Number(n);
  if (n.length === 4) return v >= 1970 && v <= anioActual ? v : null;
  if (n.length === 2) {
    const yy = anioActual % 100;
    const anio = v <= yy ? 2000 + v : 1900 + v;
    return anio >= 1970 ? anio : null;
  }
  return null; // 3 dígitos: probablemente número de pregunta
}

/** Devuelve los años MIR referenciados (con repeticiones, en orden de aparición). */
export function detectarRefsMir(texto: string, anioActual = new Date().getFullYear()): number[] {
  const out: number[] = [];
  for (const m of texto.matchAll(BLOQUE)) {
    for (const parte of m[1].split(/\s*(?:,|;|\by\b)\s*/)) {
      const rango = parte.split(/\s*[-–/]\s*/);
      if (rango.length === 2) {
        const a = anioCompleto(rango[0], anioActual);
        const b = anioCompleto(rango[1], anioActual);
        // "18-19" es una convocatoria (años consecutivos): el examen es el segundo año.
        if (a && b && b - a === 1) out.push(b);
        else {
          if (a) out.push(a);
          if (b) out.push(b);
        }
      } else {
        const a = anioCompleto(rango[0], anioActual);
        if (a) out.push(a);
      }
    }
  }
  return out;
}

/** Peso de una referencia: 1 para las antiguas, hasta 1,5 para las del año en curso. */
export function pesoAnio(anio: number, anioActual = new Date().getFullYear()): number {
  const antiguedad = Math.max(0, anioActual - anio);
  return 1 + 0.5 * Math.max(0, 1 - antiguedad / 10);
}

export function prioridad(refs: number[], anioActual = new Date().getFullYear()): number {
  const p = refs.reduce((s, a) => s + pesoAnio(a, anioActual), 0);
  return Math.round(p * 100) / 100;
}

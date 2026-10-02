// Normalización y similitud de textos (asociación capítulo ↔ tema, conceptos).
const VACIAS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en", "a", "al", "por", "para",
  "con", "sin", "su", "sus", "un", "una", "unos", "unas", "tema", "capitulo", "cap",
]);

export function normalizar(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function palabras(s: string): string[] {
  return normalizar(s)
    .replace(/^\d+\s*/, "")
    .split(" ")
    .filter((p) => p.length > 1 && !VACIAS.has(p) && !/^\d+$/.test(p));
}

/** Similitud de Dice sobre palabras significativas (0..1). */
export function similitud(a: string, b: string): number {
  const A = new Set(palabras(a));
  const B = new Set(palabras(b));
  if (A.size === 0 || B.size === 0) return 0;
  let comunes = 0;
  for (const p of A) if (B.has(p)) comunes++;
  return (2 * comunes) / (A.size + B.size);
}

export function mejorCoincidencia<T extends { nombre: string }>(
  titulo: string,
  candidatos: T[],
): { item: T; puntuacion: number } | null {
  let mejor: { item: T; puntuacion: number } | null = null;
  for (const c of candidatos) {
    const p = similitud(titulo, c.nombre);
    if (!mejor || p > mejor.puntuacion) mejor = { item: c, puntuacion: p };
  }
  return mejor;
}

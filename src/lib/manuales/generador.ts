// Generación de tarjetas con IA a partir de los fragmentos de un capítulo.
// El generador concreto (API de Anthropic o simulado) se inyecta: la validación es común.
import { z } from "zod";
import type { Fragmento } from "./fragmentos";
import { localizarCita, contextoCita } from "./fragmentos";
import { detectarRefsMir, prioridad } from "@/lib/mir";
import { palabras } from "@/lib/texto";

export const PropuestaSchema = z.object({
  tarjetas: z.array(z.object({
    fragmento_id: z.number().int(),
    concepto: z.string(),
    pregunta: z.string(),
    respuesta: z.string(),
    cita: z.string(),
  })),
});
export type Propuesta = z.infer<typeof PropuestaSchema>["tarjetas"][number];

export type EntradaGenerador = { asignatura: string; tema: string; capitulo: string; fragmentos: Fragmento[] };
export type SalidaGenerador = { tarjetas: Propuesta[]; tokensEntrada: number; tokensSalida: number };
export type Generador = (e: EntradaGenerador) => Promise<SalidaGenerador>;

export const VERSION_PROMPT = 3;

export const PROMPT_SISTEMA = `Eres un profesor que prepara tarjetas de repaso (flashcards) para opositores al examen MIR en España.
Recibirás fragmentos numerados de un capítulo de un manual. Crea tarjetas SOLO con lo que dicen esos fragmentos.

Reglas de calidad (obligatorias):
1. Un concepto por tarjeta: una única idea evaluable (un dato, un criterio, una asociación, un tratamiento de elección…). Si una frase contiene varias ideas importantes, haz varias tarjetas.
2. Respuesta concisa: idealmente una palabra o una frase corta (máximo ~20 palabras). Nada de párrafos ni listas largas; si una lista es necesaria, máximo 4 elementos breves.
3. Sin redundancias: no repitas la misma idea en dos tarjetas, ni preguntando al revés.
4. Contexto suficiente: la pregunta debe entenderse sola, sin ver el manual (nombra la enfermedad, el fármaco o la situación clínica). Nunca uses "según el texto", "el fragmento" ni "lo anterior".
5. Basada solo en el fragmento: no añadas nada que no esté escrito en él (ni datos, ni matices, ni conocimientos propios), aunque sepas que es cierto. Si el fragmento es ambiguo, está mal extraído (tablas rotas, texto desordenado) o no tiene datos útiles, no hagas tarjetas de él.
6. Prioriza lo que más cae en el MIR: los datos marcados con referencias como "(MIR 21)" o "(MIR 19, 21)" deben tener tarjeta casi siempre. Después, datos de elección, más frecuentes, diagnósticos de certeza, criterios y cifras clave. Omite generalidades, historia, epidemiología poco relevante y detalles no preguntables.
7. "cita": copia LITERALMENTE (carácter a carácter) la frase o trozo del fragmento que justifica la respuesta, de 15 a 300 caracteres. Debe poder encontrarse tal cual dentro del fragmento indicado en "fragmento_id".
8. "concepto": nombre corto (2-6 palabras) del concepto que evalúa la tarjeta, reutilizando el mismo nombre en las tarjetas del mismo concepto (p. ej. "Estenosis aórtica", "Criterios de Light").
9. Escribe en español, con la terminología del manual.

Devuelve únicamente el JSON pedido. Si ningún fragmento merece tarjetas, devuelve {"tarjetas": []}.`;

export function mensajeUsuario(e: EntradaGenerador): string {
  const frags = e.fragmentos.map((f) => `<fragmento id="${f.id}" pagina="${f.pagina}">\n${f.texto}\n</fragmento>`).join("\n\n");
  return `Asignatura: ${e.asignatura}\nTema: ${e.tema}\nCapítulo del manual: ${e.capitulo}\n\n${frags}`;
}

/** Agrupa fragmentos en lotes de tamaño razonable para una petición. */
export function lotes(fragmentos: Fragmento[], maxChars = 14000): Fragmento[][] {
  const out: Fragmento[][] = [];
  let actual: Fragmento[] = [];
  let n = 0;
  for (const f of fragmentos) {
    if (n + f.texto.length > maxChars && actual.length) { out.push(actual); actual = []; n = 0; }
    actual.push(f);
    n += f.texto.length;
  }
  if (actual.length) out.push(actual);
  return out;
}

export type TarjetaValida = {
  concepto: string; pregunta: string; respuesta: string; fragmento: string; pagina: number; refsMir: number[]; prioridad: number;
};
export type Rechazo = { propuesta: Propuesta; motivo: string };

function parecida(a: string, b: string) {
  const A = new Set(palabras(a)), B = new Set(palabras(b));
  if (!A.size || !B.size) return false;
  let c = 0;
  for (const p of A) if (B.has(p)) c++;
  return c / Math.min(A.size, B.size) >= 0.85 && Math.abs(A.size - B.size) <= 2;
}

/**
 * Validación determinista de las propuestas de la IA:
 * - la cita debe existir literalmente en el fragmento indicado (garantía de fuente);
 * - pregunta y respuesta no vacías y respuesta concisa;
 * - sin duplicados (entre sí ni con las preguntas existentes del tema).
 */
export function validar(propuestas: Propuesta[], fragmentos: Fragmento[], existentes: string[] = [], anio = new Date().getFullYear()) {
  const validas: TarjetaValida[] = [];
  const rechazos: Rechazo[] = [];
  const preguntas = [...existentes];
  for (const p of propuestas) {
    const frag = fragmentos.find((f) => f.id === p.fragmento_id)
      ?? fragmentos.find((f) => localizarCita(f.texto, p.cita)); // id equivocado pero cita real
    const pregunta = p.pregunta.trim(), respuesta = p.respuesta.trim(), concepto = p.concepto.trim();
    if (!frag) { rechazos.push({ propuesta: p, motivo: "fragmento inexistente" }); continue; }
    const literal = localizarCita(frag.texto, p.cita);
    if (!literal) { rechazos.push({ propuesta: p, motivo: "la cita no aparece literalmente en el fragmento" }); continue; }
    if (pregunta.length < 10 || !respuesta) { rechazos.push({ propuesta: p, motivo: "pregunta o respuesta vacía" }); continue; }
    if (respuesta.split(/\s+/).length > 40) { rechazos.push({ propuesta: p, motivo: "respuesta demasiado larga" }); continue; }
    if (/seg[uú]n (el|este) (texto|fragmento)|el fragmento/i.test(pregunta)) { rechazos.push({ propuesta: p, motivo: "pregunta sin contexto propio" }); continue; }
    if (preguntas.some((q) => parecida(q, pregunta))) { rechazos.push({ propuesta: p, motivo: "duplicada" }); continue; }
    preguntas.push(pregunta);
    const refs = detectarRefsMir(contextoCita(frag.texto, literal), anio);
    validas.push({ concepto: concepto || "General", pregunta, respuesta, fragmento: literal, pagina: frag.pagina, refsMir: refs, prioridad: prioridad(refs, anio) });
  }
  return { validas, rechazos };
}

/** Generador simulado (sin IA): permite probar todo el flujo sin clave ni coste. */
export const generadorSimulado: Generador = async (e) => {
  const tarjetas: Propuesta[] = [];
  for (const f of e.fragmentos) {
    const frase = f.texto.split(/(?<=\.)\s+/).find((s) => /\(MIR/.test(s)) ?? f.texto.split(/(?<=\.)\s+/)[0];
    if (!frase || frase.length < 20) continue;
    const cita = frase.slice(0, 280);
    tarjetas.push({
      fragmento_id: f.id, concepto: e.tema,
      pregunta: `${e.tema}: completa la afirmación del manual (pág. ${f.pagina}): «${cita.split(" ").slice(0, 6).join(" ")}…»`,
      respuesta: cita.split(" ").slice(6, 20).join(" ") || cita, cita,
    });
  }
  return { tarjetas, tokensEntrada: 0, tokensSalida: 0 };
};

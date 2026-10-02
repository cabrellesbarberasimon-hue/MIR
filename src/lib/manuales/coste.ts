// Estimación de coste de la generación con IA (aproximada).
// Precios de Claude Opus 5.5 (USD por millón de tokens) a fecha 2026-09.
export const MODELO = "claude-opus-5-5";
export const PRECIO_ENTRADA_USD_M = 4;
export const PRECIO_SALIDA_USD_M = 20;
export const EUR_POR_USD = 0.86; // aproximado; ajustar si cambia mucho
export const LIMITE_EUR = 20;

/** ~3,5 caracteres por token en español médico. */
export const CHARS_POR_TOKEN = 3.5;
/** Tokens de salida (tarjetas JSON + razonamiento) por token de entrada, estimado. */
export const RATIO_SALIDA = 0.45;
/** Tokens fijos por petición (prompt de sistema + instrucciones). */
export const TOKENS_FIJOS_PETICION = 900;

export function estimarCoste(chars: number, peticiones: number) {
  const entrada = chars / CHARS_POR_TOKEN + peticiones * TOKENS_FIJOS_PETICION;
  const salida = (chars / CHARS_POR_TOKEN) * RATIO_SALIDA;
  const usd = (entrada * PRECIO_ENTRADA_USD_M + salida * PRECIO_SALIDA_USD_M) / 1e6;
  return { tokensEntrada: Math.round(entrada), tokensSalida: Math.round(salida), usd, eur: usd * EUR_POR_USD };
}

export function costeReal(tokensEntrada: number, tokensSalida: number) {
  const usd = (tokensEntrada * PRECIO_ENTRADA_USD_M + tokensSalida * PRECIO_SALIDA_USD_M) / 1e6;
  return { usd, eur: usd * EUR_POR_USD };
}

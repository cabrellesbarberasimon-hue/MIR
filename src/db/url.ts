// Neon añade a sus cadenas de conexión parámetros (p. ej. channel_binding=require) que el driver
// `postgres` enviaría al servidor como parámetros de configuración, y el servidor los rechaza.
const NO_SOPORTADOS = ["channel_binding"];

export function limpiarUrlBd(url: string): string {
  try {
    const u = new URL(url);
    for (const p of NO_SOPORTADOS) u.searchParams.delete(p);
    return u.toString();
  } catch {
    return url;
  }
}

// La integración de Neon de Vercel puede crear las variables con prefijo (p. ej. MIR_DATABASE_URL).
export function urlBd(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.DATABASE_URL || env.MIR_DATABASE_URL;
}

/** Para migraciones: conexión directa (sin pooler) si existe. */
export function urlBdDirecta(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.DATABASE_URL_UNPOOLED || env.MIR_DATABASE_URL_UNPOOLED || urlBd(env);
}

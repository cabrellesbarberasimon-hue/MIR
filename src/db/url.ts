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

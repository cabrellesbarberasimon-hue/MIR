// Sesión de un único usuario: cookie "exp.firma" firmada con HMAC-SHA256 (Web Crypto,
// funciona igual en el proxy y en el servidor).
export const COOKIE = "mir_sesion";
export const DURACION_S = 60 * 60 * 24 * 90; // 90 días

const enc = new TextEncoder();

async function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 16) throw new Error("SESSION_SECRET no definido o demasiado corto");
  return crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function firmar(datos: string) {
  return hex(await crypto.subtle.sign("HMAC", await clave(), enc.encode(datos)));
}

function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function crearToken(ahoraMs = Date.now()) {
  const exp = String(Math.floor(ahoraMs / 1000) + DURACION_S);
  return `${exp}.${await firmar(exp)}`;
}

export async function tokenValido(token: string | undefined, ahoraMs = Date.now()) {
  if (!token) return false;
  const [exp, firma] = token.split(".");
  if (!exp || !firma || Number(exp) * 1000 < ahoraMs) return false;
  return igual(firma, await firmar(exp));
}

export async function contrasenaCorrecta(intento: string) {
  const real = process.env.APP_PASSWORD;
  if (!real) return false;
  // Comparar firmas evita filtrar la longitud de la contraseña.
  return igual(await firmar(`pw:${intento}`), await firmar(`pw:${real}`));
}

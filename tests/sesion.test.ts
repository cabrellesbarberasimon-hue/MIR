import { it, expect, beforeAll } from "vitest";
import { crearToken, tokenValido, contrasenaCorrecta, DURACION_S } from "@/lib/sesion";

beforeAll(() => {
  process.env.SESSION_SECRET = "secreto-de-prueba-suficientemente-largo";
  process.env.APP_PASSWORD = "clave";
});

it("token firmado válido, caducado o manipulado", async () => {
  const t = await crearToken(0);
  expect(await tokenValido(t, 1000)).toBe(true);
  expect(await tokenValido(t, (DURACION_S + 1) * 1000)).toBe(false);
  expect(await tokenValido(t.replace(/.$/, (c) => (c === "a" ? "b" : "a")), 1000)).toBe(false);
  expect(await tokenValido("999999999999.abc", 1000)).toBe(false);
  expect(await tokenValido(undefined)).toBe(false);
});

it("contraseña", async () => {
  expect(await contrasenaCorrecta("clave")).toBe(true);
  expect(await contrasenaCorrecta("otra")).toBe(false);
});

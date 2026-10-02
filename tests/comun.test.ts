import { it, expect } from "vitest";
import { homedir } from "node:os";
import path from "node:path";
import { esExamen, resolverDir } from "../scripts/comun";

it("distingue exámenes de manuales", () => {
  expect(esExamen("Exámenes/MIR 2023.pdf")).toBe(true);
  expect(esExamen("Simulacro 3 - respuestas.pdf")).toBe(true);
  expect(esExamen("Cardiología.pdf")).toBe(false);
  expect(esExamen("03 - Neumología (AMIR).pdf")).toBe(false);
  expect(esExamen("Testículo y urología.pdf")).toBe(false);
});

it("resuelve rutas con comillas y ~", () => {
  // path.resolve() es específico del sistema operativo: comparamos contra su propio resultado
  // en vez de una ruta POSIX fija para que el test valga igual en Windows, macOS y Linux.
  expect(resolverDir("'carpeta a b'")).toBe(path.resolve("carpeta a b"));
  expect(resolverDir('"carpeta x"')).toBe(path.resolve("carpeta x"));
  expect(resolverDir("~/carpeta")).toBe(path.resolve(homedir(), "carpeta"));
});

import { it, expect } from "vitest";
import { esExamen, resolverDir } from "../scripts/comun";

it("distingue exámenes de manuales", () => {
  expect(esExamen("Exámenes/MIR 2023.pdf")).toBe(true);
  expect(esExamen("Simulacro 3 - respuestas.pdf")).toBe(true);
  expect(esExamen("Cardiología.pdf")).toBe(false);
  expect(esExamen("03 - Neumología (AMIR).pdf")).toBe(false);
  expect(esExamen("Testículo y urología.pdf")).toBe(false);
});

it("resuelve rutas con comillas y ~", () => {
  expect(resolverDir("'/tmp/a b'")).toBe("/tmp/a b");
  expect(resolverDir('"/tmp/x"')).toBe("/tmp/x");
});

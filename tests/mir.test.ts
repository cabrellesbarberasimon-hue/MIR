import { describe, it, expect } from "vitest";
import { detectarRefsMir, prioridad, pesoAnio } from "@/lib/mir";

describe("detectarRefsMir", () => {
  const A = 2026;
  it("formatos básicos", () => {
    expect(detectarRefsMir("La causa más frecuente (MIR 2021).", A)).toEqual([2021]);
    expect(detectarRefsMir("dato (MIR 21)", A)).toEqual([2021]);
    expect(detectarRefsMir("dato (MIR 19, 21)", A)).toEqual([2019, 2021]);
    expect(detectarRefsMir("dato (MIR 19 y 21)", A)).toEqual([2019, 2021]);
    expect(detectarRefsMir("dato (MIR 98)", A)).toEqual([1998]);
  });
  it("convocatorias y varias apariciones", () => {
    expect(detectarRefsMir("(MIR 18-19)", A)).toEqual([2019]);
    expect(detectarRefsMir("(MIR 2019-2020)", A)).toEqual([2020]);
    expect(detectarRefsMir("x (MIR 15) y z (MIR 21; MIR 22)", A)).toEqual([2015, 2021, 2022]);
  });
  it("ignora años futuros, texto sin MIR y números de 3 cifras", () => {
    expect(detectarRefsMir("(MIR 2030)", A)).toEqual([]);
    expect(detectarRefsMir("en 2021 se publicó", A)).toEqual([]);
    expect(detectarRefsMir("(MIR 123)", A)).toEqual([]);
    expect(detectarRefsMir("ADMIRABLE 21", A)).toEqual([]);
  });
});

describe("prioridad", () => {
  it("las recientes pesan más", () => {
    expect(pesoAnio(2026, 2026)).toBe(1.5);
    expect(pesoAnio(2010, 2026)).toBe(1);
    expect(pesoAnio(2021, 2026)).toBeCloseTo(1.25);
    expect(prioridad([2021, 2010], 2026)).toBe(2.25);
    expect(prioridad([], 2026)).toBe(0);
  });
});

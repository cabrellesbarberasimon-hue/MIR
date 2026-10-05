import { it, expect } from "vitest";
import { limpiarUrlBd, urlBd, urlBdDirecta } from "@/db/url";

it("quita channel_binding y conserva sslmode", () => {
  const u = limpiarUrlBd("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
  expect(u).toBe("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require");
  expect(limpiarUrlBd("postgres://a@b/c")).toBe("postgres://a@b/c");
});

it("acepta las variables con prefijo de la integración de Neon", () => {
  expect(urlBd({ DATABASE_URL: "a", MIR_DATABASE_URL: "b" })).toBe("a");
  expect(urlBd({ MIR_DATABASE_URL: "b" })).toBe("b");
  expect(urlBdDirecta({ MIR_DATABASE_URL: "b", MIR_DATABASE_URL_UNPOOLED: "c" })).toBe("c");
  expect(urlBdDirecta({ DATABASE_URL: "a" })).toBe("a");
  expect(urlBd({})).toBeUndefined();
});

import { it, expect } from "vitest";
import { limpiarUrlBd } from "@/db/url";

it("quita channel_binding y conserva sslmode", () => {
  const u = limpiarUrlBd("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
  expect(u).toBe("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require");
  expect(limpiarUrlBd("postgres://a@b/c")).toBe("postgres://a@b/c");
});

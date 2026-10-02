// Utilidades compartidas por los scripts locales.
import "dotenv/config";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

/** Carpeta de manuales (SOLO LECTURA: los scripts nunca escriben en ella). */
export function dirManuales(): string {
  const d = process.env.MANUALES_DIR || "~/Desktop/manuales";
  return path.resolve(d.replace(/^~(?=$|\/|\\)/, homedir()));
}

export const EXTENSIONES = new Set([".pdf"]);

/** Lista recursiva de archivos (rutas relativas a la carpeta de manuales). */
export async function listarArchivos(dir = dirManuales()): Promise<{ relativa: string; absoluta: string; bytes: number }[]> {
  const out: { relativa: string; absoluta: string; bytes: number }[] = [];
  const recorrer = async (d: string) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const abs = path.join(d, e.name);
      if (e.isDirectory()) await recorrer(abs);
      else out.push({ relativa: path.relative(dir, abs), absoluta: abs, bytes: (await stat(abs)).size });
    }
  };
  await recorrer(dir);
  return out.sort((a, b) => a.relativa.localeCompare(b.relativa, "es"));
}

export function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  if (i < 0) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "true";
}

export const privado = path.resolve("privado"); // carpeta local ignorada por git

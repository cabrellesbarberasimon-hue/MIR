// Utilidades compartidas por los scripts locales.
import "dotenv/config";
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

/** Carpeta de manuales (SOLO LECTURA: los scripts nunca escriben en ella). */
// Admite rutas de Windows con espacios (p. ej. C:\Users\Simo\OneDrive - BoCubi\Escritorio\MANUALES),
// con o sin comillas, y "~" para la carpeta personal.
export function resolverDir(valor: string | undefined): string {
  const d = (valor || "~/Desktop/manuales").trim().replace(/^["']|["']$/g, "");
  return path.resolve(d.replace(/^~(?=$|\/|\\)/, homedir()));
}

export function dirManuales(): string {
  const dir = resolverDir(process.env.MANUALES_DIR);
  if (!existsSync(dir)) {
    console.error(`No encuentro la carpeta de manuales: ${dir}\nRevisa MANUALES_DIR en .env (ver README).`);
    process.exit(1);
  }
  return dir;
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
      // Ruta relativa con "/" en todos los sistemas: identifica al manual en la base de datos.
      else out.push({ relativa: path.relative(dir, abs).split(path.sep).join("/"), absoluta: abs, bytes: (await stat(abs)).size });
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

// Lectura de PDFs (solo en los scripts locales). Texto por página + índice (marcadores).
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getDocumentProxy, extractText } from "unpdf";

export type EntradaIndice = { titulo: string; pagina: number; nivel: number };
export type PdfLeido = { paginas: string[]; indice: EntradaIndice[]; hash: string };

export async function hashArchivo(ruta: string) {
  return createHash("sha256").update(await readFile(ruta)).digest("hex");
}

export async function leerPdf(ruta: string): Promise<PdfLeido> {
  const datos = await readFile(ruta);
  const hash = createHash("sha256").update(datos).digest("hex");
  const pdf = await getDocumentProxy(new Uint8Array(datos));
  const { text } = await extractText(pdf, { mergePages: false });
  const indice: EntradaIndice[] = [];
  try {
    const raiz = (await pdf.getOutline()) ?? [];
    const recorrer = async (items: typeof raiz, nivel: number) => {
      for (const it of items) {
        let pagina = -1;
        try {
          const dest = typeof it.dest === "string" ? await pdf.getDestination(it.dest) : it.dest;
          if (dest && dest[0]) pagina = (await pdf.getPageIndex(dest[0] as never)) + 1;
        } catch { /* destino roto: se ignora */ }
        if (pagina > 0 && it.title?.trim()) indice.push({ titulo: it.title.trim(), pagina, nivel });
        if (it.items?.length && nivel < 2) await recorrer(it.items, nivel + 1);
      }
    };
    await recorrer(raiz, 0);
  } catch { /* sin índice */ }
  await pdf.cleanup?.();
  return { paginas: text.map((t) => t ?? ""), indice, hash };
}

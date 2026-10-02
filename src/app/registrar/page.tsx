import { listarTemario } from "@/lib/datos/temario";
import { ultimosBloques } from "@/lib/datos/registro";
import { FormRegistro } from "./form-registro";
import { pct } from "@/lib/etiquetas";
import { BorrarBloque } from "./borrar-bloque";

export const dynamic = "force-dynamic";

export default async function Registrar({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const sp = await searchParams;
  const [temario, bloques] = await Promise.all([listarTemario(), ultimosBloques(10)]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Registrar</h1>
      <FormRegistro temario={temario} temaInicial={Number(sp.tema) || undefined} />
      {bloques.length > 0 && (
        <section className="caja">
          <h2 className="titulo mb-2">Últimos bloques</h2>
          <ul className="divide-y divide-borde">
            {bloques.map((b) => (
              <li key={b.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{b.tema ?? "—"} <span className="sub">· {b.fecha}</span></span>
                <span>{b.aciertos}/{b.total} <span className="sub">({pct(b.aciertos, b.total)}%)</span></span>
                <BorrarBloque id={b.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

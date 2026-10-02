import Link from "next/link";
import { planDiezMinutos } from "@/lib/datos/diez-minutos";
import { textoMotivo } from "@/lib/etiquetas";
import { MiniEsquema } from "@/components/mini-esquema";

export const dynamic = "force-dynamic";

export default async function DiezMinutos() {
  const p = await planDiezMinutos();
  const nada = !p.tarjetas && !p.esquema && !p.erroresConNota.length && !p.repasos.length;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Tengo 10 minutos</h1>
      {nada && <p className="caja">No hay nada pendiente. Registra preguntas o marca temas como realizados para que aparezcan repasos.</p>}

      {p.tarjetas > 0 && (
        <Link href="/tarjetas?modo=10" className="btn-primario min-h-14 w-full text-lg">1 · {p.tarjetas} tarjetas (~5 min)</Link>
      )}

      {p.esquema && (
        <section className="flex flex-col gap-2">
          <h2 className="titulo">{p.tarjetas ? "2" : "1"} · Tu concepto más débil</h2>
          <MiniEsquema esquema={p.esquema} />
        </section>
      )}

      {p.erroresConNota.length > 0 && (
        <section className="caja">
          <h2 className="titulo mb-2">Errores recientes</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {p.erroresConNota.map((e) => (
              <li key={e.id}>• <b>{e.concepto ?? e.tema}</b> <span className="sub">· {textoMotivo(e.motivo)}</span>{e.nota && <> — {e.nota}</>}</li>
            ))}
          </ul>
        </section>
      )}

      {p.repasos.length > 0 && (
        <section className="caja">
          <h2 className="titulo mb-2">Repasos pendientes</h2>
          <ul className="text-sm">{p.repasos.map((r) => <li key={r.temaId}>• {r.tema} <span className="sub">({r.asignatura})</span></li>)}</ul>
          <Link href="/repasos" className="sub underline">Ver todos</Link>
        </section>
      )}
    </div>
  );
}

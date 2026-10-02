import Link from "next/link";
import { buscar } from "@/lib/datos/buscar";

export const dynamic = "force-dynamic";

export default async function Buscar({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 100);
  const r = await buscar(q);
  const vacio = q.length >= 2 && !r.temas.length && !r.conceptos.length && !r.errores.length && !r.tarjetas.length;
  return (
    <div className="flex flex-col gap-4">
      <form className="flex gap-2">
        <input name="q" defaultValue={q} autoFocus placeholder="Buscar temas, conceptos, errores, tarjetas" className="campo" />
        <button className="btn-primario">Buscar</button>
      </form>
      {vacio && <p className="sub">Sin resultados.</p>}
      {r.temas.length > 0 && (
        <section className="caja"><h2 className="titulo mb-1">Temas</h2>
          <ul className="text-sm">{r.temas.map((t) => <li key={t.id} className="py-1"><Link className="underline" href={`/temario/${t.id}`}>{t.nombre}</Link> <span className="sub">· {t.asignatura}</span></li>)}</ul>
        </section>
      )}
      {r.conceptos.length > 0 && (
        <section className="caja"><h2 className="titulo mb-1">Conceptos</h2>
          <ul className="text-sm">{r.conceptos.map((c) => <li key={c.id} className="py-1"><Link className="underline" href={`/conceptos/${c.id}`}>{c.nombre}</Link> <span className="sub">· {c.tema}</span></li>)}</ul>
        </section>
      )}
      {r.tarjetas.length > 0 && (
        <section className="caja"><h2 className="titulo mb-1">Tarjetas</h2>
          <ul className="divide-y divide-borde text-sm">{r.tarjetas.map((t) => <li key={t.id} className="py-2"><p className="font-medium">{t.pregunta}</p><p>{t.respuesta}</p><Link href={`/temario/${t.temaId}`} className="sub underline">{t.tema}</Link></li>)}</ul>
        </section>
      )}
      {r.errores.length > 0 && (
        <section className="caja"><h2 className="titulo mb-1">Notas de errores</h2>
          <ul className="divide-y divide-borde text-sm">{r.errores.map((e) => <li key={e.id} className="py-2">{e.concepto && <b>{e.concepto}: </b>}{e.nota} <Link href={`/temario/${e.temaId}`} className="sub underline">{e.tema}</Link></li>)}</ul>
        </section>
      )}
    </div>
  );
}

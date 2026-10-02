import Link from "next/link";
import { rendimientoPorAsignatura, progresoTemario, erroresPorMotivo, conceptosDebiles, temasDebiles, estadisticasTarjetas } from "@/lib/datos/analisis";
import { hoy, sumarDias, formatoLargo } from "@/lib/fechas";
import { minutosDesde } from "@/lib/datos/estudio";
import { pct, textoMotivo } from "@/lib/etiquetas";

export const dynamic = "force-dynamic";

function Barra({ valor, max = 100 }: { valor: number; max?: number }) {
  return <div className="h-2 w-full rounded-full bg-borde"><div className="h-2 rounded-full bg-acento" style={{ width: `${max ? Math.min(100, (100 * valor) / max) : 0}%` }} /></div>;
}

export default async function Progreso() {
  const desde = sumarDias(hoy(), -30);
  const desde7 = sumarDias(hoy(), -6);
  const [rend, prog, motivos, conceptos, temas, tarj, mins] = await Promise.all([
    rendimientoPorAsignatura(), progresoTemario(), erroresPorMotivo(desde), conceptosDebiles(10), temasDebiles(5), estadisticasTarjetas(),
    minutosDesde(desde7),
  ]);
  const semana = Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(desde7, i);
    return { fecha: f, minutos: mins.find((m) => m.fecha === f)?.minutos ?? 0 };
  });
  const maxMin = Math.max(60, ...semana.map((d) => d.minutos));
  const totalMotivos = motivos.reduce((s, m) => s + m.n, 0);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Progreso</h1>

      <section className="caja flex flex-col gap-2">
        <h2 className="titulo">Tiempo de estudio (7 días) · {Math.round(semana.reduce((a, d) => a + d.minutos, 0) / 6) / 10} h</h2>
        <div className="flex h-24 items-end gap-1">
          {semana.map((d) => (
            <div key={d.fecha} className="flex flex-1 flex-col items-center gap-1" title={`${d.minutos} min`}>
              <div className="w-full rounded-t bg-acento" style={{ height: `${(80 * d.minutos) / maxMin}px` }} />
              <span className="text-[10px] text-suave">{formatoLargo(d.fecha).slice(0, 2)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="caja flex flex-col gap-2">
        <h2 className="titulo">Temario</h2>
        {prog.map((p) => (
          <div key={p.asignaturaId} className="text-sm">
            <div className="flex justify-between"><span>{p.asignatura}</span><span className="sub">{p.realizados}/{p.total}</span></div>
            <Barra valor={p.realizados} max={p.total} />
          </div>
        ))}
      </section>

      <section className="caja flex flex-col gap-2">
        <h2 className="titulo">Acierto por asignatura</h2>
        {rend.length === 0 && <p className="sub">Sin preguntas registradas.</p>}
        {rend.map((r) => (
          <div key={r.asignaturaId} className="text-sm">
            <div className="flex justify-between"><span>{r.asignatura}</span><span className="sub">{pct(r.aciertos, r.total)}% · {r.total} preg.</span></div>
            <Barra valor={pct(r.aciertos, r.total)} />
          </div>
        ))}
      </section>

      <section className="caja">
        <h2 className="titulo mb-2">Conceptos débiles</h2>
        {conceptos.length === 0 ? <p className="sub">Aparecen al registrar errores con concepto o fallar tarjetas.</p> : (
          <ul className="divide-y divide-borde text-sm">
            {conceptos.map((c) => (
              <li key={c.conceptoId} className="flex justify-between py-2">
                <Link href={`/conceptos/${c.conceptoId}`} className="underline">{c.concepto}</Link>
                <span className="sub">{c.tema} · {c.errores} err.</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {temas.length > 0 && (
        <section className="caja">
          <h2 className="titulo mb-2">Temas con menos acierto</h2>
          <ul className="text-sm">
            {temas.map((t) => <li key={t.temaId} className="flex justify-between py-1"><Link href={`/temario/${t.temaId}`}>{t.tema}</Link><span className="sub">{pct(t.aciertos, t.total)}%</span></li>)}
          </ul>
        </section>
      )}

      <section className="caja flex flex-col gap-2">
        <h2 className="titulo">Motivos de error (30 días)</h2>
        {motivos.length === 0 && <p className="sub">Sin errores.</p>}
        {motivos.map((m) => (
          <div key={m.motivo ?? "nulo"} className="text-sm">
            <div className="flex justify-between"><span>{textoMotivo(m.motivo)}</span><span className="sub">{m.n}</span></div>
            <Barra valor={m.n} max={totalMotivos} />
          </div>
        ))}
      </section>

      <section className="caja grid grid-cols-3 gap-2 text-center text-sm">
        <div><p className="text-xl font-semibold">{tarj.activas}</p><p className="sub">tarjetas activas</p></div>
        <div><p className="text-xl font-semibold">{tarj.maduras}</p><p className="sub">maduras (≥21 d)</p></div>
        <div><p className="text-xl font-semibold">{tarj.respuestas ? `${pct(tarj.sabia, tarj.respuestas)}%` : "—"}</p><p className="sub">«la sabía» 30 d</p></div>
      </section>

      <a href="/api/exportar" className="sub text-center underline">Exportar todos mis datos (JSON, para analizarlos con IA)</a>
    </div>
  );
}

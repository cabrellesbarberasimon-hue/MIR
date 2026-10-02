import Link from "next/link";
import { textoMotivo } from "@/lib/etiquetas";
import type { miniEsquema } from "@/lib/datos/analisis";

type Esquema = NonNullable<Awaited<ReturnType<typeof miniEsquema>>>;

/** Mini-esquema: lo esencial de un concepto en una pantalla (tarjetas + tus notas de error). */
export function MiniEsquema({ esquema }: { esquema: Esquema }) {
  return (
    <article className="caja flex flex-col gap-2">
      <div>
        <p className="sub">{esquema.asignatura} · {esquema.tema}</p>
        <Link href={`/conceptos/${esquema.id}`} className="text-lg font-semibold">{esquema.nombre}</Link>
      </div>
      {esquema.puntos.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {esquema.puntos.map((p, i) => (
            <li key={i}><span className="text-suave">{p.pregunta}</span> → <b>{p.respuesta}</b>{p.refsMir.length > 0 && <span className="sub"> (MIR {[...new Set(p.refsMir)].join(", ")})</span>}</li>
          ))}
        </ul>
      )}
      {esquema.notas.length > 0 && (
        <div className="rounded-lg bg-mal/10 p-2 text-sm">
          {esquema.notas.map((n, i) => <p key={i}>• {textoMotivo(n.motivo)}{n.nota ? ` — ${n.nota}` : ""} <span className="sub">({n.fecha})</span></p>)}
        </div>
      )}
      {!esquema.puntos.length && !esquema.notas.some((n) => n.nota) && <p className="sub">Sin tarjetas ni notas todavía para este concepto.</p>}
    </article>
  );
}

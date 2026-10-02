import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerTema } from "@/lib/datos/temario";
import { erroresRecientes } from "@/lib/datos/registro";
import { tarjetasDeTema } from "@/lib/datos/tarjetas";
import { getDb } from "@/db";
import { bloquesPreguntas } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { accBorrarTema, accRenombrarTema } from "@/app/acciones";
import { CasillaRealizado } from "../casilla-realizado";
import { pct, textoMotivo } from "@/lib/etiquetas";

export const dynamic = "force-dynamic";

export default async function Tema({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const tema = Number.isInteger(id) ? await obtenerTema(id) : null;
  if (!tema) notFound();
  const [errores, tarjetas, [rend]] = await Promise.all([
    erroresRecientes({ temaId: id, limite: 30 }),
    tarjetasDeTema(id),
    getDb().select({ total: sql<number>`coalesce(sum(${bloquesPreguntas.total}),0)::int`, aciertos: sql<number>`coalesce(sum(${bloquesPreguntas.aciertos}),0)::int` })
      .from(bloquesPreguntas).where(eq(bloquesPreguntas.temaId, id)),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="sub">{tema.asignatura}</p>
        <div className="flex items-center gap-3">
          <CasillaRealizado temaId={tema.id} realizado={tema.realizado} />
          <h1 className="text-xl font-semibold">{tema.nombre}</h1>
        </div>
        {tema.realizadoEn && <p className="sub mt-1">Realizado el {tema.realizadoEn}</p>}
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="caja p-3"><p className="text-xl font-semibold">{rend.total ? `${pct(rend.aciertos, rend.total)}%` : "—"}</p><p className="sub">acierto</p></div>
        <div className="caja p-3"><p className="text-xl font-semibold">{rend.total}</p><p className="sub">preguntas</p></div>
        <div className="caja p-3"><p className="text-xl font-semibold">{tarjetas.length}</p><p className="sub">tarjetas</p></div>
      </div>

      <Link href={`/registrar?tema=${tema.id}`} className="btn-primario">Registrar preguntas o errores</Link>

      <section className="caja">
        <h2 className="titulo mb-2">Errores</h2>
        {errores.length === 0 ? <p className="sub">Sin errores registrados.</p> : (
          <ul className="divide-y divide-borde text-sm">
            {errores.map((e) => (
              <li key={e.id} className="py-2">
                <span className="font-medium">{e.concepto ?? textoMotivo(e.motivo)}</span>
                {e.concepto && <span className="sub"> · {textoMotivo(e.motivo)}</span>}
                <span className="sub"> · {e.fecha}{e.origen === "tarjeta" ? " · tarjeta" : ""}</span>
                {e.nota && <p className="mt-0.5">{e.nota}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {tarjetas.length > 0 && (
        <details className="caja">
          <summary className="titulo cursor-pointer">Tarjetas ({tarjetas.length})</summary>
          <ul className="mt-2 divide-y divide-borde text-sm">
            {tarjetas.map((t) => (
              <li key={t.id} className="py-2"><p className="font-medium">{t.pregunta}</p><p>{t.respuesta}</p></li>
            ))}
          </ul>
        </details>
      )}

      <details className="caja">
        <summary className="sub cursor-pointer">Editar tema</summary>
        <form action={accRenombrarTema} className="mt-3 flex gap-2">
          <input type="hidden" name="id" value={tema.id} />
          <input name="nombre" defaultValue={tema.nombre} className="campo" />
          <button className="btn-sec">Guardar</button>
        </form>
        <form action={accBorrarTema} className="mt-3">
          <input type="hidden" name="id" value={tema.id} />
          <button className="text-sm text-mal underline">Borrar tema (y sus errores, planificación y tarjetas)</button>
        </form>
      </details>
    </div>
  );
}

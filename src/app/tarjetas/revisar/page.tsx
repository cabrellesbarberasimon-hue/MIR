import { tarjetasPorEstado, contarPorEstado } from "@/lib/datos/tarjetas";
import { accEditarTarjeta } from "@/app/acciones";
import { BotonesEstado } from "./botones-estado";

export const dynamic = "force-dynamic";

export default async function Revisar() {
  const [mal, pendientes, cuenta] = await Promise.all([tarjetasPorEstado("mal"), tarjetasPorEstado("pendiente_revision", 50), contarPorEstado()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Revisar tarjetas</h1>
      <p className="sub">{cuenta.activa ?? 0} activas · {cuenta.pendiente_revision ?? 0} pendientes de revisión · {cuenta.mal ?? 0} marcadas como mal · {cuenta.descartada ?? 0} descartadas</p>

      {pendientes.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="titulo">Pendientes de revisión</h2>
            <BotonesEstado ids={pendientes.map((p) => p.id)} soloAceptar etiqueta={`Aceptar las ${pendientes.length}`} />
          </div>
          {pendientes.map((t) => (
            <article key={t.id} className="caja flex flex-col gap-1 text-sm">
              <p className="sub">{t.asignatura} · {t.tema}{t.concepto ? ` · ${t.concepto}` : ""}</p>
              <p className="font-medium">{t.pregunta}</p>
              <p>{t.respuesta}</p>
              <details><summary className="sub cursor-pointer">Fuente · pág. {t.pagina}</summary><blockquote className="sub mt-1 border-l-2 border-borde pl-2">{t.fragmento}</blockquote></details>
              <BotonesEstado ids={[t.id]} />
            </article>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="titulo">Marcadas como «está mal»</h2>
        {mal.length === 0 && <p className="sub">Ninguna.</p>}
        {mal.map((t) => (
          <article key={t.id} className="caja flex flex-col gap-2 text-sm">
            <p className="sub">{t.asignatura} · {t.tema}</p>
            {t.comentarioMal && <p className="text-mal">«{t.comentarioMal}»</p>}
            <blockquote className="sub border-l-2 border-borde pl-2">{t.fragmento} (pág. {t.pagina})</blockquote>
            <form action={accEditarTarjeta} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={t.id} />
              <textarea name="pregunta" defaultValue={t.pregunta} className="campo min-h-16 py-2" />
              <textarea name="respuesta" defaultValue={t.respuesta} className="campo min-h-16 py-2" />
              <button className="btn-sec">Guardar corrección y reactivar</button>
            </form>
            <BotonesEstado ids={[t.id]} soloDescartar />
          </article>
        ))}
      </section>
    </div>
  );
}

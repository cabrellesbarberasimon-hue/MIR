import { listarSecciones } from "@/lib/datos/manuales";
import { listarTemario } from "@/lib/datos/temario";
import { accAsociarSeccion } from "../acciones";

export const dynamic = "force-dynamic";

const ESTADO = { pendiente: "sin tarjetas", generada: "generada", error: "error", omitida: "omitida" } as const;

export default async function Manuales() {
  const [manuales, temario] = await Promise.all([listarSecciones(), listarTemario()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Manuales</h1>
      <p className="sub">Cada capítulo se asoció automáticamente a un tema al cargar los manuales con el script local. Corrige aquí las asociaciones erróneas: sus tarjetas se moverán al tema elegido.</p>
      {manuales.length === 0 && <p className="caja">Aún no se han cargado manuales. Ejecuta <code>npm run cargar-manuales</code> en tu ordenador.</p>}
      {manuales.map((m) => (
        <details key={m.id} className="caja p-0">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 px-4">
            <span className="font-medium">{m.nombre}</span>
            <span className="sub">{m.secciones.length} cap.{m.calidad !== "texto" ? ` · ${m.calidad}` : ""}</span>
          </summary>
          <ul className="divide-y divide-borde border-t border-borde">
            {m.secciones.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                <p className="font-medium">{s.titulo}</p>
                <p className="sub">
                  págs. {s.paginaInicio}–{s.paginaFin} · {s.refs} ref. MIR · {ESTADO[s.estado]}{s.tarjetas ? ` (${s.tarjetas})` : ""}
                  {s.asociacion === "auto" && s.temaId ? ` · auto ${Math.round(s.confianza * 100)}%` : ""}
                </p>
                <form action={accAsociarSeccion} className="flex gap-2">
                  <input type="hidden" name="seccionId" value={s.id} />
                  <select name="temaId" defaultValue={s.temaId ?? ""} className="campo min-h-9 text-sm">
                    <option value="">Sin tema</option>
                    {temario.map((a) => (
                      <optgroup key={a.id} label={a.nombre}>
                        {a.temas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button className="btn-sec min-h-9 px-3 text-sm">Guardar</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

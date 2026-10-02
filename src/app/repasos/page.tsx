import Link from "next/link";
import { repasosPendientes } from "@/lib/datos/repasos";
import { textoMotivo } from "@/lib/etiquetas";
import { BotonHecho } from "./boton-hecho";

export const dynamic = "force-dynamic";

export default async function Repasos() {
  const grupos = await repasosPendientes();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Repasos pendientes</h1>
      <p className="sub">Capa adicional a tu planificación: no la modifica. Al marcar un tema como realizado se programan repasos a 1, 7 y 30 días; cada error se repasa al día siguiente.</p>
      {grupos.length === 0 && <p className="caja text-center">Todo al día ✓</p>}
      {grupos.map((g) => (
        <section key={g.temaId} className="caja flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/temario/${g.temaId}`}>
              <p className="sub">{g.asignatura}</p>
              <p className="font-medium">{g.tema}</p>
            </Link>
            <BotonHecho ids={[...g.repasoTema, ...g.errores.map((e) => e.id)]} />
          </div>
          {g.repasoTema.length > 0 && <p className="sub">Repaso del tema</p>}
          {g.errores.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {g.errores.map((e) => (
                <li key={e.id}>
                  • {e.concepto ? <b>{e.concepto}</b> : textoMotivo(e.motivo)}
                  {e.concepto && e.motivo && <span className="sub"> · {textoMotivo(e.motivo)}</span>}
                  {e.nota && <span> — {e.nota}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

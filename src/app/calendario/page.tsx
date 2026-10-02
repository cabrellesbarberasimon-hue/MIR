import Link from "next/link";
import { cuadriculaMes, formatoLargo, formatoMes, hoy, mesSiguiente } from "@/lib/fechas";
import { planEntre } from "@/lib/datos/plan";
import { listarTemario } from "@/lib/datos/temario";
import { PlanDia } from "@/components/plan-dia";
import { AnadirPlan } from "./anadir-plan";

export const dynamic = "force-dynamic";

export default async function Calendario({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string }> }) {
  const sp = await searchParams;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? sp.dia! : hoy();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : d.slice(0, 7);
  const celdas = cuadriculaMes(mes);
  const [plan, temario] = await Promise.all([planEntre(celdas[0], celdas.at(-1)!), listarTemario()]);
  const hoyStr = hoy();
  const delDia = plan.filter((p) => p.fecha === d);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link className="btn-sec px-3" href={`/calendario?mes=${mesSiguiente(mes, -1)}&dia=${d}`}>‹</Link>
        <h1 className="titulo first-letter:uppercase">{formatoMes(mes)}</h1>
        <Link className="btn-sec px-3" href={`/calendario?mes=${mesSiguiente(mes, 1)}&dia=${d}`}>›</Link>
      </header>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["L", "M", "X", "J", "V", "S", "D"].map((x) => <span key={x} className="sub">{x}</span>)}
        {celdas.map((c) => {
          const items = plan.filter((p) => p.fecha === c);
          const hechos = items.filter((p) => p.completado).length;
          const fuera = c.slice(0, 7) !== mes;
          return (
            <Link key={c} href={`/calendario?mes=${mes}&dia=${c}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border ${c === d ? "border-acento" : "border-transparent"} ${fuera ? "opacity-40" : ""} ${c === hoyStr ? "font-bold text-acento" : ""}`}>
              <span>{Number(c.slice(8))}</span>
              {items.length > 0 && (
                <span className={`mt-0.5 rounded-full px-1.5 text-[10px] ${hechos === items.length ? "bg-acento text-white" : "bg-borde"}`}>{items.length}</span>
              )}
            </Link>
          );
        })}
      </div>

      <section className="caja">
        <h2 className="titulo mb-2 first-letter:uppercase">{formatoLargo(d)}</h2>
        {delDia.length ? <PlanDia entradas={delDia} editable /> : <p className="sub">Sin temas planificados.</p>}
      </section>

      <AnadirPlan fecha={d} temario={temario} />
    </div>
  );
}

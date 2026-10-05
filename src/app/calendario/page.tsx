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
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-6">
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
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border lg:aspect-auto lg:h-24 lg:items-stretch lg:justify-start lg:gap-0.5 lg:overflow-hidden lg:bg-superficie lg:p-1.5 lg:text-left ${c === d ? "border-acento" : "border-transparent lg:border-borde"} ${fuera ? "opacity-40" : ""} ${c === hoyStr ? "font-bold text-acento" : ""}`}>
              <span>{Number(c.slice(8))}</span>
              {items.length > 0 && (
                <span className={`mt-0.5 rounded-full px-1.5 text-[10px] lg:hidden ${hechos === items.length ? "bg-acento text-white" : "bg-borde"}`}>{items.length}</span>
              )}
              {items.slice(0, 3).map((p) => (
                <span key={p.id} className={`hidden truncate text-[11px] font-normal text-texto lg:block ${p.completado ? "text-suave line-through" : ""}`}>{p.tema}</span>
              ))}
              {items.length > 3 && <span className="hidden text-[11px] font-normal text-suave lg:block">+{items.length - 3}</span>}
            </Link>
          );
        })}
      </div>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-8">
      <section className="caja">
        <h2 className="titulo mb-2 first-letter:uppercase">{formatoLargo(d)}</h2>
        {delDia.length ? <PlanDia entradas={delDia} editable /> : <p className="sub">Sin temas planificados.</p>}
      </section>

      <AnadirPlan fecha={d} temario={temario} />
      </div>
    </div>
  );
}

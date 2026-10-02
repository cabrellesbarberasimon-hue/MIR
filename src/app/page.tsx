import Link from "next/link";
import { hoy, formatoLargo, sumarDias } from "@/lib/fechas";
import { planDelDia } from "@/lib/datos/plan";
import { contarRepasosPendientes } from "@/lib/datos/repasos";
import { pendientesHoy } from "@/lib/datos/tarjetas";
import { actividadReciente } from "@/lib/datos/analisis";
import { PlanDia } from "@/components/plan-dia";
import { pct } from "@/lib/etiquetas";

export const dynamic = "force-dynamic";

export default async function Hoy() {
  const dia = hoy();
  const [plan, repasos, tarjetas, actividad] = await Promise.all([
    planDelDia(dia), contarRepasosPendientes(dia), pendientesHoy(), actividadReciente(7),
  ]);
  const pregHoy = actividad.at(-1)!;
  const sem = actividad.reduce((s, d) => ({ t: s.t + d.preguntas, a: s.a + d.aciertos }), { t: 0, a: 0 });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="sub first-letter:uppercase">{formatoLargo(dia)}</p>
        <h1 className="text-2xl font-semibold">Hoy</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tarjetas" className="caja flex flex-col">
          <span className="text-3xl font-semibold">{tarjetas.total}</span>
          <span className="sub">tarjetas{tarjetas.nuevas ? ` · ${tarjetas.nuevas} nuevas` : ""}</span>
        </Link>
        <Link href="/repasos" className="caja flex flex-col">
          <span className="text-3xl font-semibold">{repasos}</span>
          <span className="sub">temas por repasar</span>
        </Link>
      </div>

      <Link href="/diez-minutos" className="btn-primario w-full">Tengo 10 minutos</Link>

      <section className="caja">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="titulo">Plan de hoy</h2>
          <Link href={`/calendario?dia=${dia}`} className="sub underline">Editar</Link>
        </div>
        {plan.length ? <PlanDia entradas={plan} /> : (
          <p className="sub">Nada planificado. <Link className="underline" href={`/calendario?dia=${dia}`}>Planificar</Link></p>
        )}
      </section>

      <section className="caja grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-xl font-semibold">{pregHoy.preguntas}</p>
          <p className="sub">preguntas hoy</p>
        </div>
        <div>
          <p className="text-xl font-semibold">{sem.t ? `${pct(sem.a, sem.t)}%` : "—"}</p>
          <p className="sub">acierto 7 días</p>
        </div>
      </section>

      <Link href={`/registrar`} className="btn-sec w-full">Registrar preguntas o errores</Link>
      <p className="sub text-center">
        <Link className="underline" href={`/calendario?dia=${sumarDias(dia, 1)}`}>Ver mañana</Link>
      </p>
    </div>
  );
}

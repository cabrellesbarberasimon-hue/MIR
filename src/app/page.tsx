import Link from "next/link";
import { hoy, formatoLargo, sumarDias } from "@/lib/fechas";
import { planDelDia } from "@/lib/datos/plan";
import { contarRepasosPendientes } from "@/lib/datos/repasos";
import { pendientesHoy } from "@/lib/datos/tarjetas";
import { actividadReciente } from "@/lib/datos/analisis";
import { PlanDia } from "@/components/plan-dia";
import { pct } from "@/lib/etiquetas";
import { resumenEstudio } from "@/lib/datos/estudio";

export const dynamic = "force-dynamic";

export default async function Hoy() {
  const dia = hoy();
  const [plan, repasos, tarjetas, actividad, est] = await Promise.all([
    planDelDia(dia), contarRepasosPendientes(dia), pendientesHoy(), actividadReciente(7), resumenEstudio(),
  ]);
  const pregHoy = actividad.at(-1)!;
  const sem = actividad.reduce((s, d) => ({ t: s.t + d.preguntas, a: s.a + d.aciertos }), { t: 0, a: 0 });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="sub first-letter:uppercase">{formatoLargo(dia)}</p>
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">Hoy</h1>
          {est.diasExamen != null && est.diasExamen >= 0 && (
            <span className="text-sm font-medium text-acento">{est.diasExamen === 0 ? "¡Hoy es el MIR!" : `Faltan ${est.diasExamen} días para el MIR`}</span>
          )}
        </div>
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

      <div className="grid grid-cols-2 gap-3">
        <Link href="/diez-minutos" className="btn-primario">10 minutos</Link>
        <Link href="/temporizador" className="btn-sec">Temporizador</Link>
      </div>

      <section className="caja">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="titulo">Plan de hoy</h2>
          <Link href={`/calendario?dia=${dia}`} className="sub underline">Editar</Link>
        </div>
        {plan.length ? <PlanDia entradas={plan} /> : (
          <p className="sub">Nada planificado. <Link className="underline" href={`/calendario?dia=${dia}`}>Planificar</Link></p>
        )}
      </section>

      <section className="caja flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-1 text-center">
          <div>
            <p className="text-xl font-semibold">{pregHoy.preguntas}{est.objetivo ? <span className="sub">/{est.objetivo}</span> : null}</p>
            <p className="sub">preguntas</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{sem.t ? `${pct(sem.a, sem.t)}%` : "—"}</p>
            <p className="sub">acierto 7 d</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{est.minutosHoy}</p>
            <p className="sub">min hoy</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{est.racha}{est.racha > 0 ? "🔥" : ""}</p>
            <p className="sub">racha</p>
          </div>
        </div>
        {est.objetivo > 0 && (
          <div className="h-2 w-full rounded-full bg-borde">
            <div className="h-2 rounded-full bg-acento" style={{ width: `${Math.min(100, (100 * pregHoy.preguntas) / est.objetivo)}%` }} />
          </div>
        )}
      </section>

      <Link href={`/registrar`} className="btn-sec w-full">Registrar preguntas o errores</Link>
      <p className="sub text-center">
        <Link className="underline" href={`/calendario?dia=${sumarDias(dia, 1)}`}>Ver mañana</Link>
      </p>
    </div>
  );
}

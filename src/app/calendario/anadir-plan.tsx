"use client";
import { useState, useTransition } from "react";
import { accAnadirPlan } from "@/app/acciones";
import { SelectorTema, type AsignaturaConTemas } from "@/components/selector-tema";
import { TIPO_PLAN_TEXTO } from "@/lib/etiquetas";

export function AnadirPlan({ fecha, temario }: { fecha: string; temario: AsignaturaConTemas[] }) {
  const [abierto, setAbierto] = useState(false);
  const [ids, setIds] = useState<number[]>([]);
  const [tipo, setTipo] = useState<keyof typeof TIPO_PLAN_TEXTO>("estudio");
  const [pendiente, empezar] = useTransition();

  if (!abierto) return <button className="btn-sec w-full" onClick={() => setAbierto(true)}>＋ Añadir temas a este día</button>;
  return (
    <section className="caja flex flex-col gap-3">
      <div className="flex gap-2">
        {(Object.keys(TIPO_PLAN_TEXTO) as (keyof typeof TIPO_PLAN_TEXTO)[]).map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)} className={`chip ${tipo === t ? "chip-on" : ""}`}>{TIPO_PLAN_TEXTO[t]}</button>
        ))}
      </div>
      <SelectorTema temario={temario} valor={ids} onCambio={setIds} multiple />
      <div className="flex gap-2">
        <button className="btn-sec flex-1" onClick={() => { setAbierto(false); setIds([]); }}>Cancelar</button>
        <button className="btn-primario flex-1" disabled={!ids.length || pendiente}
          onClick={() => empezar(async () => { await accAnadirPlan({ fecha, temaIds: ids, tipo }); setIds([]); setAbierto(false); })}>
          Añadir {ids.length || ""}
        </button>
      </div>
    </section>
  );
}

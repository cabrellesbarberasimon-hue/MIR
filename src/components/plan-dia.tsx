"use client";
import Link from "next/link";
import { useTransition } from "react";
import { accCompletarPlan, accMoverPlan, accQuitarPlan } from "@/app/acciones";
import { sumarDias } from "@/lib/fechas";
import { TIPO_PLAN_TEXTO } from "@/lib/etiquetas";

type Entrada = {
  id: number; fecha: string; tipo: "estudio" | "repaso" | "preguntas"; completado: boolean;
  temaId: number; tema: string; asignatura: string;
};

export function PlanDia({ entradas, editable = false }: { entradas: Entrada[]; editable?: boolean }) {
  const [pendiente, empezar] = useTransition();
  return (
    <ul className={`divide-y divide-borde ${pendiente ? "opacity-60" : ""}`}>
      {entradas.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2">
          <button
            aria-label={e.completado ? "Marcar como pendiente" : "Marcar como hecho"}
            onClick={() => empezar(() => accCompletarPlan(e.id, !e.completado))}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${e.completado ? "border-acento bg-acento text-white" : "border-borde"}`}
          >
            {e.completado ? "✓" : ""}
          </button>
          <Link href={`/temario/${e.temaId}`} className={`min-w-0 flex-1 ${e.completado ? "text-suave line-through" : ""}`}>
            <span className="block truncate">{e.tema}</span>
            <span className="sub">{e.asignatura} · {TIPO_PLAN_TEXTO[e.tipo]}</span>
          </Link>
          {editable && (
            <>
              <button aria-label="Pasar al día siguiente" title="Pasar al día siguiente" className="px-2 text-suave"
                onClick={() => empezar(() => accMoverPlan(e.id, sumarDias(e.fecha, 1)))}>→</button>
              <button aria-label="Quitar" className="px-2 text-suave" onClick={() => empezar(() => accQuitarPlan(e.id))}>✕</button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

"use client";
import { useState } from "react";

export type AsignaturaConTemas = { id: number; nombre: string; temas: { id: number; nombre: string; realizado: boolean }[] };

/** Selección de tema en dos pasos (asignatura → tema). Múltiple o simple. */
export function SelectorTema({
  temario, valor, onCambio, multiple = false, asignaturaInicial,
}: {
  temario: AsignaturaConTemas[];
  valor: number[];
  onCambio: (ids: number[]) => void;
  multiple?: boolean;
  asignaturaInicial?: number;
}) {
  const [asig, setAsig] = useState<number | undefined>(
    asignaturaInicial ?? temario.find((a) => a.temas.some((t) => valor.includes(t.id)))?.id,
  );
  const temas = temario.find((a) => a.id === asig)?.temas ?? [];
  if (!temario.length) return <p className="sub">Primero crea asignaturas y temas en Más → Temario.</p>;
  return (
    <div className="flex flex-col gap-2">
      <select className="campo" value={asig ?? ""} onChange={(e) => setAsig(Number(e.target.value) || undefined)}>
        <option value="">Asignatura…</option>
        {temario.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
      </select>
      {asig && (
        <div className="flex max-h-72 flex-col overflow-y-auto rounded-lg border border-borde">
          {temas.length === 0 && <p className="sub p-3">Sin temas.</p>}
          {temas.map((t) => {
            const on = valor.includes(t.id);
            return (
              <button type="button" key={t.id}
                onClick={() => onCambio(multiple ? (on ? valor.filter((x) => x !== t.id) : [...valor, t.id]) : [t.id])}
                className={`flex min-h-11 items-center gap-2 border-b border-borde px-3 text-left last:border-0 ${on ? "bg-acento/10 font-medium" : ""}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${on ? "border-acento bg-acento text-white" : "border-borde"}`}>{on ? "✓" : ""}</span>
                <span className="flex-1">{t.nombre}</span>
                {t.realizado && <span className="sub">hecho</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";
import { useOptimistic, useTransition } from "react";
import { accRealizado } from "@/app/acciones";

export function CasillaRealizado({ temaId, realizado }: { temaId: number; realizado: boolean }) {
  const [valor, setValor] = useOptimistic(realizado);
  const [, empezar] = useTransition();
  return (
    <button aria-label={valor ? "Desmarcar realizado" : "Marcar realizado"}
      onClick={() => empezar(async () => { setValor(!valor); await accRealizado(temaId, !valor); })}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${valor ? "border-acento bg-acento text-white" : "border-borde"}`}>
      {valor ? "✓" : ""}
    </button>
  );
}

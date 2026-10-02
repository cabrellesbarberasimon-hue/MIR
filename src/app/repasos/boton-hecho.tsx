"use client";
import { useTransition } from "react";
import { accRepasosHechos } from "@/app/acciones";

export function BotonHecho({ ids }: { ids: number[] }) {
  const [pendiente, empezar] = useTransition();
  return (
    <button className="btn-sec shrink-0 px-3" disabled={pendiente} onClick={() => empezar(() => accRepasosHechos(ids))}>
      ✓ Hecho
    </button>
  );
}

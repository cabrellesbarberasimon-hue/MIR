"use client";
import { useTransition } from "react";
import { accEstadoTarjetas } from "@/app/acciones";

export function BotonesEstado({ ids, soloAceptar, soloDescartar, etiqueta }: { ids: number[]; soloAceptar?: boolean; soloDescartar?: boolean; etiqueta?: string }) {
  const [p, empezar] = useTransition();
  return (
    <div className="flex gap-2">
      {!soloAceptar && <button disabled={p} className="btn-sec flex-1 text-mal" onClick={() => empezar(() => accEstadoTarjetas(ids, "descartada"))}>Descartar</button>}
      {!soloDescartar && <button disabled={p} className="btn-primario flex-1" onClick={() => empezar(() => accEstadoTarjetas(ids, "activa"))}>{etiqueta ?? "Aceptar"}</button>}
    </div>
  );
}

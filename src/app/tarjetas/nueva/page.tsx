import { listarTemario } from "@/lib/datos/temario";
import { FormTarjeta } from "./form-tarjeta";

export const dynamic = "force-dynamic";

export default async function NuevaTarjeta({ searchParams }: { searchParams: Promise<{ tema?: string; concepto?: string; respuesta?: string }> }) {
  const sp = await searchParams;
  const temario = await listarTemario();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nueva tarjeta</h1>
      <p className="sub">Tus propias tarjetas entran en la sesión diaria como nuevas (cuando el tema esté realizado o planificado) y se repasan con FSRS.</p>
      <FormTarjeta temario={temario} temaInicial={Number(sp.tema) || undefined} concepto={sp.concepto?.slice(0, 200)} respuesta={sp.respuesta?.slice(0, 1000)} />
    </div>
  );
}

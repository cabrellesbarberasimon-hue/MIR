import { listarTemario } from "@/lib/datos/temario";
import { resumenEstudio } from "@/lib/datos/estudio";
import { Temporizador } from "./temporizador";

export const dynamic = "force-dynamic";

export default async function PaginaTemporizador({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const [temario, r] = await Promise.all([listarTemario(), resumenEstudio()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Temporizador</h1>
      <Temporizador temario={temario} temaInicial={Number((await searchParams).tema) || undefined} />
      <p className="sub text-center">Hoy llevas {r.minutosHoy} min de estudio registrados.</p>
    </div>
  );
}

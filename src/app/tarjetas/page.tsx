import { leerAjustes } from "@/lib/datos/ajustes";
import { accSiguienteTarjeta } from "../acciones";
import { Sesion } from "./sesion";
import { TARJETAS_10_MIN } from "@/lib/datos/diez-minutos";

export const dynamic = "force-dynamic";

export default async function Tarjetas({ searchParams }: { searchParams: Promise<{ modo?: string; tema?: string }> }) {
  const sp = await searchParams;
  const diez = sp.modo === "10";
  const tema = Number(sp.tema);
  const temaId = Number.isInteger(tema) && tema > 0 ? tema : undefined;
  const [aj, primera] = await Promise.all([leerAjustes(), accSiguienteTarjeta([], temaId)]);
  return <Sesion inicial={primera} preguntarMotivo={aj.preguntarMotivo} limite={diez ? TARJETAS_10_MIN : undefined} temaId={temaId} />;
}

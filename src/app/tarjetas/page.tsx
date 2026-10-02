import { leerAjustes } from "@/lib/datos/ajustes";
import { accSiguienteTarjeta } from "../acciones";
import { Sesion } from "./sesion";
import { TARJETAS_10_MIN } from "@/lib/datos/diez-minutos";

export const dynamic = "force-dynamic";

export default async function Tarjetas({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const diez = (await searchParams).modo === "10";
  const [aj, primera] = await Promise.all([leerAjustes(), accSiguienteTarjeta()]);
  return <Sesion inicial={primera} preguntarMotivo={aj.preguntarMotivo} limite={diez ? TARJETAS_10_MIN : undefined} />;
}

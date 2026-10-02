// Modo "Tengo 10 minutos": lo más rentable para un rato corto, sin tocar la planificación.
import { hoy, sumarDias } from "@/lib/fechas";
import { pendientesHoy } from "./tarjetas";
import { conceptosDebiles, miniEsquema } from "./analisis";
import { repasosPendientes } from "./repasos";
import { erroresRecientes } from "./registro";

export const TARJETAS_10_MIN = 10;

export async function planDiezMinutos(ahora = new Date()) {
  const dia = hoy(ahora);
  const [tarjetasHoy, debiles, repasos, errores] = await Promise.all([
    pendientesHoy(ahora),
    conceptosDebiles(3, 60, ahora),
    repasosPendientes(dia),
    erroresRecientes({ desde: sumarDias(dia, -7), limite: 8 }),
  ]);
  const esquema = debiles[0] ? await miniEsquema(debiles[0].conceptoId) : null;
  return {
    tarjetas: Math.min(TARJETAS_10_MIN, tarjetasHoy.total),
    esquema,
    debiles,
    erroresConNota: errores.filter((e) => (e.nota || e.concepto) && e.concepto !== esquema?.nombre).slice(0, 5),
    repasos: repasos.slice(0, 3),
  };
}

// Fechas de calendario (YYYY-MM-DD) en hora peninsular española.
export const ZONA = "Europe/Madrid";

export function hoy(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diaSemana(fecha: string): number {
  // 0 = lunes … 6 = domingo
  return (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/** Celdas de la cuadrícula de un mes (semanas de lunes a domingo). */
export function cuadriculaMes(mes: string): string[] {
  const primero = `${mes}-01`;
  const inicio = sumarDias(primero, -diaSemana(primero));
  const celdas: string[] = [];
  let d = inicio;
  while (celdas.length < 42) {
    celdas.push(d);
    d = sumarDias(d, 1);
    if (celdas.length % 7 === 0 && d.slice(0, 7) > mes) break;
  }
  return celdas;
}

export function mesSiguiente(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const fmtLargo = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fmtMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatoLargo(fecha: string): string {
  return fmtLargo.format(new Date(`${fecha}T12:00:00Z`));
}
export function formatoMes(mes: string): string {
  return fmtMes.format(new Date(`${mes}-15T12:00:00Z`));
}

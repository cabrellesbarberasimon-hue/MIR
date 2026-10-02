import type { MotivoError } from "@/db/schema";

export const MOTIVOS: { valor: MotivoError; texto: string }[] = [
  { valor: "no_lo_sabia", texto: "No lo sabía" },
  { valor: "olvidado", texto: "Lo había olvidado" },
  { valor: "confusion", texto: "Confundí conceptos" },
  { valor: "lectura", texto: "Leí mal / despiste" },
  { valor: "razonamiento", texto: "Razoné mal" },
  { valor: "duda", texto: "Dudé y cambié" },
];

export function textoMotivo(m: string | null | undefined) {
  return MOTIVOS.find((x) => x.valor === m)?.texto ?? "Sin motivo";
}

export const TIPO_PLAN_TEXTO = { estudio: "Estudio", repaso: "Repaso", preguntas: "Preguntas" } as const;

export function pct(a: number, t: number) {
  return t > 0 ? Math.round((100 * a) / t) : 0;
}

// Generador real con la API de Anthropic (salida estructurada validada con Zod).
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PropuestaSchema, PROMPT_SISTEMA, mensajeUsuario, type Generador } from "./generador";
import { MODELO } from "./coste";

export function generadorAnthropic(opciones: { esfuerzo?: "low" | "medium" | "high" } = {}): Generador {
  const cliente = new Anthropic(); // usa ANTHROPIC_API_KEY
  return async (e) => {
    const r = await cliente.messages.parse({
      model: MODELO,
      max_tokens: 32000,
      system: PROMPT_SISTEMA,
      messages: [{ role: "user", content: mensajeUsuario(e) }],
      output_config: { effort: opciones.esfuerzo ?? "medium", format: zodOutputFormat(PropuestaSchema) },
    });
    if (r.stop_reason === "refusal") throw new Error("La IA rechazó la petición (refusal)");
    if (r.stop_reason === "max_tokens") throw new Error("Respuesta truncada (max_tokens)");
    if (!r.parsed_output) throw new Error("Respuesta sin JSON válido");
    return {
      tarjetas: r.parsed_output.tarjetas,
      tokensEntrada: r.usage.input_tokens + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0),
      tokensSalida: r.usage.output_tokens,
    };
  };
}

# Traspaso a Claude Code en local (Windows)

Contexto para continuar el proyecto desde el PC del usuario, donde sí hay acceso a los manuales.
Léelo junto con CLAUDE.md (principios), DECISIONS.md (decisiones) y PENDIENTE.md (lo que falta).

## Estado actual
- App Next.js 16 + Drizzle + Neon desplegada en Vercel: proyecto `mir-estudio`, URL https://mir-estudio.vercel.app,
  región Frankfurt. GitHub conectado: **cada push a `main` redespliega producción** (el build aplica las migraciones).
- Repo: https://github.com/cabrellesbarberasimon-hue/MIR (rama `main`).
- Fase 1 y Fase 2 implementadas y con tests (`npm test`, 40+ tests con PGlite). Extras: cuenta atrás al MIR,
  objetivo diario y racha, temporizador, notas por tema, tarjetas propias, buscador.
- **Falta**: cargar los manuales y generar las tarjetas (no había acceso a los PDF desde la nube).

## Manuales
- Carpeta: `C:\Users\Simo\OneDrive - BoCubi\Escritorio\MANUALES` — SOLO LECTURA. No copiar al repo ni subir nada
  derivado (tarjetas, textos, muestras). `privado/` y `docs/muestra-tarjetas.md` están en `.gitignore`.
- Los PDF con nombre de examen/simulacro/plantilla se omiten automáticamente (`esExamen` en scripts/comun.ts).

## Preparación (una vez)
1. `git clone https://github.com/cabrellesbarberasimon-hue/MIR.git` y `npm install` (Node 20+).
2. Crear `.env` (copiar de `.env.example`) con:
   - `DATABASE_URL`: cadena de Neon (Vercel → mir-estudio → Storage → Open in Neon → Connect). Pedírsela al usuario
     para que la pegue él en el archivo; no escribirla en commits ni en el chat.
   - `MANUALES_DIR='C:\Users\Simo\OneDrive - BoCubi\Escritorio\MANUALES'`
   - `ANTHROPIC_API_KEY` solo si se quiere generación por API (opcional, ver abajo).
3. Si los PDF están «solo en línea» en OneDrive, pedir al usuario «Mantener siempre en este dispositivo».

## Pasos
1. `npm run analizar-manuales` → leer `privado/analisis-manuales.md`. Comprobar formatos de referencia MIR y la
   detección de capítulos; si algo no encaja, ajustar `src/lib/mir.ts` / `src/lib/manuales/estructura.ts`
   **con tests**, y actualizar `docs/analisis-manuales.md` con las conclusiones (sin copiar texto de los manuales).
2. `npm run cargar-manuales` → capítulos → temas (crea asignaturas/temas que falten; idempotente). Revisar con el
   usuario las asociaciones en la app (Más → Manuales).
3. Tarjetas, dos vías (misma validación: la `cita` debe estar literal en el fragmento; si no, se descarta):
   - **Sin API (recomendado si no hay clave):** por capítulo,
     `npm run tarjetas-sin-api -- exportar --siguiente` (o `--seccion <id>`) → leer `privado/secciones/<id>.md`
     (incluye las reglas de calidad) → escribir `privado/tarjetas/<id>.json` → `npm run tarjetas-sin-api -- importar --seccion <id>`.
     Empezar por los temas planificados; `--siguiente` elige el pendiente de más prioridad.
   - **Con API:** `npm run generar-tarjetas -- --estimar`, probar un capítulo con `--seccion <id> --seco --muestra`,
     revisar `docs/muestra-tarjetas.md` y luego `npm run generar-tarjetas`. Si cuesta > 20 €, solo temas planificados
     salvo `--todo`.
4. Revisar una muestra de tarjetas con las reglas 14.5 (un concepto por tarjeta, respuesta concisa, sin redundancias,
   contexto suficiente, solo del fragmento) antes de procesar todo.

## Reglas de trabajo
- Commits pequeños; `npm test` y `npm run lint` antes de cada push a `main` (despliega producción).
- Registrar decisiones en DECISIONS.md y lo que requiera al usuario en PENDIENTE.md.
- Repos públicos: `MIR` y `manualespdfs` siguen públicos; recomendar al usuario hacerlos privados.

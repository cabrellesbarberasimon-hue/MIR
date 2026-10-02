# Pendiente (requiere tu intervención)

Todo lo demás está hecho, probado y subido a la rama `claude/nice-cerf-5ybw3q`.

## 1. ⚠️ Hacer privado el repositorio de GitHub (urgente)
El repositorio `cabrellesbarberasimon-hue/MIR` **es público** y desde este entorno no puedo cambiar su
visibilidad (sin sesión de `gh`). No contiene manuales, datos derivados ni claves (el `.gitignore` los
excluye), pero debe ser privado:
- Web: GitHub → repo → Settings → General → Danger Zone → *Change visibility* → Private.
- O bien: `gh repo edit cabrellesbarberasimon-hue/MIR --visibility private --accept-visibility-change-consequences`

## 2. PRODUCT_SPEC.md
No estaba en el repositorio ni en el entorno. La app se ha construido a partir de tu prompt (que resume las
secciones 13, 14, 14.5 y 15). Súbelo al repo y revisa si algo difiere de DECISIONS.md (motivos de error,
intervalos de repaso 1/7/30 días, contenido del modo 10 minutos y de los mini-esquemas).

## 3. Integrar la rama
`git checkout main && git merge claude/nice-cerf-5ybw3q && git push` (o abre un PR desde GitHub).

## 4. Base de datos y despliegue en Vercel (no hay sesión de Vercel en este entorno)
```bash
npm i -g vercel
vercel login
vercel link                       # crea el proyecto enlazado a este repo
vercel integration add neon       # o en el panel: Storage → Create Database → Neon; define DATABASE_URL
vercel env add APP_PASSWORD production       # tu contraseña para entrar en la app
vercel env add SESSION_SECRET production     # pega el resultado de: openssl rand -hex 32
vercel git connect                # despliegue automático en cada push a main (si no lo hizo `link`)
vercel --prod                     # primer despliegue (aplica las migraciones al compilar)
```
Si usas otras ramas, añade también las variables al entorno *preview*.

## 5. Entorno local para los scripts
```bash
npm install
vercel env pull .env              # trae DATABASE_URL de Neon
# añade a .env:
#   ANTHROPIC_API_KEY=sk-ant-...   (https://console.anthropic.com → API keys)
#   MANUALES_DIR=~/Desktop/manuales
#   APP_PASSWORD y SESSION_SECRET  (solo si quieres usar `npm run dev`)
```

## 6. Análisis de los manuales y carga
No pude acceder a `~/Desktop/manuales` (está en tu ordenador, no en el entorno de desarrollo).
```bash
npm run analizar-manuales         # informe en privado/analisis-manuales.md (formatos, capítulos, refs MIR, coste)
npm run cargar-manuales           # capítulos → temas (crea asignaturas/temas que falten); idempotente
```
Revisa el informe: si los formatos de referencia MIR o la detección de capítulos no encajan, ajusta
`src/lib/mir.ts` / `src/lib/manuales/estructura.ts` (tienen tests). Corrige asociaciones en la app: Más → Manuales.

## 7. Generación de tarjetas con IA (falta ANTHROPIC_API_KEY)
El script está terminado y probado con un generador simulado. Pasos:
```bash
npm run generar-tarjetas -- --estimar                 # coste estimado de lo pendiente
# Prueba con UN capítulo (sin guardar) y revisa la calidad:
npm run generar-tarjetas -- --seccion <id> --seco --muestra   # escribe docs/muestra-tarjetas.md (privado)
# Si hay que ajustar, edita PROMPT_SISTEMA en src/lib/manuales/generador.ts (sube VERSION_PROMPT) y repite.
npm run generar-tarjetas                              # procesa lo pendiente (reanudable; Ctrl+C es seguro)
```
El id de un capítulo se ve en la base de datos (`select id, titulo from secciones`) o probando con
`--manual "cardio" --limite 1 --seco`. La revisión de calidad del capítulo de prueba según la sección 14.5 (un
concepto por tarjeta, respuestas concisas, sin redundancias, contexto suficiente, solo del fragmento) no se ha
podido hacer con IA real; la parte "solo del fragmento" la garantiza además el código (cita literal verificada).

## 8. Estimación de coste (aproximada, sin haber visto los manuales)
Precios de `claude-opus-5-5`: 4 $/M tokens de entrada y 20 $/M de salida (≈ 0,86 €/$).
Supuesto: ~30 manuales, ~7.000 páginas, ~4.500 caracteres útiles por página ≈ 31 M caracteres
≈ 9 M tokens de entrada (+ 2 M de instrucciones) y ~4 M de salida (tarjetas + razonamiento):
**≈ 44 $ + 81 $ ≈ 125 $ ≈ 105 € (rango probable 60–130 €)**. El script calcula la cifra real con `--estimar`.
Como supera 20 €, **por defecto el script solo genera las tarjetas de los temas que tengan planificación**;
el resto queda pendiente para lanzarlo con `npm run generar-tarjetas -- --todo` cuando quieras.
Opciones para abaratar (decisión tuya): `--esfuerzo low` (menos razonamiento, menos tokens de salida) o
cambiar `MODELO` en `src/lib/manuales/coste.ts` a `claude-sonnet-5-5` (2 $/10 $ por M, ≈ la mitad;
actualiza también los precios en ese archivo).

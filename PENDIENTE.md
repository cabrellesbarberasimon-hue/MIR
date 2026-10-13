# Pendiente (requiere tu intervención)

Todo lo demás está hecho, probado y subido a `main`.

## 1. ✅ App desplegada en `mir-project`
- URL: **https://mir-project-rust.vercel.app** (contraseña: la que se te dio en el chat; cámbiala en Vercel →
  `mir-project` → Settings → Environment Variables → `APP_PASSWORD` y redespliega).
- Conectado a GitHub: cada push a `main` despliega. Usa la base Neon de `mir-project` (`MIR_DATABASE_URL`).
- `mir-estudio.vercel.app` es el proyecto antiguo (otra cuenta de Vercel, base vacía): puedes borrarlo.

## 2. Decide qué hacer con LIBRO GORDO.pdf y LG IMAGENES.pdf
Por defecto los dejo fuera de la carga (ver docs/analisis-manuales.md):
- **LIBRO GORDO.pdf**: no es un manual por especialidad, es un recopilatorio de preguntas de examen 2016-2025
  comentadas; cargarlo tal cual crearía una asignatura ficticia "Libro gordo" con 245 capítulos mezclando todas
  las especialidades. Si quieres aprovechar su contenido, dime cómo lo prefieres (p. ej. asociar sus capítulos
  a los temas de especialidad ya existentes en vez de a una asignatura nueva) y lo ajusto.
- **LG IMAGENES.pdf**: está escaneado (sin texto extraíble), no generaría ninguna tarjeta. Necesitaría OCR
  antes de ser útil; dime si quieres que lo intente o si lo dejamos fuera sin más.

## 3. ⚠️ Hacer privado el repositorio de GitHub (urgente, pendiente de antes)
El repositorio `cabrellesbarberasimon-hue/MIR` **es público** y no puedo cambiar su visibilidad sin sesión de
`gh` autenticada como tú. No contiene manuales, datos derivados ni claves (el `.gitignore` los excluye), pero
debe ser privado:
- Web: GitHub → repo → Settings → General → Danger Zone → *Change visibility* → Private.
- O bien: `gh repo edit cabrellesbarberasimon-hue/MIR --visibility private --accept-visibility-change-consequences`

## 4. PRODUCT_SPEC.md (pendiente de antes)
No está en el repositorio ni en este PC. La app se construyó a partir de tu prompt original (que resume las
secciones 13, 14, 14.5 y 15). Si lo tienes, súbelo al repo y te digo si algo difiere de DECISIONS.md (motivos
de error, intervalos de repaso 1/7/30 días, contenido del modo 10 minutos y de los mini-esquemas).

## 5. Progreso de las tarjetas (informativo)
A fecha de hoy: **281/346 capítulos, 9.704 tarjetas** (vía sin API, validadas con cita literal obligatoria;
no cuenta la sección 567 "Actualizaciones MIR", 278 fragmentos, que dejo aparte por su tamaño desproporcionado
— ver nota más abajo). Quedan ~64 capítulos.

La sesión ha ido muy en paralelo con varios subagentes a la vez cuando la herramienta lo permitía (mucho más
rápido: varios cientos de tarjetas en minutos), y capítulo a capítulo yo solo cuando no ("Fork is not available
inside a forked worker" — límite de la plataforma, no un fallo mío). También hubo varios cortes por el límite
de uso mensual de la cuenta (se resuelven solos pasado un tiempo). **Si quieres acelerarlo, abre una sesión
nueva de Claude Code en este proyecto y pide "sigue con las tarjetas del MIR, en paralelo, lee PENDIENTE.md y
DECISIONS.md primero"** — es probable que el modo paralelo esté disponible de nuevo ahí.

Puedes revisar el avance en la app (Más → Manuales) o preguntándome directamente.

Pendiente de decidir: la sección 567 ("Actualizaciones MIR", el único capítulo de ese manual, 113 páginas
y 278 fragmentos — mucho más grande que cualquier otro) la dejé fuera de la cola automática por su tamaño;
si quieres que la procese igualmente dímelo (llevará varias tandas de trabajo solo para ese capítulo).

## Ya hecho (contexto, no requiere acción)
- Código en `main`, desplegado en `mir-project` (ver punto 1).
- Generación de tarjetas: vamos por la vía **sin API** (`npm run tarjetas-sin-api`, redactadas por Claude,
  validadas igual que las de la API — cita literal obligatoria). No hace falta `ANTHROPIC_API_KEY`.

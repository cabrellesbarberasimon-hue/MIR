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

## 3. ✅ Código en `main`
Hecho: `main` contiene la app (Vercel despliega esa rama en producción).

## 4. Desplegar en Vercel desde el navegador
Desde el entorno de desarrollo no se puede: la red bloquea `api.vercel.com` y `console.neon.tech`, y el conector
de Vercel de claude.ai no está conectado. Para que Claude lo haga en otra sesión: conecta Vercel en
https://claude.ai/customize/connectors y añade `api.vercel.com` y `console.neon.tech` a los dominios permitidos del
entorno (menú del entorno → Edit → Network access); después abre una sesión nueva. O hazlo a mano:
1. Entra en https://vercel.com con tu cuenta de GitHub → *Add New… → Project* → *Import* `cabrellesbarberasimon-hue/MIR`.
   No cambies la configuración (Vercel detecta Next.js). Despliega *Environment Variables* y añade:
   - `APP_PASSWORD` = la contraseña que darás a la persona que va a usar la app.
   - `SESSION_SECRET` = una cadena aleatoria (32 caracteres o más). Por ejemplo, en PowerShell:
     `-join ((48..57)+(97..122) | Get-Random -Count 32 | % {[char]$_})`
   Pulsa *Deploy*. Este primer despliegue aún no tiene base de datos: es normal que la app dé error.
2. Base de datos: en el proyecto, pestaña *Storage* → *Create Database* → **Neon** (plan Free) → región Europa
   (Frankfurt) → conéctala a todos los entornos (Production, Preview, Development). Esto crea `DATABASE_URL`.
3. *Deployments* → en el último, *⋯ → Redeploy*. Ahora el build crea las tablas y la app funciona.
4. Comprueba que entras con la contraseña en el dominio de producción.
5. **Enlace a enviar:** el dominio de producción que aparece en el proyecto (`https://<nombre>.vercel.app`, en
   *Settings → Domains* puedes cambiar el nombre). Envía ese enlace y la contraseña `APP_PASSWORD`.
   No envíes enlaces de *Preview* (los que llevan letras aleatorias): Vercel los protege y pediría iniciar sesión en Vercel.
   En el móvil, desde el navegador → «Añadir a pantalla de inicio» se usa como una app.

Nota: la app es de un único usuario (una contraseña y un único conjunto de datos). Si varias personas
necesitan cada una sus propios datos, cada una necesita su propio despliegue (repetir pasos 1-3) o habría que
añadir cuentas de usuario.

## 5. Entorno local en tu PC (Windows) para los scripts de manuales
Requisitos: [Node.js LTS](https://nodejs.org) y [Git](https://git-scm.com). En PowerShell:
```powershell
git clone https://github.com/cabrellesbarberasimon-hue/MIR.git
cd MIR
npm install
copy .env.example .env
notepad .env
```
En `.env`:
- `DATABASE_URL`: la de Neon (Vercel → *Storage* → tu base → *.env.local* → *Show secret* → copia
  `DATABASE_URL`). Así los scripts escriben en la misma base que usa la app desplegada.
- `MANUALES_DIR='C:\Users\Simo\OneDrive - BoCubi\Escritorio\MANUALES'` (ya viene así; las comillas simples
  son necesarias por los espacios).
- `ANTHROPIC_API_KEY=sk-ant-...` (https://console.anthropic.com → API keys; requiere añadir saldo).
- `APP_PASSWORD` y `SESSION_SECRET`: solo si quieres usar `npm run dev` en local.

OneDrive: si los PDF están «solo en línea» (icono de nube), clic derecho en la carpeta MANUALES →
*Mantener siempre en este dispositivo*, para que los scripts puedan leerlos sin esperas.

## 6. Análisis de los manuales y carga
No pude acceder a la carpeta de manuales (está en tu PC, no en el entorno de desarrollo). En PowerShell, dentro de `MIR`:
```powershell
npm run analizar-manuales         # informe en privado/analisis-manuales.md (formatos, capítulos, refs MIR, coste)
npm run cargar-manuales           # capítulos → temas (crea asignaturas/temas que falten); idempotente
```
Revisa el informe: si los formatos de referencia MIR o la detección de capítulos no encajan, ajusta
`src/lib/mir.ts` / `src/lib/manuales/estructura.ts` (tienen tests). Corrige asociaciones en la app: Más → Manuales.

## 7. Generación de tarjetas con IA (falta ANTHROPIC_API_KEY)
El script está terminado y probado con un generador simulado. Pasos:
```powershell
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

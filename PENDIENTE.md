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

## 4. ✅ Desplegado en Vercel
- URL de producción: **https://mir-estudio.vercel.app** (proyecto `mir-estudio`, región Frankfurt).
- Base de datos Neon conectada; las tablas se crean en cada build. GitHub conectado: cada push a `main` redespliega.
- Acceso: contraseña `APP_PASSWORD` (se dio en el chat; cámbiala en *Settings → Environment Variables* y redespliega).
- La protección de Vercel solo afecta a las *Preview*; el dominio de producción es accesible con la contraseña de la app.

## 5-6. Cargar los manuales desde tu PC (doble clic)
No se puede hacer desde la nube: los manuales están en tu PC
(`C:\Users\Simo\OneDrive - BoCubi\Escritorio\MANUALES`) y son privados.
1. Instala [Node.js LTS](https://nodejs.org) (siguiente, siguiente…).
2. Descarga el código: GitHub → repo `MIR` → botón verde *Code* → *Download ZIP* → descomprímelo (p. ej. en Documentos).
3. Ten a mano la cadena de conexión de Neon: Vercel → `mir-estudio` → *Storage* → tu base → *Open in Neon* →
   *Connect* → copia la cadena (`postgresql://…`).
4. Doble clic en **`MANUALES.bat`**. La primera vez pide la cadena de Neon, la carpeta de manuales (Enter = la tuya)
   y la clave de Anthropic (Enter para saltarla). Analiza los manuales, carga capítulos → temas en la app y, si hay
   clave, estima el coste y pregunta antes de generar tarjetas. Se puede volver a abrir: continúa donde lo dejó.
Los PDF cuyo nombre parece de examen/simulacro/plantilla se omiten (la app no tiene banco de preguntas).
Revisa luego en la app *Más → Manuales* las asociaciones capítulo → tema.
OneDrive: si los PDF están «solo en línea», clic derecho en MANUALES → *Mantener siempre en este dispositivo*.

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

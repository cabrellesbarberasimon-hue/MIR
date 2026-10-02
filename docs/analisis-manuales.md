# Análisis de los manuales

## Situación

El desarrollo se ha hecho en un entorno en la nube sin acceso a `~/Desktop/manuales` (esa carpeta está en tu
ordenador). Por eso **la inspección real no se ha podido hacer todavía**. Para hacerla, en tu ordenador:

```bash
npm run analizar-manuales            # lee la carpeta (solo lectura) y escribe privado/analisis-manuales.md
```

El informe (que no se sube a git) incluye: formatos de archivo; para cada PDF, páginas, calidad del texto
(texto / mixto / escaneado), capítulos detectados y método; los formatos de referencia MIR encontrados
(con los dígitos sustituidos por 9, p. ej. `(MIR 99, 99)`); 1500 caracteres de muestra de 3 capítulos; y la
estimación de coste de generar todas las tarjetas.

El script se ha probado con PDF sintéticos (con y sin marcadores) generados con texto inventado.

## Supuestos de diseño (a validar con el informe)

**Formato.** PDF con texto (los habituales de academias MIR). Los PDF escaneados se detectan
(`escaneado` si < 20 % de páginas tiene texto) y se cargan, pero no producen tarjetas útiles:
habría que pasarles OCR antes. Otros formatos se listan pero se ignoran.

**Estructura.** Un PDF por asignatura (el nombre de la asignatura se deduce del nombre del archivo quitando
numeración, paréntesis, editorial y año: `03 - Cardiología (AMIR 2025).pdf` → `Cardiología`). Capítulos:
1. Marcadores/índice del PDF (lo más fiable): se usa el nivel cuyos títulos parecen "Tema N"/"Capítulo N"
   o, si no, el primer nivel con ≥ 2 entradas.
2. Sin marcadores: líneas "Tema 3. …", "TEMA 3 …", "Capítulo XII: …" en las primeras líneas de una
   página (se ignoran las líneas de índice con puntos suspensivos).
3. Si no se detecta nada: el manual entero es un capítulo.

Las secciones internas de un capítulo no se modelan como entidades: el texto se divide en fragmentos
(párrafos de ≤ 1800 caracteres) con su página, que es la granularidad que necesitan las tarjetas.

**Referencias MIR.** Formatos reconocidos: `(MIR 2021)`, `(MIR 21)`, `(MIR 19, 21)`, `(MIR 19 y 21)`,
`(MIR 18-19)` (convocatoria → año 2019), `(MIR 2019-2020)`, `MIR 15; MIR 21`. Años de 2 cifras: ≤ año actual
→ 20xx; si no, 19xx. Si el informe muestra otros formatos (p. ej. con número de pregunta o letra de versión),
hay que ajustar `src/lib/mir.ts` y sus tests.

**Calidad de extracción.** Riesgos conocidos de `pdf.js` con manuales maquetados: columnas (normalmente
se leen bien por columna, pero pueden mezclarse), tablas (salen como texto desordenado),
cabeceras/pies repetidos y palabras cortadas con guion (se reparan). Mitigaciones: el prompt pide no crear
tarjetas de fragmentos mal extraídos y el código descarta toda tarjeta cuya cita no aparezca literalmente en el
texto. Las imágenes (algoritmos, figuras) no se extraen.

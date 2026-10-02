# Análisis de los manuales

## Situación

Inspección real hecha en el PC del usuario (24 PDF en `MANUALES/`, formato Windows con subcarpeta
`MANUALES/MANUALES/`). Informe completo (no se sube a git): `privado/analisis-manuales.md`
(`npm run analizar-manuales`).

## Conclusiones (sin copiar texto de los manuales)

- **20 manuales son de AMIR, 19ª edición**, nombrados `Mn<código>MIR19aED_v3.pdf` (p. ej. `MnCDMIR19aED_v3.pdf`).
  El nombre va pegado sin separadores, así que la limpieza genérica de `nombreDesdeArchivo` no lo reconocía
  (devolvía literalmente "MnCDMIR19aED"). Se añadió una tabla de los 20 códigos de 2 letras → especialidad
  (verificada contra el índice/primeras páginas reales de cada PDF, no solo por el nombre), con test en
  `tests/manuales.test.ts`. El resto de manuales (nombres normales) ya funcionaban bien.
- **Detección de capítulos**: para los 20 manuales AMIR funciona por marcadores del PDF (método "índice PDF"),
  con un número de capítulos razonable (coincide con los "Tema N" reales). `MnURMIR19aED_v3.pdf` no tiene
  marcadores y cae al método de encabezados "Tema N" en página, que también funciona. No hizo falta tocar
  `detectarCapitulos`.
- **Referencias MIR**: los formatos reales encontrados (`(MIR)`, `(MIR 99, 999)`, `(MIR 99, 99)`, listas con
  `;` y combinaciones, años de 2/3/4 cifras) ya estaban cubiertos por `src/lib/mir.ts`; el de 3 cifras se
  descarta correctamente como número de pregunta. No hizo falta tocar el regex.
- **`LIBRO GORDO.pdf`** (677 págs.) no es un manual por tema: es un recopilatorio de preguntas de examen
  2016-2025 con comentario ("Libro Gordo AMIR Preguntas MIR... y sus comentarios"), con 245 "capítulos" que
  mezclan todas las especialidades bajo una única asignatura ficticia "Libro gordo". Cargarlo así rompería el
  modelo (tema pertenece a una asignatura por especialidad) y además la app no tiene banco de preguntas
  (principio de CLAUDE.md). **Se excluye de la carga inicial** con `cargar-manuales -- --excluir "Libro Gordo"`;
  ver PENDIENTE.md si se quiere aprovechar su contenido de otra forma más adelante.
- **`LG IMAGENES.pdf`** (155 págs.) es un PDF escaneado (sin texto extraíble: `calidadTexto` → "escaneado").
  Cargarlo no generaría ninguna tarjeta (no hay cita literal que extraer) y solo ensuciaría el temario con una
  asignatura vacía. **Se excluye también** de la carga inicial; necesitaría OCR para aprovecharse (ver
  PENDIENTE.md).
- El capítulo "Imágenes MIR" de `Actualizaciones MIR 26.pdf` (págs. 118-132) también es solo imágenes: se
  carga igualmente (es un capítulo más de un manual válido) pero no producirá tarjetas.
- Coste estimado real de generar todas las tarjetas (sin Libro Gordo ni LG Imágenes): **~37 €** — dentro del
  rango que ya se había estimado a ciegas (60-130 €, resultó algo menor).

## Supuestos de diseño (confirmados con el informe real)

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

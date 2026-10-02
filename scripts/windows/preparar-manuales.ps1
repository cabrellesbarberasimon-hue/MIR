# Carga los manuales MIR en la app y genera las tarjetas. Se lanza con MANUALES.bat (doble clic).
# Compatible con Windows PowerShell 5.1. La carpeta de manuales solo se lee.
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $raiz
$npm = "npm"
if ($env:OS -eq "Windows_NT") { $npm = "npm.cmd" }

function Paso($texto) { Write-Host ""; Write-Host "== $texto ==" -ForegroundColor Cyan }
function Salir($codigo) { Write-Host ""; Read-Host "Pulsa Enter para cerrar" | Out-Null; exit $codigo }
function Ejecutar([string[]]$argumentos) {
  & $npm @argumentos
  if ($LASTEXITCODE -ne 0) { Write-Host "Ha fallado: npm $($argumentos -join ' ')" -ForegroundColor Red; Salir 1 }
}

Paso "Comprobando Node.js"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Falta Node.js. Instala la version LTS desde https://nodejs.org y vuelve a abrir MANUALES.bat" -ForegroundColor Yellow
  Salir 1
}
node -v

if (-not (Test-Path (Join-Path $raiz "node_modules"))) {
  Paso "Instalando dependencias (solo la primera vez, tarda un par de minutos)"
  Ejecutar @("install", "--no-audit", "--no-fund")
}

# --- .env (claves locales; nunca se suben a git) ---
$rutaEnv = Join-Path $raiz ".env"
$vars = [ordered]@{}
if (Test-Path $rutaEnv) {
  foreach ($linea in [IO.File]::ReadAllLines($rutaEnv)) {
    if ($linea -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $vars[$Matches[1]] = $Matches[2].Trim().Trim("'").Trim('"') }
  }
}
function Pedir($clave, $mensaje, $defecto) {
  if ($vars[$clave]) { return }
  $v = Read-Host $mensaje
  if (-not $v) { $v = $defecto }
  $vars[$clave] = $v
}
Paso "Configuracion"
Pedir "DATABASE_URL" "Pega la cadena de conexion de Neon (Vercel > Storage > Open in Neon > Connect)" ""
if (-not $vars["DATABASE_URL"]) { Write-Host "Sin DATABASE_URL no se puede continuar." -ForegroundColor Red; Salir 1 }
$defectoManuales = Join-Path $env:USERPROFILE "OneDrive - BoCubi\Escritorio\MANUALES"
Pedir "MANUALES_DIR" "Carpeta de manuales [Enter = $defectoManuales]" $defectoManuales
if (-not $vars.Contains("ANTHROPIC_API_KEY")) {
  $vars["ANTHROPIC_API_KEY"] = Read-Host "Clave de Anthropic para generar tarjetas (Enter = de momento no, solo cargar el temario)"
}
$lineas = foreach ($k in $vars.Keys) { "$k='$($vars[$k])'" }
[IO.File]::WriteAllLines($rutaEnv, [string[]]$lineas, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Guardado en .env (no se sube a git)."

if (-not (Test-Path $vars["MANUALES_DIR"])) {
  Write-Host "No encuentro la carpeta: $($vars['MANUALES_DIR']). Corrige MANUALES_DIR en .env" -ForegroundColor Red
  Salir 1
}

Paso "1/3 Analizando los manuales (informe en privado\analisis-manuales.md)"
Ejecutar @("run", "analizar-manuales")

Paso "2/3 Cargando capitulos y temas en la app"
Ejecutar @("run", "cargar-manuales")

if (-not $vars["ANTHROPIC_API_KEY"]) {
  Write-Host ""
  Write-Host "Temario cargado. Para generar tarjetas, anade ANTHROPIC_API_KEY en .env y vuelve a abrir MANUALES.bat." -ForegroundColor Green
  Salir 0
}

Paso "3/3 Tarjetas con IA"
Ejecutar @("run", "generar-tarjetas", "--", "--estimar")
$r = Read-Host "Generar ahora? Si cuesta mas de 20 euros solo se hacen los temas planificados (s/n)"
if ($r -match '^[sS]') {
  & $npm run generar-tarjetas
  Write-Host "Si se interrumpe, vuelve a abrir MANUALES.bat: continua donde lo dejo." -ForegroundColor Green
}
Salir 0

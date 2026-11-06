<#
.SYNOPSIS
  Levanta todo el ecosistema de microfronts en local. SÓLO PARA DESARROLLO.

.DESCRIPTION
  En producción cada pieza (shell, mf-clientes, mf-ventas, back-clientes, back-ventas)
  se despliega por separado con el docker-compose.yml de su carpeta. Este script sólo
  agrupa todo en una máquina para trabajar cómodamente.

  Comandos:
    up      (por defecto) Construye y levanta los 9 contenedores (docker-compose.dev.yml) y espera a que respondan.
    local   BDs y UIs en Docker + backends y fronts con `npm run dev` (hot reload), cada uno en su ventana.
    down    Para el stack de Docker (añade -Volumes para borrar los datos de las BDs).
    logs    Sigue los logs de Docker (opcional: -Service shell).
    status  Estado de los contenedores y de cada URL.

.EXAMPLE
  ./dev.ps1
  ./dev.ps1 local
  ./dev.ps1 logs -Service back-ventas
  ./dev.ps1 down -Volumes
#>
param(
  [ValidateSet('up', 'local', 'down', 'logs', 'status')]
  [string]$Command = 'up',
  [string]$Service = '',
  [switch]$Volumes
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$ComposeFile = Join-Path $Root 'docker-compose.dev.yml'

$Endpoints = [ordered]@{
  'Shell'                = 'http://localhost:5000'
  'mf-clientes (Vue)'    = 'http://localhost:5001/remoteEntry.js'
  'mf-ventas (React)'    = 'http://localhost:5002/remoteEntry.js'
  'back-clientes'        = 'http://localhost:3001/health'
  'back-ventas'          = 'http://localhost:3002/health'
  'Adminer (Postgres)'   = 'http://localhost:8080'
  'mongo-express (Mongo)' = 'http://localhost:8081'
}

# Orden de arranque en modo local: primero los backs, luego los remotes y al final la shell.
$Apps = @('back-clientes', 'back-ventas', 'mf-clientes', 'mf-ventas', 'shell')

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

function Invoke-Compose {
  & docker compose -f $ComposeFile @args
  if ($LASTEXITCODE -ne 0) { throw "docker compose $($args -join ' ') falló (código $LASTEXITCODE)" }
}

function Test-Url($url) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -lt 500
  } catch { return $false }
}

function Wait-Endpoints($names, [int]$timeoutSec = 240) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  $pending = [System.Collections.ArrayList]@($names)
  while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
    foreach ($n in @($pending)) {
      if (Test-Url $Endpoints[$n]) {
        Write-Host ("  [ok] {0,-22} {1}" -f $n, $Endpoints[$n]) -ForegroundColor Green
        $pending.Remove($n)
      }
    }
    if ($pending.Count -gt 0) { Start-Sleep -Seconds 2 }
  }
  foreach ($n in $pending) { Write-Host ("  [--] {0,-22} {1} (sin respuesta)" -f $n, $Endpoints[$n]) -ForegroundColor Yellow }
  return $pending.Count -eq 0
}

function Assert-Docker {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker no está instalado o no está en el PATH.' }
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Docker no está corriendo. Arranca Docker Desktop y vuelve a intentarlo.' }
}

function Show-Summary {
  Write-Host ''
  Write-Host 'Listo. Abre http://localhost:5000' -ForegroundColor Green
  Write-Host 'Adminer: servidor db-clientes · usuario/clave/BD: clientes  |  mongo-express sin auth'
  Write-Host "Recuerda: esto es SÓLO desarrollo. En producción cada pieza se despliega por separado." -ForegroundColor DarkGray
}

switch ($Command) {
  'up' {
    Assert-Docker
    Write-Step 'Construyendo y levantando los 9 contenedores (docker-compose.dev.yml)…'
    Invoke-Compose up -d --build
    Write-Step 'Esperando a que respondan los servicios…'
    $ok = Wait-Endpoints $Endpoints.Keys
    if (-not $ok) { Write-Host "Algún servicio no respondió. Revisa: ./dev.ps1 logs" -ForegroundColor Yellow; exit 1 }
    Show-Summary
  }

  'local' {
    Assert-Docker
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm no está instalado o no está en el PATH.' }

    Write-Step 'Parando los contenedores de apps (si los hay) para liberar los puertos 3001-3002 / 5000-5002…'
    & docker compose -f $ComposeFile stop back-clientes back-ventas mf-clientes mf-ventas shell *> $null

    Write-Step 'Levantando sólo BDs y UIs en Docker…'
    Invoke-Compose up -d db-clientes db-ventas adminer mongo-express

    foreach ($app in $Apps) {
      $dir = Join-Path $Root $app
      if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
        Write-Step "npm install en $app…"
        Push-Location $dir
        try { & npm install; if ($LASTEXITCODE -ne 0) { throw "npm install falló en $app" } } finally { Pop-Location }
      }
      Write-Step "npm run dev en $app (nueva ventana)…"
      $cmd = "`$Host.UI.RawUI.WindowTitle = '$app'; Set-Location -LiteralPath '$dir'; npm run dev"
      Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmd | Out-Null
    }

    Write-Step 'Esperando a que respondan los servicios…'
    $null = Wait-Endpoints $Endpoints.Keys 180
    Show-Summary
    Write-Host 'Para parar: cierra las ventanas de npm y ejecuta ./dev.ps1 down' -ForegroundColor DarkGray
  }

  'down' {
    Assert-Docker
    if ($Volumes) { Write-Step 'Parando el stack y BORRANDO volúmenes de datos…'; Invoke-Compose down -v }
    else { Write-Step 'Parando el stack (los datos se conservan)…'; Invoke-Compose down }
  }

  'logs' {
    Assert-Docker
    if ($Service) { Invoke-Compose logs -f --tail 100 $Service } else { Invoke-Compose logs -f --tail 100 }
  }

  'status' {
    Assert-Docker
    Invoke-Compose ps
    Write-Host ''
    foreach ($n in $Endpoints.Keys) {
      $up = Test-Url $Endpoints[$n]
      $color = if ($up) { 'Green' } else { 'DarkGray' }
      $mark = if ($up) { 'ok' } else { '--' }
      Write-Host ("  [{0}] {1,-22} {2}" -f $mark, $n, $Endpoints[$n]) -ForegroundColor $color
    }
  }
}

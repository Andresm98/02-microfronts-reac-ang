#!/usr/bin/env bash
# Levanta todo el ecosistema de microfronts en local. SÓLO PARA DESARROLLO.
#
# En producción cada pieza (shell, mf-clientes, mf-ventas, back-clientes, back-ventas)
# se despliega por separado con el docker-compose.yml de su carpeta. Este script sólo
# agrupa todo en una máquina para trabajar cómodamente.
#
# Uso: ./dev.sh [up|local|down|logs|status] [opciones]
#   up              (por defecto) Construye y levanta los 9 contenedores y espera a que respondan.
#   local           BDs y UIs en Docker + backends y fronts con `npm run dev` (hot reload) en segundo plano.
#                   Logs en .dev/logs/<app>.log. Para pararlos: ./dev.sh down
#   down [-v]       Para el stack de Docker y los procesos de `local` (-v borra los datos de las BDs).
#   logs [servicio] Sigue los logs de Docker.
#   status          Estado de los contenedores y de cada URL.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$ROOT/docker-compose.dev.yml")
STATE_DIR="$ROOT/.dev"
APPS=(back-clientes back-ventas mf-clientes mf-ventas shell)

NAMES=("Shell" "mf-clientes (Vue)" "mf-ventas (React)" "back-clientes" "back-ventas" "Adminer (Postgres)" "mongo-express (Mongo)")
URLS=(
  "http://localhost:5000"
  "http://localhost:5001/remoteEntry.js"
  "http://localhost:5002/remoteEntry.js"
  "http://localhost:3001/health"
  "http://localhost:3002/health"
  "http://localhost:8080"
  "http://localhost:8081"
)

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }

url_up() {
  local code
  code=$(curl -s -o /dev/null -m 3 -w '%{http_code}' "$1" || true)
  [[ "$code" =~ ^[234] ]]
}

wait_endpoints() {
  local deadline=$((SECONDS + ${1:-240})) i
  local -a ok=()
  while (( SECONDS < deadline )); do
    local pending=0
    for i in "${!URLS[@]}"; do
      [[ -n "${ok[$i]:-}" ]] && continue
      if url_up "${URLS[$i]}"; then
        printf '  \033[32m[ok]\033[0m %-22s %s\n' "${NAMES[$i]}" "${URLS[$i]}"
        ok[$i]=1
      else
        pending=$((pending + 1))
      fi
    done
    (( pending == 0 )) && return 0
    sleep 2
  done
  for i in "${!URLS[@]}"; do
    [[ -z "${ok[$i]:-}" ]] && printf '  \033[33m[--]\033[0m %-22s %s (sin respuesta)\n' "${NAMES[$i]}" "${URLS[$i]}"
  done
  return 1
}

assert_docker() {
  command -v docker >/dev/null || { echo "Docker no está instalado o no está en el PATH." >&2; exit 1; }
  docker info >/dev/null 2>&1 || { echo "Docker no está corriendo. Arráncalo y vuelve a intentarlo." >&2; exit 1; }
}

summary() {
  echo
  printf '\033[32mListo. Abre http://localhost:5000\033[0m\n'
  echo "Adminer: servidor db-clientes · usuario/clave/BD: clientes  |  mongo-express sin auth"
  printf '\033[90mRecuerda: esto es SÓLO desarrollo. En producción cada pieza se despliega por separado.\033[0m\n'
}

stop_local() {
  [[ -d "$STATE_DIR/pids" ]] || return 0
  local f pid
  for f in "$STATE_DIR"/pids/*.pid; do
    [[ -e "$f" ]] || continue
    pid=$(cat "$f")
    # Mata el árbol de procesos (npm → node/vite/tsx).
    if command -v taskkill >/dev/null 2>&1; then
      taskkill //PID "$(ps -p "$pid" -o winpid= 2>/dev/null || echo "$pid")" //T //F >/dev/null 2>&1 || true
    fi
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    rm -f "$f"
    echo "  parado $(basename "$f" .pid)"
  done
}

cmd=${1:-up}
shift || true

case "$cmd" in
  up)
    assert_docker
    step "Construyendo y levantando los 9 contenedores (docker-compose.dev.yml)…"
    "${COMPOSE[@]}" up -d --build
    step "Esperando a que respondan los servicios…"
    wait_endpoints 240 || { echo "Algún servicio no respondió. Revisa: ./dev.sh logs" >&2; exit 1; }
    summary
    ;;

  local)
    assert_docker
    command -v npm >/dev/null || { echo "npm no está instalado o no está en el PATH." >&2; exit 1; }
    step "Parando los contenedores de apps (si los hay) para liberar los puertos 3001-3002 / 5000-5002…"
    "${COMPOSE[@]}" stop back-clientes back-ventas mf-clientes mf-ventas shell >/dev/null 2>&1 || true
    step "Levantando sólo BDs y UIs en Docker…"
    "${COMPOSE[@]}" up -d db-clientes db-ventas adminer mongo-express
    mkdir -p "$STATE_DIR/logs" "$STATE_DIR/pids"
    for app in "${APPS[@]}"; do
      if [[ ! -d "$ROOT/$app/node_modules" ]]; then
        step "npm install en $app…"
        (cd "$ROOT/$app" && npm install)
      fi
      step "npm run dev en $app → .dev/logs/$app.log"
      (cd "$ROOT/$app" && nohup npm run dev >"$STATE_DIR/logs/$app.log" 2>&1 & echo $! >"$STATE_DIR/pids/$app.pid")
    done
    step "Esperando a que respondan los servicios…"
    wait_endpoints 180 || true
    summary
    printf '\033[90mPara parar todo: ./dev.sh down\033[0m\n'
    ;;

  down)
    assert_docker
    step "Parando procesos de modo local (si los hay)…"
    stop_local
    if [[ "${1:-}" == "-v" ]]; then
      step "Parando el stack y BORRANDO volúmenes de datos…"
      "${COMPOSE[@]}" down -v
    else
      step "Parando el stack (los datos se conservan)…"
      "${COMPOSE[@]}" down
    fi
    ;;

  logs)
    assert_docker
    "${COMPOSE[@]}" logs -f --tail 100 "$@"
    ;;

  status)
    assert_docker
    "${COMPOSE[@]}" ps
    echo
    for i in "${!URLS[@]}"; do
      if url_up "${URLS[$i]}"; then
        printf '  \033[32m[ok]\033[0m %-22s %s\n' "${NAMES[$i]}" "${URLS[$i]}"
      else
        printf '  \033[90m[--] %-22s %s\033[0m\n' "${NAMES[$i]}" "${URLS[$i]}"
      fi
    done
    ;;

  -h|--help|help)
    sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
    ;;

  *)
    echo "Comando desconocido: $cmd (usa up|local|down|logs|status)" >&2
    exit 1
    ;;
esac

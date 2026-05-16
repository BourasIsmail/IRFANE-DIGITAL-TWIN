#!/usr/bin/env bash
# =============================================================================
#  bootstrap.sh — Irfane Smart City Digital Twin
#  Usage:
#    bash bootstrap.sh          # full start (keeps data)
#    bash bootstrap.sh --reset  # wipe volumes + full start
#    bash bootstrap.sh --status # check status only
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*"; }
ok()   { echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC} $*"; }
hdr()  { echo -e "\n${BOLD}${BLUE}$*${NC}"; echo "$(printf '─%.0s' {1..60})"; }

RESET=false; STATUS_ONLY=false
for arg in "$@"; do
  [[ "$arg" == "--reset"  ]] && RESET=true
  [[ "$arg" == "--status" ]] && STATUS_ONLY=true
done

check_http() {
  local name="$1" url="$2"
  if curl -sf "$url" -o /dev/null 2>/dev/null; then ok "$name"
  else echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $name — unreachable"; fi
}

show_status() {
  hdr "  Stack Status"
  docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "idt-|NAMES" || echo "No containers"
  echo ""
  check_http "Orion v2"       "http://localhost:1026/version"
  check_http "QuantumLeap"    "http://localhost:8668/version"
  check_http "Perseo"         "http://localhost:9090/version"
  check_http "Keyrock"        "http://localhost:3005/version"
  check_http "Cygnus"         "http://localhost:5080/v1/version"
  check_http "Grafana"        "http://localhost:3001/api/health"
  check_http "Webhook"        "http://localhost:5051/health"
  check_http "Scorpio NGSI-LD" "http://localhost:9095/q/health"
  echo ""
  log "PostgreSQL tables:"
  docker exec idt-postgres psql -U cygnus -tAc \
    "SELECT COUNT(*)||' tables' FROM information_schema.tables WHERE table_schema='irfane';" 2>/dev/null || echo "  unavailable"
}

$STATUS_ONLY && { show_status; exit 0; }

echo -e "\n${BOLD}${BLUE}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║     Irfane Smart City Digital Twin — Bootstrap      ║"
echo "  ║           Rabat, Morocco  ·  FIWARE stack           ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

if $RESET; then
  warn "RESET — wiping all volumes..."
  docker-compose down -v --remove-orphans 2>/dev/null || true
  ok "Volumes wiped"
else
  docker-compose down --remove-orphans 2>/dev/null || true
fi

hdr "  Phase 1 — Starting containers"
docker-compose up -d
ok "Compose started"

wait_http() {
  local name="$1" url="$2" max="${3:-90}"
  log "Waiting for $name..."
  for i in $(seq 1 $max); do
    curl -sf "$url" -o /dev/null 2>/dev/null && { ok "$name ready (${i}s)"; return 0; }
    sleep 1
  done
  warn "$name not ready after ${max}s"
}

wait_healthy() {
  local name="$1" max="${2:-90}"
  log "Waiting for $name..."
  for i in $(seq 1 $max); do
    [[ "$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null)" == "healthy" ]] && { ok "$name healthy (${i}s)"; return 0; }
    sleep 1
  done
  warn "$name health check timed out"
}

run_setup() {
  local label="$1"; shift
  log "Running: $label..."
  "$@" 2>&1 | tail -4 && ok "$label done" || warn "$label had issues"
}

hdr "  Phase 2 — Core services"
wait_healthy "idt-mongo"     60
wait_healthy "idt-mosquitto" 30
wait_healthy "idt-cratedb"   60
wait_http    "Orion"         "http://localhost:1026/version" 90
wait_http    "QuantumLeap"   "http://localhost:8668/version" 60

hdr "  Phase 3 — Auth & rules"
wait_http "Perseo" "http://localhost:9090/version" 60
wait_http "Cygnus" "http://localhost:5080/v1/version" 60
log "Waiting for Keyrock (60-90s to seed)..."
for i in $(seq 1 120); do
  curl -sf "http://localhost:3005/version" -o /dev/null 2>/dev/null && { ok "Keyrock ready (${i}s)"; break; }
  sleep 1
  [[ $i == 120 ]] && warn "Keyrock timeout"
done

hdr "  Phase 4 — Subscriptions & rules"
run_setup "QuantumLeap subscriptions"  docker exec idt-simulator python /app/setup_ql_subs.py
sleep 2
run_setup "Perseo alert rules"         docker exec idt-webhook node /app/setup_rules.js
sleep 2
run_setup "Cygnus archive"             docker exec idt-webhook node /app/setup_cygnus.js
sleep 2
run_setup "Keyrock auth"               docker exec -e KEYROCK_URL=http://keyrock:3005 idt-webhook node /app/setup_auth.js

hdr "  Phase 5 — NGSI-LD (Scorpio)"
SCORPIO_READY=false
log "Waiting for Scorpio (may take 90s)..."
for i in $(seq 1 120); do
  curl -sf "http://localhost:9095/q/health" -o /dev/null 2>/dev/null && { ok "Scorpio ready (${i}s)"; SCORPIO_READY=true; break; }
  sleep 1
done

if $SCORPIO_READY; then
  run_setup "NGSI-LD migration"   docker exec -e SCORPIO_URL=http://scorpio:9090 idt-webhook node /app/setup_ngsild.js
  sleep 2
  run_setup "Scorpio live bridge" docker exec -e SCORPIO_URL=http://scorpio:9090 -e WEBHOOK_URL=http://webhook:5050 idt-webhook node /app/setup_scorpio_bridge.js
else
  warn "Scorpio not ready — run manually after startup:"
  warn "  docker exec -e SCORPIO_URL=http://scorpio:9090 idt-webhook node /app/setup_ngsild.js"
  warn "  docker exec -e SCORPIO_URL=http://scorpio:9090 idt-webhook node /app/setup_scorpio_bridge.js"
fi

hdr "  Final status"
show_status

echo -e "\n${BOLD}${GREEN}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║                  Stack is ready!                    ║"
echo "  ╠══════════════════════════════════════════════════════╣"
echo "  ║  Dashboard   →  http://localhost:3000               ║"
echo "  ║  Grafana     →  http://localhost:3001               ║"
echo "  ║  Orion v2    →  http://localhost:1026               ║"
echo "  ║  Scorpio LD  →  http://localhost:9095               ║"
echo "  ║  Keyrock     →  http://localhost:3005               ║"
echo "  ║  CrateDB UI  →  http://localhost:4200               ║"
echo "  ╠══════════════════════════════════════════════════════╣"
echo "  ║  Login: admin@irfane.ma / admin1234                 ║"
echo "  ║  Grafana: admin / irfane2024                        ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "  Frontend:  cd frontend && npm run dev"
echo ""
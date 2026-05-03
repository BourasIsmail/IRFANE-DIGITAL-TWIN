#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  bootstrap.sh — manual setup verification script
#  Run AFTER `docker compose up -d` to verify everything is connected.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ORION="http://localhost:1026"
QL="http://localhost:8668"
CRATE="http://localhost:4200"
SERVICE="irfane"
SERVICEPATH="/smartcity"

HEADERS=(-H "Fiware-Service: $SERVICE" -H "Fiware-ServicePath: $SERVICEPATH")

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Irfane Smart City — FIWARE Stack Health Check"
echo "══════════════════════════════════════════════════════════"

# ─── Service health ────────────────────────────────────────────────────────────
echo ""
echo "▶ Checking Orion Context Broker…"
curl -s "$ORION/version" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✓ Orion', d['orion']['version'])"

echo ""
echo "▶ Checking QuantumLeap…"
curl -s "$QL/version" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✓ QuantumLeap', d.get('version','?'))"

echo ""
echo "▶ Checking CrateDB…"
curl -s "$CRATE" > /dev/null && echo "  ✓ CrateDB admin UI reachable at $CRATE"

# ─── Orion entities ────────────────────────────────────────────────────────────
echo ""
echo "▶ Entities in Orion (Fiware-Service: $SERVICE $SERVICEPATH):"
curl -s "${HEADERS[@]}" "$ORION/v2/entities?options=count&limit=0" \
  -w "  Total entity count: %header{Fiware-Total-Count}\n" -o /dev/null

echo ""
echo "▶ Entity types:"
curl -s "${HEADERS[@]}" "$ORION/v2/types" | \
  python3 -c "import sys,json; [print('  -', t['type'], f\"({t['count']} entities)\") for t in json.load(sys.stdin)]"

# ─── QuantumLeap subscriptions ────────────────────────────────────────────────
echo ""
echo "▶ Active Orion subscriptions:"
curl -s "${HEADERS[@]}" "$ORION/v2/subscriptions" | \
  python3 -c "
import sys, json
subs = json.load(sys.stdin)
for s in subs:
    status = s.get('status','?')
    desc = s.get('description','?')
    url = s['notification']['http']['url']
    count = s['notification'].get('timesSent', 0)
    print(f'  [{status}] {desc} → {url} ({count} notifications sent)')
"

# ─── CrateDB tables ───────────────────────────────────────────────────────────
echo ""
echo "▶ CrateDB tables created by QuantumLeap:"
curl -s -X POST "$CRATE/_sql" \
  -H "Content-Type: application/json" \
  -d "{\"stmt\": \"SHOW TABLES\"}" | \
  python3 -c "
import sys, json
resp = json.load(sys.stdin)
rows = resp.get('rows', [])
if not rows:
    print('  (no tables yet — wait for first tick)')
else:
    for r in rows:
        print('  -', r[0])
"

echo ""
echo "▶ Latest traffic reading (sample):"
curl -s "${HEADERS[@]}" \
  "$QL/v2/entities/TrafficSensor:Irfane:001/attrs/vehicleFlowRate?lastN=1" \
  2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    vals = d.get('attrName', {}).get('values', [])
    idx  = d.get('index', [])
    if vals:
        print(f'  vehicleFlowRate: {vals[-1]} veh/h at {idx[-1]}')
    else:
        print('  (no data yet)')
except:
    print('  (no data yet — wait for a few ticks)')
"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  All checks done."
echo "  CrateDB Admin UI:  http://localhost:4200"
echo "  Orion API:         http://localhost:1026/v2/entities"
echo "  QuantumLeap API:   http://localhost:8668/v2/entities"
echo "══════════════════════════════════════════════════════════"
echo ""
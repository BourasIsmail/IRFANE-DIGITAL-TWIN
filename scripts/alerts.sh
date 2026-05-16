#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  alerts.sh -- Manage Perseo rules and query the webhook alert store
# ─────────────────────────────────────────────────────────────────────────────

PERSEO="http://localhost:9090"
WEBHOOK="http://localhost:5050"
ORION="http://localhost:1026"
SERVICE="irfane"

echo ""
echo "========================================================"
echo "  Irfane Smart City -- Alerts & Rules Manager"
echo "========================================================"

# ── Perseo health ─────────────────────────────────────────────────────────────
echo ""
echo "▶ Perseo version:"
curl -s "$PERSEO/version" | python3 -m json.tool 2>/dev/null || echo "  (not reachable)"

# ── Active rules ──────────────────────────────────────────────────────────────
echo ""
echo "▶ Active Perseo rules:"
curl -s "$PERSEO/rules" | python3 -c "
import sys, json
try:
    rules = json.load(sys.stdin)
    data = rules.get('data', rules) if isinstance(rules, dict) else rules
    if not data:
        print('  (no rules)')
    else:
        for r in data:
            print(f'  [{r.get(\"name\",\"?\")}]')
            print(f'    text:   {r.get(\"text\",\"\")[:80]}...')
            print(f'    action: {r.get(\"action\",{}).get(\"type\",\"?\")} -> {r.get(\"action\",{}).get(\"parameters\",{}).get(\"url\",\"?\")}')
except:
    print('  (parse error)')
"

# ── Orion -> Perseo subscriptions ─────────────────────────────────────────────
echo ""
echo "▶ Orion subscriptions pushing to Perseo:"
curl -s -H "Fiware-Service: $SERVICE" "$ORION/v2/subscriptions" | python3 -c "
import sys, json
subs = json.load(sys.stdin)
perseo = [s for s in subs if 'perseo' in s.get('notification',{}).get('http',{}).get('url','').lower()
          or 'Perseo' in s.get('description','')]
if not perseo:
    print('  (none -- run setup_rules.py first)')
else:
    for s in perseo:
        print(f'  [{s.get(\"status\",\"?\")}] {s.get(\"description\",\"?\")} -- sent:{s.get(\"notification\",{}).get(\"timesSent\",0)}')
"

# ── Alert summary ─────────────────────────────────────────────────────────────
echo ""
echo "▶ Alert summary:"
curl -s "$WEBHOOK/alerts/summary" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(f'  Total alerts: {d.get(\"total\", 0)}')
    print('  By type:')
    for k,v in d.get('by_type',{}).items():
        print(f'    {k}: {v}')
    print('  By severity:')
    for k,v in d.get('by_severity',{}).items():
        print(f'    {k}: {v}')
except:
    print('  (webhook not reachable)')
"

# ── Latest 10 alerts ──────────────────────────────────────────────────────────
echo ""
echo "▶ Latest 10 alerts:"
curl -s "$WEBHOOK/alerts/latest" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    alerts = d.get('alerts', [])[:10]
    if not alerts:
        print('  (no alerts yet)')
    else:
        for a in alerts:
            print(f'  [{a[\"timestamp\"]}] [{a[\"severity\"].upper()}] {a[\"alert_type\"]}')
            print(f'    entity:  {a[\"entity_id\"]}')
            print(f'    message: {a[\"message\"]}')
            print(f'    value:   {a[\"value\"]}')
            print()
except:
    print('  (webhook not reachable)')
"

echo "========================================================"
echo ""
echo "Useful commands:"
echo "  See all alerts:        curl http://localhost:5050/alerts"
echo "  Filter by type:        curl 'http://localhost:5050/alerts?type=traffic_congestion'"
echo "  Filter by severity:    curl 'http://localhost:5050/alerts?severity=critical'"
echo "  Clear alerts:          curl -X DELETE http://localhost:5050/alerts"
echo "  Perseo rules:          curl http://localhost:9090/rules"
echo "  Delete a rule:         curl -X DELETE http://localhost:9090/rules/traffic_congestion_alert"
echo ""
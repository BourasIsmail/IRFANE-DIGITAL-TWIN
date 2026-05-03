#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  queries.sh — useful cURL examples against the running FIWARE stack
# ─────────────────────────────────────────────────────────────────────────────

ORION="http://localhost:1026"
QL="http://localhost:8668"
CRATE="http://localhost:4200"
H1="Fiware-Service: irfane"
H2="Fiware-ServicePath: /smartcity"

echo "=== Real-time: all traffic entities ==="
curl -s -H "$H1" -H "$H2" \
  "$ORION/v2/entities?type=TrafficFlowObserved&options=keyValues" | python3 -m json.tool

echo ""
echo "=== Real-time: tramway positions ==="
curl -s -H "$H1" -H "$H2" \
  "$ORION/v2/entities?type=Vehicle&options=keyValues" | python3 -m json.tool

echo ""
echo "=== Real-time: weather stations ==="
curl -s -H "$H1" -H "$H2" \
  "$ORION/v2/entities?type=WeatherObserved&options=keyValues" | python3 -m json.tool

echo ""
echo "=== Real-time: green spaces ==="
curl -s -H "$H1" -H "$H2" \
  "$ORION/v2/entities?type=GreenSpaceRecord&options=keyValues" | python3 -m json.tool

echo ""
echo "=== Historical: last 10 traffic flow readings (TrafficSensor:Irfane:001) ==="
curl -s -H "$H1" -H "$H2" \
  "$QL/v2/entities/TrafficSensor:Irfane:001/attrs/vehicleFlowRate,averageVehicleSpeed?lastN=10" \
  | python3 -m json.tool

echo ""
echo "=== Historical: last 10 temperature readings (WeatherStation:Irfane:001) ==="
curl -s -H "$H1" -H "$H2" \
  "$QL/v2/entities/WeatherStation:Irfane:001/attrs/temperature,relativeHumidity?lastN=10" \
  | python3 -m json.tool

echo ""
echo "=== Historical: tramway T1:001 last 20 positions ==="
curl -s -H "$H1" -H "$H2" \
  "$QL/v2/entities/Tramway:Rabat:T1:001/attrs/location,speed?lastN=20" \
  | python3 -m json.tool

echo ""
echo "=== CrateDB SQL: average traffic per entity (last 1 hour) ==="
curl -s -X POST "$CRATE/_sql" \
  -H "Content-Type: application/json" \
  -d '{
    "stmt": "SELECT entity_id, AVG(vehicleflowrate) as avg_flow, AVG(averagevehiclespeed) as avg_speed FROM \"irfane\".\"/smartcity\".ettraffic_flow_observed WHERE time_index > NOW() - INTERVAL '\''1'\'' HOUR GROUP BY entity_id ORDER BY avg_flow DESC"
  }' | python3 -m json.tool

echo ""
echo "=== CrateDB SQL: soil moisture trend last 30 minutes ==="
curl -s -X POST "$CRATE/_sql" \
  -H "Content-Type: application/json" \
  -d '{
    "stmt": "SELECT entity_id, time_index, soilmoisture, grassstate FROM \"irfane\".\"/smartcity\".etgreen_space_record WHERE time_index > NOW() - INTERVAL '\''30'\'' MINUTE ORDER BY time_index DESC LIMIT 20"
  }' | python3 -m json.tool
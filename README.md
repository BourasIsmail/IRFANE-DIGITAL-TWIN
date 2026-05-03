# Irfane Smart City Digital Twin — Phase 1
## Sensor Simulation + FIWARE Data Storage

**District:** Irfane, Rabat, Morocco  
**Stack:** 100% FIWARE components + Python simulator  
**Phase:** 1 of 4 — Sensors & Storage

---

## Summary

This project is a **smart city digital twin** for the Irfane district of Rabat, Morocco. It simulates IoT sensor behaviour across four domains — traffic, public transport, weather, and green spaces — and streams live data into a FIWARE stack for both real-time context management and historical time-series storage.

The simulator runs as a Docker container alongside Orion Context Broker, QuantumLeap, and TimescaleDB. Every 5 seconds it generates realistic sensor readings, pushes them to Orion via NGSI-v2, and Orion forwards them automatically to QuantumLeap for time-series archiving. The result is a continuously updating digital replica of the district that can be queried in real-time or historically.

All data is structured according to FIWARE NGSI-v2 Smart Data Models, uses only ASCII-safe characters in attribute values, and follows the `geo:point` format for geographic coordinates — making it fully compatible with Orion Context Broker 3.x.

---

## Architecture

```
+------------------------------------------------------------------+
|               Sensor Simulators (Python)                         |
|  Traffic x4  |  Tramway T1 x2  |  Weather x2  |  GreenSpace x3  |
+------------------------------+-----------------------------------+
                               |
                    NGSI-v2 POST /v2/entities
                    PATCH /v2/entities/{id}/attrs
                               |
                               v
                  +------------------------+
                  |  Orion Context Broker  |  :1026
                  |  (MongoDB backend)     |
                  +----------+-------------+
                             |
                  NGSI-v2 subscription push
                             |
                             v
                  +------------------------+
                  |      QuantumLeap       |  :8668
                  |  (time-series REST)    |
                  +----------+-------------+
                             |
                          SQL INSERT
                             |
                             v
                  +------------------------+
                  |     TimescaleDB        |  :5432
                  |  (PostgreSQL + time-   |
                  |   series extension)    |
                  +------------------------+
```

---

## FIWARE Components

| Component | Image | Port | Role |
|-----------|-------|------|------|
| Orion Context Broker | `fiware/orion:3.10.1` | 1026 | NGSI-v2 real-time context store |
| MongoDB | `mongo:6` | internal | Orion entity persistence |
| QuantumLeap | `fiware/quantum-leap:0.8.3` | 8668 | Time-series historian |
| TimescaleDB | `timescale/timescaledb-ha:pg14-latest` | 5432 | Time-series storage backend |
| Simulator | custom Python 3.12 | — | Sensor simulation engine |

---

## Sensors Simulated

### Traffic Flow — `TrafficFlowObserved`

4 sensors at key Irfane intersections, updating every 5 seconds.

| Entity ID | Location |
|-----------|----------|
| `TrafficSensor:Irfane:001` | Allal Al Fassi - Ibn Sina |
| `TrafficSensor:Irfane:002` | Mehdi Ben Barka - Imam Malik |
| `TrafficSensor:Irfane:003` | Rondpoint Ambassadeurs |
| `TrafficSensor:Irfane:004` | Abderrahim Bouabid - Palestine |

**Attributes:** `vehicleFlowRate` (0-120 veh/h), `averageVehicleSpeed` (10-60 km/h), `congestionLevel` (free / light / moderate / heavy / congested), `occupancy` (0-1), `location`, `dateObserved`

**Simulation model:** Greenshields flow-density relationship. Traffic intensity follows a Moroccan daily schedule — morning peak at 08:00-09:00, evening peak at 16:00-18:00, reduced pattern on Friday and Saturday weekends.

---

### Tramway — `Vehicle`

2 trams running in opposite directions on the real T1 line through Rabat and Sale.

| Entity ID | Direction |
|-----------|-----------|
| `Tramway:Rabat:T1:001` | Hay Karima to Agdal |
| `Tramway:Rabat:T1:002` | Agdal to Hay Karima |

**Real T1 stops simulated:**

```
Hay Karima -> Bab Lamrissa -> Gare Sale Ville -> Pont Hassan II
-> Bab Chellah -> Gare Rabat Ville -> Ibn Sina -> Facultes -> Agdal
```

**Attributes:** `location` (geo:point, updates every tick), `speed` (0-70 km/h), `heading`, `vehicleRunningStatus` (atStop / departing / inTransit), `nextStopName`, `passengerCount` (0-250), `lineName`, `direction`, `dateObserved`

**Simulation model:** Linear interpolation between stop coordinates over a 10-minute loop. Speed follows a proximity-to-stop curve — slows down near stops, accelerates in between.

---

### Weather — `WeatherObserved`

2 weather stations in the Irfane district.

| Entity ID | Location |
|-----------|----------|
| `WeatherStation:Irfane:001` | Parc Irfane Principal |
| `WeatherStation:Irfane:002` | Allal Al Fassi Centre |

**Attributes:** `temperature` (10-35 C), `relativeHumidity` (40-90 %), `windSpeed` (0-40 km/h), `windDirection` (0-360 deg), `uvIndexMax` (0-11), `weatherType` (clear / partly-cloudy / cloudy / fog / windy), `atmosphericPressure` (1000-1025 hPa), `dateObserved`

**Simulation model:** Mediterranean climate for Rabat (latitude 34 N). Temperature follows a sinusoidal daily curve peaking at 15:00. Humidity is inversely correlated with temperature. Wind direction prevails from WSW (Atlantic influence). UV index peaks at solar noon.

---

### Green Spaces — `GreenSpaceRecord`

3 parks and green areas monitored for irrigation management.

| Entity ID | Name | Area |
|-----------|------|------|
| `GreenSpace:Irfane:001` | Jardin Irfane Nord | 12,500 m2 |
| `GreenSpace:Irfane:002` | Square Hay Riad | 4,200 m2 |
| `GreenSpace:Irfane:003` | Bande Verte Ibn Sina | 2,800 m2 |

**Attributes:** `soilMoisture` (20-80 %), `grassCondition` (poor / moderate / good), `ndviIndex` (0.2-0.8), `soilTemperature`, `needsIrrigation` (boolean), `hoursSinceLastIrrigation`, `irrigationActive` (boolean), `dateObserved`

**Simulation model:** Evapotranspiration-based moisture decay. Soil dries faster during hot afternoon hours. Automatic irrigation triggers at 06:00 and 18:00 with 15% probability per tick at those hours, restoring moisture.

---

## NGSI-v2 Formatting Rules

All entities follow strict FIWARE NGSI-v2 conventions enforced in the simulator:

- Every attribute uses the `{"type": "...", "value": "..."}` structure
- Geographic coordinates use `"type": "geo:point"` with `"value": "lat,lon"` string format
- All string values are sanitized — only letters, digits, spaces, underscores, hyphens, and dots are allowed
- No special characters: no parentheses, slashes, arrows, or accented letters in attribute values
- Entity IDs follow the pattern `EntityType:Location:NNN`

---

## File Structure

```
irfane-digital-twin/
├── docker-compose.yml          -- all 5 services + volumes
├── docker-compose.timescale.yml -- TimescaleDB variant (recommended)
├── README.md
├── simulators/
│   ├── Dockerfile              -- Python 3.12-slim image
│   ├── requirements.txt        -- requests==2.31.0
│   ├── entities.py             -- GPS coords, sensor IDs, T1 stops
│   ├── sensors.py              -- 4 simulator classes with realistic models
│   ├── fiware.py               -- Orion + QuantumLeap HTTP client
│   └── main.py                 -- tick loop, startup, ThreadPoolExecutor
└── scripts/
    ├── bootstrap.sh            -- health check after startup
    └── queries.sh              -- ready-made curl examples
```

---

## Key Functions

### `sensors.py`

**`geo_point(lat, lon) -> str`**  
Converts float coordinates to the `"lat,lon"` string format required by Orion's `geo:point` type.

**`sanitize(s) -> str`**  
Strips any character that is not a letter, digit, space, underscore, hyphen, or dot. Applied to every string value before sending to Orion, preventing the `Invalid characters in attribute value` 400 error.

**`traffic_multiplier() -> float`**  
Returns a 0.0-1.0 intensity factor based on the current hour and day of week. Encodes a Moroccan daily traffic pattern with morning/evening peaks on weekdays and a flatter weekend profile (Friday + Saturday).

**`ambient_temperature() -> float`**  
Produces a realistic Rabat temperature using a sinusoidal daily curve between 12 C (05:00) and 28 C (15:00), with Gaussian noise added.

**`TrafficSimulator.generate() -> dict`**  
Generates one `TrafficFlowObserved` NGSI-v2 entity using the Greenshields flow-density model. Vehicle flow drives occupancy and average speed inversely.

**`TramwaySimulator.generate() -> dict`**  
Interpolates the tram's GPS position between T1 stops based on elapsed time. Speed is modulated by proximity to the next stop — decelerating on approach, accelerating after departure.

**`WeatherSimulator.generate() -> dict`**  
Produces correlated weather readings. Humidity drifts with Gaussian noise and is tempered by temperature. Wind direction clusters around 230 degrees (WSW prevailing).

**`GreenSpaceSimulator.generate() -> dict`**  
Models soil moisture depletion via evapotranspiration. Moisture decays faster during hot afternoon hours and is restored by timed irrigation events at 06:00 and 18:00. `grassCondition` and `ndviIndex` are derived directly from moisture level.

---

### `fiware.py`

**`wait_for(url, label)`**  
Polls a service health endpoint with exponential retry until it responds 200. Used at startup to wait for Orion and QuantumLeap to be ready before sending any data.

**`upsert_entity(entity) -> str`**  
Checks if an entity exists in Orion with a GET request. If 404, creates it with POST. If it exists, updates only the attributes with PATCH on `/v2/entities/{id}/attrs`. Returns `"created"` or `"updated"`. Uses three distinct header sets — GET requests must not include `Content-Type`, subscription calls must not include `Fiware-ServicePath`.

**`ensure_ql_subscription(entity_type)`**  
Idempotent — checks existing subscriptions before creating. Creates an Orion subscription that pushes every update of the given entity type to QuantumLeap's `/v2/notify` endpoint. Throttled to 1 notification per second per entity.

**`setup_all_subscriptions(entity_types)`**  
Calls `ensure_ql_subscription` for all four entity types: `TrafficFlowObserved`, `Vehicle`, `WeatherObserved`, `GreenSpaceRecord`.

---

### `main.py`

**`tick()`**  
Runs once every `TICK_INTERVAL_MS` milliseconds. Calls `generate()` on all 11 simulators in parallel using `ThreadPoolExecutor`, then calls `upsert_entity()` for each result. Logs a summary line with created/updated/error counts. Every 12 ticks (~1 minute) logs a sample reading across all sensor types.

**`main()`**  
Startup sequence: wait for Orion, wait for QuantumLeap, set up subscriptions, run first tick, then enter the main loop.

---

## Quick Start

```powershell
# 1. Start the full stack
docker-compose up -d

# 2. Watch simulator logs (wait for "created:11 errors:0")
docker-compose logs -f simulator

# 3. Query real-time data (Windows)
$h = @{"Fiware-Service"="irfane"; "Fiware-ServicePath"="/smartcity"}
(Invoke-WebRequest -Uri "http://localhost:1026/v2/entities?options=keyValues" -Headers $h).Content

# 4. Query historical data
(Invoke-WebRequest -Uri "http://localhost:8668/v2/entities/WeatherStation:Irfane:001/attrs/temperature?lastN=20" -Headers $h).Content
```

Expected simulator output when healthy:
```
[INFO] Tick #1 -- created:11 updated:0 errors:0 [11 entities]
[INFO] Tick #2 -- created:0 updated:11 errors:0 [11 entities]
```

---

## Querying Data

### Real-time — Orion (port 1026)

```powershell
$h = @{"Fiware-Service"="irfane"; "Fiware-ServicePath"="/smartcity"}

# All entities
(Invoke-WebRequest "http://localhost:1026/v2/entities?options=keyValues" -Headers $h).Content

# Traffic only
(Invoke-WebRequest "http://localhost:1026/v2/entities?type=TrafficFlowObserved&options=keyValues" -Headers $h).Content

# Tramway positions
(Invoke-WebRequest "http://localhost:1026/v2/entities?type=Vehicle&options=keyValues" -Headers $h).Content

# Weather
(Invoke-WebRequest "http://localhost:1026/v2/entities?type=WeatherObserved&options=keyValues" -Headers $h).Content

# Green spaces needing irrigation
(Invoke-WebRequest "http://localhost:1026/v2/entities?type=GreenSpaceRecord&q=needsIrrigation==true&options=keyValues" -Headers $h).Content

# Congested intersections
(Invoke-WebRequest "http://localhost:1026/v2/entities?type=TrafficFlowObserved&q=congestionLevel==congested&options=keyValues" -Headers $h).Content
```

### Historical — QuantumLeap (port 8668)

```powershell
$h = @{"Fiware-Service"="irfane"; "Fiware-ServicePath"="/smartcity"}

# Last 20 temperature readings
(Invoke-WebRequest "http://localhost:8668/v2/entities/WeatherStation:Irfane:001/attrs/temperature?lastN=20" -Headers $h).Content

# Last 50 traffic flow readings
(Invoke-WebRequest "http://localhost:8668/v2/entities/TrafficSensor:Irfane:001/attrs/vehicleFlowRate?lastN=50" -Headers $h).Content

# Tramway speed history
(Invoke-WebRequest "http://localhost:8668/v2/entities/Tramway:Rabat:T1:001/attrs/speed?lastN=30" -Headers $h).Content

# Soil moisture history
(Invoke-WebRequest "http://localhost:8668/v2/entities/GreenSpace:Irfane:001/attrs/soilMoisture?lastN=20" -Headers $h).Content
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TICK_INTERVAL_MS` | `5000` | Sensor update interval in milliseconds |
| `FIWARE_SERVICE` | `irfane` | NGSI-v2 multi-tenancy service name |
| `FIWARE_SERVICEPATH` | `/smartcity` | NGSI-v2 service path |
| `LOG_LEVEL` | `info` | Python logging level |
| `ORION_URL` | `http://orion:1026` | Orion Context Broker URL |
| `QL_URL` | `http://quantumleap:8668` | QuantumLeap URL |

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Done | Sensors + FIWARE storage (Orion + QuantumLeap + TimescaleDB) |
| 2 | Next | Notifications and alerting (congestion, low moisture, heat alerts) |
| 3 | Planned | Authentication — Keyrock IDM + Wilma PEP proxy |
| 4 | Planned | Next.js dashboard — real-time map + historical charts |

---

## Troubleshooting

**Simulator keeps restarting**  
QuantumLeap takes 20-30 seconds to initialize. The simulator retries automatically up to 20 times with 4-second delays. Wait for it to settle.

**`400 Invalid characters in attribute value` from Orion**  
A string value contains a forbidden character. The `sanitize()` function in `sensors.py` prevents this. If it recurs, check that no f-string is injecting external data with special characters.

**`400 Orion accepts no payload for GET`**  
The `Content-Type` header must not be sent on GET or DELETE requests to Orion 3.x. The `GET_HEADERS` dict in `fiware.py` omits it.

**`400 Bad Request` on subscriptions**  
Orion 3.x rejects `Fiware-ServicePath` on the `/v2/subscriptions` endpoint. The `SUB_POST_HEADERS` dict in `fiware.py` omits the service path header.

**No historical data in QuantumLeap**  
Check that subscriptions were created: run the Orion subscriptions query and verify `timesSent > 0`. If zero, QuantumLeap may not have been healthy when subscriptions were created — restart the simulator with `docker-compose restart simulator`.

**Full wipe and restart**  
```powershell
docker-compose down -v
docker-compose build --no-cache simulator
docker-compose up -d
```# IRFANE-DIGITAL-TWIN

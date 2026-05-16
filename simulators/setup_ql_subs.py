"""
setup_ql_subs.py — Create Orion → QuantumLeap subscriptions for all entity types
Run once after stack starts: docker exec idt-simulator python /app/setup_ql_subs.py
"""

import os, time, requests, logging

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("setup_ql_subs")

ORION_URL  = os.getenv("ORION_URL",  "http://orion:1026")
QL_URL     = os.getenv("QL_URL",     "http://quantumleap:8668")
SERVICE    = os.getenv("FIWARE_SERVICE",     "irfane")
SPATH      = os.getenv("FIWARE_SERVICEPATH", "/smartcity")

HEADERS_GET  = {"Fiware-Service": SERVICE, "Fiware-ServicePath": SPATH}
HEADERS_POST = {**HEADERS_GET, "Content-Type": "application/json"}

ENTITY_TYPES = [
    # (type, attrs_to_track)
    ("TrafficFlowObserved",        ["vehicleFlowRate", "averageVehicleSpeed", "congestionLevel", "occupancy"]),
    ("Vehicle",                    ["speed", "vehicleRunningStatus", "passengerCount", "location", "nextStopName"]),
    ("WeatherObserved",            ["temperature", "relativeHumidity", "windSpeed", "windDirection", "atmosphericPressure", "weatherType"]),
    ("GreenSpaceRecord",           ["soilMoisture", "grassCondition", "ndviIndex", "soilTemperature", "needsIrrigation"]),
    ("OffStreetParking",           ["availableSpotNumber", "occupiedSpotNumber", "occupancyRate", "status"]),
    ("AirQualityObserved",         ["pm25", "pm10", "no2", "co", "o3", "airQualityIndex"]),
    ("NoisePollutionObserved",     ["noiseLevel", "noisePeak", "noiseAverage", "noiseCategory"]),
    ("StreetlightControlCabinet",  ["powerState", "intensity", "activeLamps", "energyConsumed", "powerFactor"]),
]

def wait_for_service(url, name, retries=20, delay=5):
    for i in range(retries):
        try:
            r = requests.get(url, timeout=5)
            if r.status_code < 500:
                log.info(f"{name} is ready")
                return True
        except Exception:
            pass
        log.warning(f"{name} not ready ({i+1}/{retries}), retrying in {delay}s...")
        time.sleep(delay)
    raise RuntimeError(f"{name} did not become ready")

def delete_existing_ql_subs():
    try:
        r = requests.get(f"{ORION_URL}/v2/subscriptions", headers=HEADERS_GET, timeout=10)
        subs = r.json()
        ql_subs = [s for s in subs if "quantumleap" in s.get("notification", {}).get("http", {}).get("url", "").lower()
                   or s.get("description", "").startswith("QL_")]
        for sub in ql_subs:
            requests.delete(f"{ORION_URL}/v2/subscriptions/{sub['id']}", headers=HEADERS_GET, timeout=5)
            log.info(f"Deleted old QL subscription: {sub['id']} ({sub.get('description','')})")
    except Exception as e:
        log.warning(f"Could not clean old subscriptions: {e}")

def create_ql_subscription(entity_type, attrs):
    desc = f"QL_{entity_type}"

    # Check if already exists
    try:
        r = requests.get(f"{ORION_URL}/v2/subscriptions", headers=HEADERS_GET, timeout=10)
        if any(s.get("description") == desc for s in r.json()):
            log.info(f"Subscription already exists: {desc}")
            return
    except Exception:
        pass

    sub = {
        "description": desc,
        "subject": {
            "entities": [{"idPattern": ".*", "type": entity_type}],
            "condition": {"attrs": attrs},
        },
        "notification": {
            "http": {"url": f"{QL_URL}/v2/notify"},
            "attrs": attrs,
            "metadata": ["dateCreated", "dateModified"],
        },
        "throttling": 1,
    }

    try:
        r = requests.post(f"{ORION_URL}/v2/subscriptions", json=sub, headers=HEADERS_POST, timeout=10)
        if r.status_code == 201:
            log.info(f"✓ Created QL subscription for {entity_type} (tracking {len(attrs)} attrs)")
        else:
            log.error(f"Failed {entity_type}: {r.status_code} {r.text}")
    except Exception as e:
        log.error(f"Error creating subscription for {entity_type}: {e}")

def main():
    log.info("=" * 55)
    log.info("  Irfane Smart City — QuantumLeap Subscription Setup")
    log.info("=" * 55)

    wait_for_service(f"{ORION_URL}/version",     "Orion")
    wait_for_service(f"{QL_URL}/version",         "QuantumLeap")

    log.info("Cleaning old QL subscriptions...")
    delete_existing_ql_subs()

    log.info(f"Creating subscriptions for {len(ENTITY_TYPES)} entity types...")
    for entity_type, attrs in ENTITY_TYPES:
        create_ql_subscription(entity_type, attrs)
        time.sleep(0.5)

    # Summary
    try:
        r = requests.get(f"{ORION_URL}/v2/subscriptions", headers=HEADERS_GET, timeout=10)
        ql_subs = [s for s in r.json() if s.get("description", "").startswith("QL_")]
        log.info("=" * 55)
        log.info(f"  {len(ql_subs)} QuantumLeap subscriptions active")
        log.info(f"  Tracking {len(ENTITY_TYPES)} entity types")
        log.info(f"  QL endpoint: {QL_URL}/v2/notify")
        log.info(f"  CrateDB UI:  http://localhost:4200")
        log.info("=" * 55)
    except Exception:
        pass

if __name__ == "__main__":
    main()
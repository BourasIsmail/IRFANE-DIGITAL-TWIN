"""
IoT Agent device provisioning.
Registers each sensor as a device in the IoT Agent JSON so it
knows how to map incoming MQTT messages to Orion NGSI-v2 entities.

Run once at startup. Idempotent -- safe to re-run.
"""

import os
import time
import logging
import requests

IOTA_URL    = os.getenv("IOTA_URL",          "http://localhost:4041")
ORION_URL   = os.getenv("ORION_URL",         "http://localhost:1026")
SERVICE     = os.getenv("FIWARE_SERVICE",     "irfane")
SERVICEPATH = os.getenv("FIWARE_SERVICEPATH", "/smartcity")
MQTT_APIKEY = os.getenv("MQTT_APIKEY",       "irfane2024")

HEADERS = {
    "Content-Type":       "application/json",
    "Fiware-Service":     SERVICE,
    "Fiware-ServicePath": SERVICEPATH,
}

log = logging.getLogger("provisioning")


def wait_for_iota(retries=20, delay=4.0):
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(f"{IOTA_URL}/iot/about", timeout=5)
            r.raise_for_status()
            log.info("IoT Agent is ready.")
            return
        except Exception as e:
            log.warning(f"IoT Agent not ready ({attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(delay)
    raise RuntimeError("IoT Agent did not become ready.")


def provision_service_group():
    """Register the service group (API key + MQTT config)."""
    r = requests.get(f"{IOTA_URL}/iot/services", headers=HEADERS, timeout=5)
    if r.ok:
        groups = r.json().get("services", [])
        if any(g.get("apikey") == MQTT_APIKEY for g in groups):
            log.info("Service group already provisioned.")
            return

    payload = {
        "services": [{
            "apikey":      MQTT_APIKEY,
            "cbroker":     ORION_URL,
            "entity_type": "Thing",
            "resource":    "/iot/json",
        }]
    }
    r = requests.post(f"{IOTA_URL}/iot/services", json=payload, headers=HEADERS, timeout=5)
    if r.ok:
        log.info("Service group provisioned.")
    else:
        log.error(f"Service group failed: {r.status_code} {r.text}")


def provision_device(device_id, entity_id, entity_type, attributes):
    """Register one device with the IoT Agent."""
    # Check if already exists
    r = requests.get(f"{IOTA_URL}/iot/devices/{device_id}", headers=HEADERS, timeout=5)
    if r.status_code == 200:
        log.info(f"Device already provisioned: {device_id}")
        return

    device = {
        "device_id":   device_id,
        "entity_name": entity_id,
        "entity_type": entity_type,
        "protocol":    "PDI-IoTA-JSON",
        "transport":   "MQTT",
        "attributes":  attributes,
    }
    r = requests.post(
        f"{IOTA_URL}/iot/devices",
        json={"devices": [device]},
        headers=HEADERS,
        timeout=5,
    )
    if r.ok:
        log.info(f"Provisioned: {device_id} -> {entity_id} ({entity_type})")
    else:
        log.error(f"Failed to provision {device_id}: {r.status_code} {r.text}")


def provision_all(traffic_sensors, tramway_vehicles, weather_sensors, green_space_sensors):
    """Provision all sensor devices in the IoT Agent."""
    wait_for_iota()
    provision_service_group()

    # Traffic sensors
    for s in traffic_sensors:
        provision_device(
            device_id=s["id"],
            entity_id=s["id"],
            entity_type="TrafficFlowObserved",
            attributes=[
                {"object_id": "vehicleFlowRate",     "name": "vehicleFlowRate",     "type": "Number"},
                {"object_id": "averageVehicleSpeed", "name": "averageVehicleSpeed", "type": "Number"},
                {"object_id": "congestionLevel",     "name": "congestionLevel",     "type": "Text"},
                {"object_id": "occupancy",           "name": "occupancy",           "type": "Number"},
                {"object_id": "location",            "name": "location",            "type": "geo:point"},
                {"object_id": "name",                "name": "name",                "type": "Text"},
                {"object_id": "dateObserved",        "name": "dateObserved",        "type": "DateTime"},
            ],
        )

    # Tramway vehicles
    for v in tramway_vehicles:
        provision_device(
            device_id=v["id"],
            entity_id=v["id"],
            entity_type="Vehicle",
            attributes=[
                {"object_id": "location",             "name": "location",             "type": "geo:point"},
                {"object_id": "speed",                "name": "speed",                "type": "Number"},
                {"object_id": "heading",              "name": "heading",              "type": "Number"},
                {"object_id": "vehicleRunningStatus", "name": "vehicleRunningStatus", "type": "Text"},
                {"object_id": "nextStopName",         "name": "nextStopName",         "type": "Text"},
                {"object_id": "lineName",             "name": "lineName",             "type": "Text"},
                {"object_id": "direction",            "name": "direction",            "type": "Text"},
                {"object_id": "passengerCount",       "name": "passengerCount",       "type": "Number"},
                {"object_id": "serviceStatus",        "name": "serviceStatus",        "type": "Text"},
                {"object_id": "dateObserved",         "name": "dateObserved",         "type": "DateTime"},
            ],
        )

    # Weather stations
    for s in weather_sensors:
        provision_device(
            device_id=s["id"],
            entity_id=s["id"],
            entity_type="WeatherObserved",
            attributes=[
                {"object_id": "temperature",         "name": "temperature",         "type": "Number"},
                {"object_id": "relativeHumidity",    "name": "relativeHumidity",    "type": "Number"},
                {"object_id": "windSpeed",           "name": "windSpeed",           "type": "Number"},
                {"object_id": "windDirection",       "name": "windDirection",       "type": "Number"},
                {"object_id": "uvIndexMax",          "name": "uvIndexMax",          "type": "Number"},
                {"object_id": "weatherType",         "name": "weatherType",         "type": "Text"},
                {"object_id": "atmosphericPressure", "name": "atmosphericPressure", "type": "Number"},
                {"object_id": "location",            "name": "location",            "type": "geo:point"},
                {"object_id": "name",                "name": "name",                "type": "Text"},
                {"object_id": "dateObserved",        "name": "dateObserved",        "type": "DateTime"},
            ],
        )

    # Green spaces
    for s in green_space_sensors:
        provision_device(
            device_id=s["id"],
            entity_id=s["id"],
            entity_type="GreenSpaceRecord",
            attributes=[
                {"object_id": "soilMoisture",             "name": "soilMoisture",             "type": "Number"},
                {"object_id": "grassCondition",           "name": "grassCondition",           "type": "Text"},
                {"object_id": "ndviIndex",                "name": "ndviIndex",                "type": "Number"},
                {"object_id": "soilTemperature",          "name": "soilTemperature",          "type": "Number"},
                {"object_id": "needsIrrigation",          "name": "needsIrrigation",          "type": "Boolean"},
                {"object_id": "hoursSinceLastIrrigation", "name": "hoursSinceLastIrrigation", "type": "Number"},
                {"object_id": "irrigationActive",         "name": "irrigationActive",         "type": "Boolean"},
                {"object_id": "areaServed",               "name": "areaServed",               "type": "Number"},
                {"object_id": "location",                 "name": "location",                 "type": "geo:point"},
                {"object_id": "name",                     "name": "name",                     "type": "Text"},
                {"object_id": "dateObserved",             "name": "dateObserved",             "type": "DateTime"},
            ],
        )

    log.info(f"Provisioned {len(traffic_sensors) + len(tramway_vehicles) + len(weather_sensors) + len(green_space_sensors)} devices.")

def provision_all(traffic_sensors, tramway_vehicles, weather_sensors, green_space_sensors,
                  parking_lots=None, air_quality_stations=None, noise_sensors=None, lighting_cabinets=None):
    """Provision all sensor devices — extended version with new sensor types."""
    wait_for_iota()
    provision_service_group()

    for s in traffic_sensors:
        provision_device(s["id"], s["id"], "TrafficFlowObserved", [
            {"object_id": "vehicleFlowRate",     "name": "vehicleFlowRate",     "type": "Number"},
            {"object_id": "averageVehicleSpeed", "name": "averageVehicleSpeed", "type": "Number"},
            {"object_id": "congestionLevel",     "name": "congestionLevel",     "type": "Text"},
            {"object_id": "occupancy",           "name": "occupancy",           "type": "Number"},
            {"object_id": "location",            "name": "location",            "type": "geo:point"},
            {"object_id": "name",                "name": "name",                "type": "Text"},
            {"object_id": "dateObserved",        "name": "dateObserved",        "type": "DateTime"},
        ])

    for v in tramway_vehicles:
        provision_device(v["id"], v["id"], "Vehicle", [
            {"object_id": "location",             "name": "location",             "type": "geo:point"},
            {"object_id": "speed",                "name": "speed",                "type": "Number"},
            {"object_id": "heading",              "name": "heading",              "type": "Number"},
            {"object_id": "vehicleRunningStatus", "name": "vehicleRunningStatus", "type": "Text"},
            {"object_id": "nextStopName",         "name": "nextStopName",         "type": "Text"},
            {"object_id": "lineName",             "name": "lineName",             "type": "Text"},
            {"object_id": "direction",            "name": "direction",            "type": "Text"},
            {"object_id": "passengerCount",       "name": "passengerCount",       "type": "Number"},
            {"object_id": "serviceStatus",        "name": "serviceStatus",        "type": "Text"},
            {"object_id": "dateObserved",         "name": "dateObserved",         "type": "DateTime"},
        ])

    for s in weather_sensors:
        provision_device(s["id"], s["id"], "WeatherObserved", [
            {"object_id": "temperature",         "name": "temperature",         "type": "Number"},
            {"object_id": "relativeHumidity",    "name": "relativeHumidity",    "type": "Number"},
            {"object_id": "windSpeed",           "name": "windSpeed",           "type": "Number"},
            {"object_id": "windDirection",       "name": "windDirection",       "type": "Number"},
            {"object_id": "uvIndexMax",          "name": "uvIndexMax",          "type": "Number"},
            {"object_id": "weatherType",         "name": "weatherType",         "type": "Text"},
            {"object_id": "atmosphericPressure", "name": "atmosphericPressure", "type": "Number"},
            {"object_id": "location",            "name": "location",            "type": "geo:point"},
            {"object_id": "name",                "name": "name",                "type": "Text"},
            {"object_id": "dateObserved",        "name": "dateObserved",        "type": "DateTime"},
        ])

    for s in green_space_sensors:
        provision_device(s["id"], s["id"], "GreenSpaceRecord", [
            {"object_id": "soilMoisture",             "name": "soilMoisture",             "type": "Number"},
            {"object_id": "grassCondition",           "name": "grassCondition",           "type": "Text"},
            {"object_id": "ndviIndex",                "name": "ndviIndex",                "type": "Number"},
            {"object_id": "soilTemperature",          "name": "soilTemperature",          "type": "Number"},
            {"object_id": "needsIrrigation",          "name": "needsIrrigation",          "type": "Boolean"},
            {"object_id": "hoursSinceLastIrrigation", "name": "hoursSinceLastIrrigation", "type": "Number"},
            {"object_id": "irrigationActive",         "name": "irrigationActive",         "type": "Boolean"},
            {"object_id": "areaServed",               "name": "areaServed",               "type": "Number"},
            {"object_id": "location",                 "name": "location",                 "type": "geo:point"},
            {"object_id": "name",                     "name": "name",                     "type": "Text"},
            {"object_id": "dateObserved",             "name": "dateObserved",             "type": "DateTime"},
        ])

    for p in (parking_lots or []):
        provision_device(p["id"], p["id"], "OffStreetParking", [
            {"object_id": "name",                "name": "name",                "type": "Text"},
            {"object_id": "totalSpotNumber",     "name": "totalSpotNumber",     "type": "Number"},
            {"object_id": "availableSpotNumber", "name": "availableSpotNumber", "type": "Number"},
            {"object_id": "occupiedSpotNumber",  "name": "occupiedSpotNumber",  "type": "Number"},
            {"object_id": "occupancyRate",       "name": "occupancyRate",       "type": "Number"},
            {"object_id": "status",              "name": "status",              "type": "Text"},
            {"object_id": "location",            "name": "location",            "type": "geo:point"},
            {"object_id": "dateObserved",        "name": "dateObserved",        "type": "DateTime"},
        ])

    for s in (air_quality_stations or []):
        provision_device(s["id"], s["id"], "AirQualityObserved", [
            {"object_id": "name",              "name": "name",              "type": "Text"},
            {"object_id": "pm25",              "name": "pm25",              "type": "Number"},
            {"object_id": "pm10",              "name": "pm10",              "type": "Number"},
            {"object_id": "no2",               "name": "no2",               "type": "Number"},
            {"object_id": "co",                "name": "co",                "type": "Number"},
            {"object_id": "o3",                "name": "o3",                "type": "Number"},
            {"object_id": "airQualityIndex",   "name": "airQualityIndex",   "type": "Text"},
            {"object_id": "location",          "name": "location",          "type": "geo:point"},
            {"object_id": "dateObserved",      "name": "dateObserved",      "type": "DateTime"},
        ])

    for s in (noise_sensors or []):
        provision_device(s["id"], s["id"], "NoisePollutionObserved", [
            {"object_id": "name",           "name": "name",           "type": "Text"},
            {"object_id": "noiseLevel",     "name": "noiseLevel",     "type": "Number"},
            {"object_id": "noisePeak",      "name": "noisePeak",      "type": "Number"},
            {"object_id": "noiseAverage",   "name": "noiseAverage",   "type": "Number"},
            {"object_id": "noiseCategory",  "name": "noiseCategory",  "type": "Text"},
            {"object_id": "location",       "name": "location",       "type": "geo:point"},
            {"object_id": "dateObserved",   "name": "dateObserved",   "type": "DateTime"},
        ])

    for c in (lighting_cabinets or []):
        provision_device(c["id"], c["id"], "StreetlightControlCabinet", [
            {"object_id": "name",          "name": "name",          "type": "Text"},
            {"object_id": "powerState",    "name": "powerState",    "type": "Text"},
            {"object_id": "intensity",     "name": "intensity",     "type": "Number"},
            {"object_id": "activeLamps",   "name": "activeLamps",   "type": "Number"},
            {"object_id": "totalLamps",    "name": "totalLamps",    "type": "Number"},
            {"object_id": "energyConsumed","name": "energyConsumed","type": "Number"},
            {"object_id": "powerFactor",   "name": "powerFactor",   "type": "Number"},
            {"object_id": "location",      "name": "location",      "type": "geo:point"},
            {"object_id": "dateObserved",  "name": "dateObserved",  "type": "DateTime"},
        ])

    total = sum(len(x or []) for x in [
        traffic_sensors, tramway_vehicles, weather_sensors, green_space_sensors,
        parking_lots, air_quality_stations, noise_sensors, lighting_cabinets
    ])
    log.info(f"Provisioned {total} devices.")
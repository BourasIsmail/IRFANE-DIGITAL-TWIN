"""
Sensor simulation models -- Irfane district, Rabat.
Publishes flat JSON to MQTT topics consumed by IoT Agent JSON.

MQTT topic pattern: /<apikey>/<entity_id>/attrs
Payload: flat JSON with raw values only -- no NGSI-v2 wrapping.
"""

import math
import random
import time
import re
from datetime import datetime, timezone
from entities import T1_STOPS


# ── helpers ───────────────────────────────────────────────────────────────────

def gauss(mean, sigma):
    return random.gauss(mean, sigma)

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def sanitize(s):
    return re.sub(r'[^a-zA-Z0-9 _.\-]', '', s)

def hour_of_day():
    return datetime.now().hour

def is_weekend():
    return datetime.now().weekday() in (4, 5)

def traffic_multiplier():
    h = hour_of_day()
    if is_weekend():
        if h < 8:  return 0.15
        if h < 14: return 0.45
        if h < 20: return 0.35
        return 0.20
    if h < 6:  return 0.05
    if h < 8:  return 0.05 + (h - 6) * 0.25
    if h < 9:  return 0.80
    if h < 12: return 0.60
    if h < 14: return 0.70
    if h < 16: return 0.50
    if h < 18: return 0.90
    if h < 21: return 0.60
    return 0.20

def ambient_temperature():
    h = hour_of_day()
    daily_min, daily_max = 12.0, 28.0
    base = daily_min + (daily_max - daily_min) * math.sin(math.pi * (h - 5) / 18)
    return clamp(gauss(base, 1.0), 10.0, 35.0)


# ── Traffic ───────────────────────────────────────────────────────────────────

CONGESTION_LEVELS = [
    (20,  "free"),
    (50,  "light"),
    (80,  "moderate"),
    (100, "heavy"),
    (999, "congested"),
]

class TrafficSimulator:
    def __init__(self, sensor):
        self.sensor = sensor

    def entity_id(self):
        return self.sensor["id"]

    def entity_type(self):
        return "TrafficFlowObserved"

    def generate(self):
        """Returns flat dict -- no NGSI-v2 wrapping."""
        mult = traffic_multiplier()
        flow = int(clamp(gauss(mult * 100, 12), 0, 120))
        speed = clamp(gauss(50, 3) * (1 - flow / 140), 10.0, 60.0)
        occupancy = clamp(flow / 120, 0.0, 1.0)
        congestion = next(label for threshold, label in CONGESTION_LEVELS if flow < threshold)

        return {
            "vehicleFlowRate":     flow,
            "averageVehicleSpeed": round(speed, 1),
            "congestionLevel":     congestion,
            "occupancy":           round(occupancy, 3),
            "location":            f"{self.sensor['lat']},{self.sensor['lon']}",
            "name":                sanitize(self.sensor["name"]),
            "dateObserved":        now_iso(),
        }


# ── Tramway ───────────────────────────────────────────────────────────────────

LOOP_SECONDS = 600

class TramwaySimulator:
    def __init__(self, vehicle):
        self.vehicle = vehicle
        offset = 0 if vehicle["forward"] else LOOP_SECONDS / 2
        self._start = time.time() - offset

    def entity_id(self):
        return self.vehicle["id"]

    def entity_type(self):
        return "Vehicle"

    def _interpolate(self, fraction):
        stops = T1_STOPS if self.vehicle["forward"] else list(reversed(T1_STOPS))
        n = len(stops) - 1
        seg = min(int(fraction * n), n - 1)
        t = fraction * n - seg
        a, b = stops[seg], stops[seg + 1]
        lat = a["lat"] + (b["lat"] - a["lat"]) * t
        lon = a["lon"] + (b["lon"] - a["lon"]) * t
        return lat, lon, b["name"]

    def generate(self):
        elapsed = time.time() - self._start
        fraction = (elapsed % LOOP_SECONDS) / LOOP_SECONDS
        lat, lon, next_stop = self._interpolate(fraction)

        stop_proximity = abs((fraction * (len(T1_STOPS) - 1)) % 1 - 0.5) * 2
        speed = clamp(gauss(60 * stop_proximity, 3), 0.0, 70.0)

        if speed < 3:    status = "atStop"
        elif speed < 15: status = "departing"
        else:            status = "inTransit"

        return {
            "location":            f"{round(lat, 6)},{round(lon, 6)}",
            "speed":               round(speed, 1),
            "heading":             145 if self.vehicle["forward"] else 325,
            "vehicleRunningStatus":status,
            "nextStopName":        sanitize(next_stop),
            "lineName":            self.vehicle["line"],
            "direction":           sanitize(self.vehicle["direction"]),
            "passengerCount":      int(clamp(gauss(80 * traffic_multiplier(), 20), 0, 250)),
            "serviceStatus":       "normal",
            "dateObserved":        now_iso(),
        }


# ── Weather ───────────────────────────────────────────────────────────────────

class WeatherSimulator:
    def __init__(self, sensor):
        self.sensor = sensor
        self._humidity = gauss(62, 5)

    def entity_id(self):
        return self.sensor["id"]

    def entity_type(self):
        return "WeatherObserved"

    def generate(self):
        temp = ambient_temperature()
        self._humidity = clamp(self._humidity + gauss(0, 1.5), 40.0, 90.0)
        humidity = clamp(self._humidity - (temp - 20) * 0.3, 40.0, 90.0)
        wind_speed = clamp(gauss(14, 4), 0.0, 40.0)
        wind_dir = int(clamp(gauss(230, 25), 0, 360))
        h = hour_of_day()
        uv = int(clamp(gauss(7 if 10 <= h <= 15 else 1, 0.5), 0, 11))
        pressure = clamp(gauss(1013, 3), 1000.0, 1025.0)

        if humidity > 85:     condition = "fog"
        elif wind_speed > 30: condition = "windy"
        elif temp > 28:       condition = "clear"
        elif h < 6 or h > 21: condition = "clear"
        else:                 condition = "partly-cloudy"

        return {
            "temperature":         round(temp, 1),
            "relativeHumidity":    round(humidity, 1),
            "windSpeed":           round(wind_speed, 1),
            "windDirection":       wind_dir,
            "uvIndexMax":          uv,
            "weatherType":         condition,
            "atmosphericPressure": round(pressure, 1),
            "location":            f"{self.sensor['lat']},{self.sensor['lon']}",
            "name":                sanitize(self.sensor["name"]),
            "dateObserved":        now_iso(),
        }


# ── Green space ───────────────────────────────────────────────────────────────

class GreenSpaceSimulator:
    def __init__(self, sensor):
        self.sensor = sensor
        self._moisture = clamp(gauss(55, 10), 20.0, 80.0)
        self._last_irrigation = time.time() - random.uniform(0, 28800)

    def entity_id(self):
        return self.sensor["id"]

    def entity_type(self):
        return "GreenSpaceRecord"

    def generate(self):
        temp = ambient_temperature()
        h = hour_of_day()

        irrigating = (h in (6, 18)) and random.random() < 0.15
        if irrigating:
            self._moisture = clamp(self._moisture + gauss(20, 5), 20.0, 80.0)
            self._last_irrigation = time.time()
        else:
            dry_rate = (0.4 if temp > 25 else 0.15) + (0.3 if 10 <= h <= 17 else 0)
            self._moisture = clamp(self._moisture - gauss(dry_rate, 0.05), 20.0, 80.0)

        m = round(self._moisture, 1)
        if m > 55:   condition = "good"
        elif m > 35: condition = "moderate"
        else:        condition = "poor"

        ndvi = clamp(0.2 + 0.6 * ((m - 20) / 60), 0.2, 0.8)
        hours_since = round((time.time() - self._last_irrigation) / 3600, 1)

        return {
            "soilMoisture":             m,
            "grassCondition":           condition,
            "ndviIndex":                round(ndvi, 3),
            "soilTemperature":          round(clamp(temp * 0.85 + gauss(0, 0.5), 8.0, 35.0), 1),
            "needsIrrigation":          m < 30,
            "hoursSinceLastIrrigation": hours_since,
            "irrigationActive":         irrigating,
            "areaServed":               self.sensor["area_m2"],
            "location":                 f"{self.sensor['lat']},{self.sensor['lon']}",
            "name":                     sanitize(self.sensor["name"]),
            "dateObserved":             now_iso(),
        }
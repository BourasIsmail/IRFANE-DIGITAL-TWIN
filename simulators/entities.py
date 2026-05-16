"""
Entity definitions -- Irfane district, Rabat
All strings: letters, numbers, space, underscore, hyphen, dot only.
Geo format: "lat,lon" string (geo:point) as required by Orion.
"""

TRAFFIC_SENSORS = [
    {"id": "TrafficSensor:Irfane:001", "name": "Allal Al Fassi Ibn Sina",       "lat": 33.9882, "lon": -6.8490},
    {"id": "TrafficSensor:Irfane:002", "name": "Mehdi Ben Barka Imam Malik",     "lat": 33.9850, "lon": -6.8530},
    {"id": "TrafficSensor:Irfane:003", "name": "Rondpoint Ambassadeurs",         "lat": 33.9830, "lon": -6.8470},
    {"id": "TrafficSensor:Irfane:004", "name": "Abderrahim Bouabid Palestine",   "lat": 33.9900, "lon": -6.8510},
]

T1_STOPS = [
    {"name": "Hay Karima",       "lat": 34.0400, "lon": -6.7700},
    {"name": "Bab Lamrissa",     "lat": 34.0370, "lon": -6.8160},
    {"name": "Gare Sale Ville",  "lat": 34.0375, "lon": -6.8340},
    {"name": "Pont Hassan II",   "lat": 34.0295, "lon": -6.8355},
    {"name": "Bab Chellah",      "lat": 34.0228, "lon": -6.8330},
    {"name": "Gare Rabat Ville", "lat": 34.0205, "lon": -6.8335},
    {"name": "Ibn Sina",         "lat": 33.9905, "lon": -6.8520},
    {"name": "Facultes",         "lat": 33.9890, "lon": -6.8540},
    {"name": "Agdal",            "lat": 33.9940, "lon": -6.8600},
]

TRAMWAY_VEHICLES = [
    {"id": "Tramway:Rabat:T1:001", "line": "T1", "direction": "Hay Karima to Agdal", "forward": True},
    {"id": "Tramway:Rabat:T1:002", "line": "T1", "direction": "Agdal to Hay Karima", "forward": False},
]

WEATHER_SENSORS = [
    {"id": "WeatherStation:Irfane:001", "name": "Parc Irfane Principal",    "lat": 33.9870, "lon": -6.8510},
    {"id": "WeatherStation:Irfane:002", "name": "Allal Al Fassi Centre",    "lat": 33.9855, "lon": -6.8475},
]

GREEN_SPACE_SENSORS = [
    {"id": "GreenSpace:Irfane:001", "name": "Jardin Irfane Nord",    "lat": 33.9880, "lon": -6.8515, "area_m2": 12500},
    {"id": "GreenSpace:Irfane:002", "name": "Square Hay Riad",       "lat": 33.9830, "lon": -6.8460, "area_m2": 4200},
    {"id": "GreenSpace:Irfane:003", "name": "Bande Verte Ibn Sina",  "lat": 33.9900, "lon": -6.8540, "area_m2": 2800},
]

# ── Parking lots ──────────────────────────────────────────────────────────────
PARKING_LOTS = [
    {"id": "Parking:Irfane:001", "name": "Parking Allal Al Fassi",     "lat": 33.9878, "lon": -6.8488, "capacity": 120},
    {"id": "Parking:Irfane:002", "name": "Parking Ibn Sina",           "lat": 33.9902, "lon": -6.8525, "capacity": 80},
    {"id": "Parking:Irfane:003", "name": "Parking Hay Riad Centre",    "lat": 33.9835, "lon": -6.8462, "capacity": 200},
    {"id": "Parking:Irfane:004", "name": "Parking Ambassadeurs",       "lat": 33.9832, "lon": -6.8470, "capacity": 60},
]

# ── Air quality stations ──────────────────────────────────────────────────────
AIR_QUALITY_STATIONS = [
    {"id": "AirQuality:Irfane:001", "name": "Station Irfane Centre", "lat": 33.9875, "lon": -6.8510},
    {"id": "AirQuality:Irfane:002", "name": "Station Ibn Sina",      "lat": 33.9905, "lon": -6.8518},
]

# ── Noise sensors ─────────────────────────────────────────────────────────────
NOISE_SENSORS = [
    {"id": "Noise:Irfane:001", "name": "Zone Commerciale Allal Al Fassi", "lat": 33.9882, "lon": -6.8490},
    {"id": "Noise:Irfane:002", "name": "Zone Residuelle Hay Riad",         "lat": 33.9845, "lon": -6.8468},
    {"id": "Noise:Irfane:003", "name": "Zone Ibn Sina Carrefour",          "lat": 33.9900, "lon": -6.8522},
]

# ── Street lighting cabinets ──────────────────────────────────────────────────
LIGHTING_CABINETS = [
    {"id": "Lighting:Irfane:001", "name": "Cabinet Allal Al Fassi Nord", "lat": 33.9890, "lon": -6.8495, "poles": 12},
    {"id": "Lighting:Irfane:002", "name": "Cabinet Ibn Sina Sud",         "lat": 33.9895, "lon": -6.8530, "poles": 8},
    {"id": "Lighting:Irfane:003", "name": "Cabinet Ambassadeurs Est",     "lat": 33.9828, "lon": -6.8465, "poles": 15},
    {"id": "Lighting:Irfane:004", "name": "Cabinet Hay Riad Ouest",       "lat": 33.9840, "lon": -6.8450, "poles": 10},
    {"id": "Lighting:Irfane:005", "name": "Cabinet Parc Irfane",          "lat": 33.9882, "lon": -6.8512, "poles": 6},
    {"id": "Lighting:Irfane:006", "name": "Cabinet Centre Commercial",    "lat": 33.9870, "lon": -6.8480, "poles": 20},
]
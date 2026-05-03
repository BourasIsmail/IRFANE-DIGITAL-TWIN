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
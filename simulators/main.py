"""
Irfane Smart City Digital Twin -- Sensor Simulator
===================================================
Publishes 23 sensor readings to Mosquitto MQTT broker every TICK seconds.
"""

import os, time, logging, concurrent.futures, signal

from entities import (TRAFFIC_SENSORS, TRAMWAY_VEHICLES, WEATHER_SENSORS,
                      GREEN_SPACE_SENSORS, PARKING_LOTS, AIR_QUALITY_STATIONS,
                      NOISE_SENSORS, LIGHTING_CABINETS)
from sensors  import (TrafficSimulator, TramwaySimulator, WeatherSimulator,
                      GreenSpaceSimulator, ParkingSimulator, AirQualitySimulator,
                      NoiseSimulator, LightingSimulator)
from mqtt_client      import MQTTPublisher
from iot_provisioning import provision_all

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="[%(asctime)s] %(levelname)-5s %(name)s -- %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("main")
TICK = float(os.getenv("TICK_INTERVAL_MS", "5000")) / 1000

# Build all simulators
traffic_sims  = [TrafficSimulator(s)  for s in TRAFFIC_SENSORS]
tram_sims     = [TramwaySimulator(v)  for v in TRAMWAY_VEHICLES]
weather_sims  = [WeatherSimulator(s)  for s in WEATHER_SENSORS]
green_sims    = [GreenSpaceSimulator(s) for s in GREEN_SPACE_SENSORS]
parking_sims  = [ParkingSimulator(p)  for p in PARKING_LOTS]
airq_sims     = [AirQualitySimulator(s) for s in AIR_QUALITY_STATIONS]
noise_sims    = [NoiseSimulator(s)    for s in NOISE_SENSORS]
lighting_sims = [LightingSimulator(c) for c in LIGHTING_CABINETS]

ALL_SIMS = (traffic_sims + tram_sims + weather_sims + green_sims +
            parking_sims + airq_sims + noise_sims + lighting_sims)

publisher  = MQTTPublisher()
tick_count = 0
total_errs = 0

def run_sim(sim):
    payload = sim.generate()
    topic   = publisher.publish(sim.entity_id(), payload)
    return sim.entity_id(), topic

def tick():
    global tick_count, total_errs
    tick_count += 1
    published = errors = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(ALL_SIMS)) as pool:
        futures = {pool.submit(run_sim, sim): sim for sim in ALL_SIMS}
        for fut in concurrent.futures.as_completed(futures):
            try:
                fut.result(); published += 1
            except Exception as e:
                errors += 1; total_errs += 1
                log.error(f"Publish failed: {e}")

    log.info(f"Tick #{tick_count} -- published:{published} errors:{errors} "
             f"[total errors:{total_errs}] [{len(ALL_SIMS)} sensors]")

    if tick_count % 12 == 0:
        tf = traffic_sims[0].generate()
        we = weather_sims[0].generate()
        pk = parking_sims[0].generate()
        aq = airq_sims[0].generate()
        log.info(f"[sample] Traffic:{tf['vehicleFlowRate']} veh/h | "
                 f"Temp:{we['temperature']}°C | "
                 f"Parking:{pk['availableSpotNumber']}/{pk['totalSpotNumber']} free | "
                 f"PM2.5:{aq['pm25']} µg/m³")

def main():
    log.info("=" * 60)
    log.info(f"  Irfane Smart City -- Simulator ({len(ALL_SIMS)} sensors)")
    log.info("=" * 60)

    log.info("Provisioning devices in IoT Agent...")
    provision_all(TRAFFIC_SENSORS, TRAMWAY_VEHICLES, WEATHER_SENSORS, GREEN_SPACE_SENSORS,
                  PARKING_LOTS, AIR_QUALITY_STATIONS, NOISE_SENSORS, LIGHTING_CABINETS)

    log.info("Connecting to MQTT broker...")
    publisher.connect()

    log.info("Running first tick...")
    tick()

    log.info(f"Simulation loop started (every {TICK}s)...")
    while True:
        time.sleep(TICK)
        tick()

def _shutdown(sig, frame):
    log.info("Shutting down...")
    publisher.disconnect()
    raise SystemExit(0)

signal.signal(signal.SIGTERM, _shutdown)
signal.signal(signal.SIGINT,  _shutdown)

if __name__ == "__main__":
    main()
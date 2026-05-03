"""
Irfane Smart City Digital Twin -- Sensor Simulator
===================================================
Publishes sensor readings to Mosquitto MQTT broker every TICK seconds.
IoT Agent JSON subscribes, translates to NGSI-v2, and forwards to Orion.
Orion pushes to QuantumLeap (time-series) and Perseo (alerts).
"""

import os
import time
import logging
import concurrent.futures

from entities import TRAFFIC_SENSORS, TRAMWAY_VEHICLES, WEATHER_SENSORS, GREEN_SPACE_SENSORS
from sensors   import TrafficSimulator, TramwaySimulator, WeatherSimulator, GreenSpaceSimulator
from mqtt_client      import MQTTPublisher
from iot_provisioning import provision_all

# ── logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="[%(asctime)s] %(levelname)-5s %(name)s -- %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("main")

TICK = float(os.getenv("TICK_INTERVAL_MS", "5000")) / 1000

# ── simulators ────────────────────────────────────────────────────────────────
traffic_sims = [TrafficSimulator(s) for s in TRAFFIC_SENSORS]
tram_sims    = [TramwaySimulator(v) for v in TRAMWAY_VEHICLES]
weather_sims = [WeatherSimulator(s) for s in WEATHER_SENSORS]
green_sims   = [GreenSpaceSimulator(s) for s in GREEN_SPACE_SENSORS]
ALL_SIMS     = traffic_sims + tram_sims + weather_sims + green_sims

# ── MQTT publisher ────────────────────────────────────────────────────────────
publisher = MQTTPublisher()

# ── tick ──────────────────────────────────────────────────────────────────────
tick_count   = 0
total_errors = 0

def run_sim(sim):
    payload = sim.generate()
    topic   = publisher.publish(sim.entity_id(), payload)
    return sim.entity_id(), topic

def tick():
    global tick_count, total_errors
    tick_count += 1
    published = errors = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(ALL_SIMS)) as pool:
        futures = {pool.submit(run_sim, sim): sim for sim in ALL_SIMS}
        for fut in concurrent.futures.as_completed(futures):
            try:
                eid, topic = fut.result()
                published += 1
                if tick_count == 1:
                    log.debug(f"Published {eid} -> {topic}")
            except Exception as e:
                errors += 1
                total_errors += 1
                log.error(f"Publish failed: {e}")

    log.info(
        f"Tick #{tick_count} -- published:{published} errors:{errors} "
        f"[total errors:{total_errors}] [{len(ALL_SIMS)} sensors]"
    )

    # Sample log every 12 ticks
    if tick_count % 12 == 0:
        tf = traffic_sims[0].generate()
        tr = tram_sims[0].generate()
        we = weather_sims[0].generate()
        gr = green_sims[0].generate()
        log.info(
            f"[sample] Traffic:{tf['vehicleFlowRate']} veh/h ({tf['congestionLevel']}) | "
            f"Tram:{tr['speed']} km/h -> {tr['nextStopName']} | "
            f"Temp:{we['temperature']}C humidity:{we['relativeHumidity']}% | "
            f"Grass:{gr['grassCondition']} moisture:{gr['soilMoisture']}%"
        )

# ── startup ───────────────────────────────────────────────────────────────────
def main():
    log.info("=" * 58)
    log.info("  Irfane Smart City -- Sensor Simulator (MQTT mode)")
    log.info(f"  Tick: {TICK}s | Sensors: {len(ALL_SIMS)} total")
    log.info("  Flow: Python -> MQTT -> IoT Agent -> Orion -> QL/Perseo")
    log.info("=" * 58)

    # 1. Provision devices in IoT Agent
    log.info("Provisioning devices in IoT Agent JSON...")
    provision_all(TRAFFIC_SENSORS, TRAMWAY_VEHICLES, WEATHER_SENSORS, GREEN_SPACE_SENSORS)

    # 2. Connect to MQTT broker
    log.info("Connecting to MQTT broker...")
    publisher.connect()

    # 3. Run first tick
    log.info("Running first tick...")
    tick()

    # 4. Loop
    log.info(f"Simulation loop started (every {TICK}s)...")
    while True:
        time.sleep(TICK)
        tick()

process_signals = True
import signal
def _shutdown(sig, frame):
    log.info("Shutting down...")
    publisher.disconnect()
    raise SystemExit(0)

signal.signal(signal.SIGTERM, _shutdown)
signal.signal(signal.SIGINT,  _shutdown)

if __name__ == "__main__":
    main()
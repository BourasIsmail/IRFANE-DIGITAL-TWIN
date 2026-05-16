"use strict";

/**
 * setup_rules.js
 * ==============
 * Registers all Perseo CEP alert rules and Orion subscriptions.
 *
 * Run once after the stack is up:
 *   node setup_rules.js
 * Or via Docker:
 *   docker exec idt-webhook node /app/setup_rules.js
 */

const axios = require("axios");

const ORION_URL   = process.env.ORION_URL   || "http://localhost:1026"
const PERSEO_URL  = process.env.PERSEO_URL  || "http://localhost:9090"
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://webhook:5050"
const SERVICE     = process.env.FIWARE_SERVICE     || "irfane";
const SERVICEPATH = process.env.FIWARE_SERVICEPATH || "/smartcity";

const GET_HEADERS = { "Fiware-Service": SERVICE };
const SUB_HEADERS = { "Content-Type": "application/json", "Fiware-Service": SERVICE };

function ts() { return new Date().toTimeString().slice(0, 8); }
const log = {
  info:  (...a) => console.log(`[${ts()}] INFO `, ...a),
  warn:  (...a) => console.warn(`[${ts()}] WARN `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
};

// ── retry helper ──────────────────────────────────────────────────────────────

async function waitFor(url, label, retries = 15, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await axios.get(url, { timeout: 5000 });
      log.info(`${label} is ready.`);
      return;
    } catch (e) {
      log.warn(`${label} not ready (${i}/${retries}): ${e.message}`);
      if (i < retries) await sleep(delayMs);
    }
  }
  throw new Error(`${label} failed to become ready.`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Perseo rule helpers ───────────────────────────────────────────────────────

/**
 * Build the HTTP action body that Perseo POSTs to the webhook.
 * Template variables like ${id} are resolved by Perseo at runtime.
 */
function webhookAction(alertType, entityType, message) {
  return {
    type: "post",
    template: JSON.stringify({
      alert_type:  alertType,
      entity_id:   "${id}",
      entity_type: entityType,
      value:       "${value}",
      message,
    }),
    parameters: {
      url: `${WEBHOOK_URL}/alert`,
    },
  };
}

async function createRule(name, text, action) {
  // Delete first (idempotent)
  try { await axios.delete(`${PERSEO_URL}/rules/${name}`, { timeout: 5000 }); } catch (_) {}

  try {
    await axios.post(
      `${PERSEO_URL}/rules`,
      { name, text, action },
      { headers: { "Content-Type": "application/json" }, timeout: 5000 }
    );
    log.info(`Rule created: ${name}`);
  } catch (e) {
    const msg = e.response ? `${e.response.status} ${JSON.stringify(e.response.data)}` : e.message;
    log.error(`Rule failed: ${name} -- ${msg}`);
  }
}

// ── Orion subscription helpers ────────────────────────────────────────────────

async function createPerseoSubscription(entityType, attrs) {
  const desc = `Perseo_sub_${entityType}`;

  // Check if already exists
  try {
    const r = await axios.get(`${ORION_URL}/v2/subscriptions`, { headers: GET_HEADERS, timeout: 5000 });
    if (r.data.some(s => s.description === desc)) {
      log.info(`Perseo subscription for ${entityType} already exists.`);
      return;
    }
  } catch (_) {}

  const sub = {
    description: desc,
    subject: {
      entities:  [{ idPattern: ".*", type: entityType }],
      condition: { attrs },
    },
    notification: {
      http:     { url: `${PERSEO_URL}/notices` },
      attrs,
      metadata: ["dateModified"],
    },
    throttling: 2,
  };

  try {
    const r = await axios.post(`${ORION_URL}/v2/subscriptions`, sub, { headers: SUB_HEADERS, timeout: 5000 });
    log.info(`Perseo subscription created for ${entityType}: ${r.headers.location}`);
  } catch (e) {
    const msg = e.response ? `${e.response.status} ${JSON.stringify(e.response.data)}` : e.message;
    log.error(`Subscription failed for ${entityType}: ${msg}`);
  }
}

// ── Rule definitions ──────────────────────────────────────────────────────────

async function setupTrafficRules() {
  log.info("Setting up traffic rules...");

  // Congested intersection
  await createRule(
    "traffic_congestion_alert",
    `select *,"TrafficFlowObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="TrafficFlowObserved" and ` +
    `cast(cast(ev.congestionLevel?,String),String)="congested")]`,
    webhookAction("traffic_congestion", "TrafficFlowObserved", "Intersection is congested")
  );

  // High flow > 90 veh/h
  await createRule(
    "traffic_high_flow_alert",
    `select *,"TrafficFlowObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="TrafficFlowObserved" and ` +
    `cast(cast(ev.vehicleFlowRate?,double),double)>90)]`,
    webhookAction("traffic_high_flow", "TrafficFlowObserved", "Vehicle flow above 90 veh/h")
  );
}

async function setupWeatherRules() {
  log.info("Setting up weather rules...");

  // High temperature > 32 C
  await createRule(
    "high_temperature_alert",
    `select *,"WeatherObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="WeatherObserved" and ` +
    `cast(cast(ev.temperature?,double),double)>32)]`,
    webhookAction("high_temperature", "WeatherObserved", "Temperature above 32 degrees Celsius")
  );

  // Low humidity < 45%
  await createRule(
    "low_humidity_alert",
    `select *,"WeatherObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="WeatherObserved" and ` +
    `cast(cast(ev.relativeHumidity?,double),double)<45)]`,
    webhookAction("low_humidity", "WeatherObserved", "Relative humidity below 45 percent")
  );
}

async function setupGreenSpaceRules() {
  log.info("Setting up green space rules...");

  // Soil moisture < 30%
  await createRule(
    "irrigation_needed_alert",
    `select *,"GreenSpaceRecord" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="GreenSpaceRecord" and ` +
    `cast(cast(ev.soilMoisture?,double),double)<30)]`,
    webhookAction("irrigation_needed", "GreenSpaceRecord", "Soil moisture below 30 percent - irrigation required")
  );

  // Grass in poor condition
  await createRule(
    "grass_poor_condition_alert",
    `select *,"GreenSpaceRecord" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="GreenSpaceRecord" and ` +
    `cast(cast(ev.grassCondition?,String),String)="poor")]`,
    webhookAction("grass_poor", "GreenSpaceRecord", "Grass condition is poor - urgent attention needed")
  );
}

async function setupTramwayRules() {
  log.info("Setting up tramway rules...");

  // Tram stopped outside a station
  await createRule(
    "tram_stopped_alert",
    `select *,"Vehicle" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="Vehicle" and ` +
    `cast(cast(ev.speed?,double),double)<1 and ` +
    `cast(cast(ev.vehicleRunningStatus?,String),String)!="atStop")]`,
    webhookAction("tram_stopped", "Vehicle", "Tram appears stopped outside of a station")
  );
}

async function setupSubscriptions() {
  log.info("Setting up Orion -> Perseo subscriptions...");
  await createPerseoSubscription("TrafficFlowObserved", ["vehicleFlowRate", "congestionLevel", "averageVehicleSpeed"]);
  await createPerseoSubscription("WeatherObserved",     ["temperature", "relativeHumidity", "windSpeed"]);
  await createPerseoSubscription("GreenSpaceRecord",    ["soilMoisture", "grassCondition", "needsIrrigation"]);
  await createPerseoSubscription("Vehicle",             ["speed", "vehicleRunningStatus", "passengerCount"]);
  await createPerseoSubscription("OffStreetParking",    ["availableSpotNumber", "status"]);
  await createPerseoSubscription("AirQualityObserved",  ["pm25", "no2", "airQualityIndex"]);
  await createPerseoSubscription("NoisePollutionObserved", ["noiseLevel"]);
}


async function setupParkingRules() {
  log.info("Setting up parking rules...");

  // Parking lot full
  await createRule(
    "parking_full_alert",
    `select *,"OffStreetParking" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="OffStreetParking" and ` +
    `cast(cast(ev.availableSpotNumber?,double),double)<1)]`,
    webhookAction("parking_full", "OffStreetParking", "Parking lot is completely full")
  );

  // Parking almost full (< 10 spots)
  await createRule(
    "parking_almost_full_alert",
    `select *,"OffStreetParking" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="OffStreetParking" and ` +
    `cast(cast(ev.availableSpotNumber?,double),double)<10)]`,
    webhookAction("parking_almost_full", "OffStreetParking", "Parking lot almost full - fewer than 10 spots")
  );
}

async function setupAirQualityRules() {
  log.info("Setting up air quality rules...");

  // High PM2.5
  await createRule(
    "high_pm25_alert",
    `select *,"AirQualityObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="AirQualityObserved" and ` +
    `cast(cast(ev.pm25?,double),double)>35)]`,
    webhookAction("high_pm25", "AirQualityObserved", "PM2.5 above 35 µg/m³ - unhealthy for sensitive groups")
  );

  // High NO2
  await createRule(
    "high_no2_alert",
    `select *,"AirQualityObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="AirQualityObserved" and ` +
    `cast(cast(ev.no2?,double),double)>100)]`,
    webhookAction("high_no2", "AirQualityObserved", "NO2 above 100 µg/m³")
  );
}

async function setupNoiseRules() {
  log.info("Setting up noise rules...");

  // High noise level
  await createRule(
    "high_noise_alert",
    `select *,"NoisePollutionObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="NoisePollutionObserved" and ` +
    `cast(cast(ev.noiseLevel?,double),double)>70)]`,
    webhookAction("high_noise", "NoisePollutionObserved", "Noise level above 70 dB")
  );
}

async function setupWindRules() {
  log.info("Setting up wind speed rules...");

  // High wind speed
  await createRule(
    "high_wind_alert",
    `select *,"WeatherObserved" as entityType ` +
    `from pattern [every ev=iotEvent(` +
    `type="WeatherObserved" and ` +
    `cast(cast(ev.windSpeed?,double),double)>35)]`,
    webhookAction("high_wind", "WeatherObserved", "Wind speed above 35 km/h")
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  log.info("═".repeat(52));
  log.info("  Irfane Smart City -- Perseo Rules Setup");
  log.info("═".repeat(52));

  await waitFor(`${ORION_URL}/version`,        "Orion");
  await waitFor(`${PERSEO_URL}/version`,       "Perseo");
  await waitFor(`${WEBHOOK_URL}/health`,       "Webhook receiver");

  await setupSubscriptions();
  await setupTrafficRules();
  await setupWeatherRules();
  await setupGreenSpaceRules();
  await setupTramwayRules();
  await setupParkingRules();
  await setupAirQualityRules();
  await setupNoiseRules();
  await setupWindRules();

  // Print summary
  try {
    const rules = await axios.get(`${PERSEO_URL}/rules`, { timeout: 5000 });
    const data  = rules.data?.data || rules.data || [];
    log.info(`Done. ${Array.isArray(data) ? data.length : "?"} rules active in Perseo.`);
  } catch (_) {}

  log.info("═".repeat(52));
  log.info(`  Alert webhook:  http://webhook:5050/alerts`);
  log.info(`  Perseo rules:   http://perseo-fe:9090/rules`);
  log.info("═".repeat(52));
}

main().catch(e => { log.error(`Fatal: ${e.message}`); process.exit(1); });
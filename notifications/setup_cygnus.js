"use strict";

/**
 * setup_cygnus.js
 * ===============
 * Creates Orion subscriptions that push all entity updates to Cygnus,
 * which archives them to PostgreSQL.
 *
 * Run once after the stack is up:
 *   docker exec idt-webhook node /app/setup_cygnus.js
 */

const axios = require("axios");

const ORION_URL   = process.env.ORION_URL   || "http://orion:1026";
const CYGNUS_URL  = process.env.CYGNUS_URL  || "http://cygnus:5055";
const SERVICE     = process.env.FIWARE_SERVICE     || "irfane";
const SERVICEPATH = process.env.FIWARE_SERVICEPATH || "/smartcity";

const GET_HEADERS = { "Fiware-Service": SERVICE };
const SUB_HEADERS = { "Content-Type": "application/json", "Fiware-Service": SERVICE };

function ts() { return new Date().toTimeString().slice(0, 8); }
const log = {
  info:  (...a) => console.log(`[${ts()}] INFO `, ...a),
  ok:    (...a) => console.log(`[${ts()}] OK   `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
  warn:  (...a) => console.warn(`[${ts()}] WARN `, ...a),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── helpers ───────────────────────────────────────────────────────────────────

async function waitFor(url, label, retries = 15, delay = 4000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await axios.get(url, { timeout: 5000 });
      log.info(`${label} is ready.`);
      return;
    } catch (e) {
      log.warn(`${label} not ready (${i}/${retries}): ${e.message}`);
      if (i < retries) await sleep(delay);
    }
  }
  throw new Error(`${label} failed to become ready.`);
}

async function deleteExistingCygnusSubs() {
  try {
    const r = await axios.get(`${ORION_URL}/v2/subscriptions`, {
      headers: GET_HEADERS, timeout: 5000
    });
    const cygnusSubs = r.data.filter(s =>
      s.notification?.http?.url?.includes('cygnus') ||
      s.description?.startsWith('Cygnus_')
    );
    for (const sub of cygnusSubs) {
      await axios.delete(`${ORION_URL}/v2/subscriptions/${sub.id}`, {
        headers: GET_HEADERS, timeout: 5000
      });
      log.info(`Deleted old subscription: ${sub.id} (${sub.description})`);
    }
  } catch (e) {
    log.warn(`Could not clean old subscriptions: ${e.message}`);
  }
}

async function createCygnusSubscription(entityType, attrs = []) {
  const desc = `Cygnus_${entityType}`;

  // Check if already exists
  try {
    const r = await axios.get(`${ORION_URL}/v2/subscriptions`, {
      headers: GET_HEADERS, timeout: 5000
    });
    if (r.data.some(s => s.description === desc)) {
      log.info(`Cygnus subscription already exists for ${entityType}`);
      return;
    }
  } catch (_) {}

  const sub = {
    description: desc,
    subject: {
      entities:  [{ idPattern: ".*", type: entityType }],
      condition: { attrs: attrs.length ? attrs : [] },
    },
    notification: {
      http:     { url: `${CYGNUS_URL}/notify` },
      attrs:    attrs,
      metadata: ["dateCreated", "dateModified"],
    },
    throttling: 5,
  };

  try {
    const r = await axios.post(
      `${ORION_URL}/v2/subscriptions`,
      sub,
      { headers: SUB_HEADERS, timeout: 5000 }
    );
    log.ok(`Cygnus subscription created for ${entityType}: ${r.headers.location}`);
  } catch (e) {
    const msg = e.response ? `${e.response.status} ${JSON.stringify(e.response.data)}` : e.message;
    log.error(`Subscription failed for ${entityType}: ${msg}`);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  "TrafficFlowObserved",
  "Vehicle",
  "WeatherObserved",
  "GreenSpaceRecord",
  "OffStreetParking",
  "AirQualityObserved",
  "NoisePollutionObserved",
  "StreetlightControlCabinet",
];

async function main() {
  log.info("═".repeat(52));
  log.info("  Irfane Smart City -- Cygnus Archive Setup");
  log.info("═".repeat(52));

  await waitFor(`${ORION_URL}/version`,        "Orion");
  const CYGNUS_MGMT = CYGNUS_URL.replace('5055', '5080');
  await waitFor(`${CYGNUS_MGMT}/v1/version`, "Cygnus");

  log.info("Cleaning old Cygnus subscriptions...");
  await deleteExistingCygnusSubs();

  log.info("Creating Cygnus subscriptions for all entity types...");
  for (const type of ENTITY_TYPES) {
    await createCygnusSubscription(type);
    await sleep(500);
  }

  // Summary
  const r = await axios.get(`${ORION_URL}/v2/subscriptions`, {
    headers: GET_HEADERS, timeout: 5000
  });
  const cygnusSubs = r.data.filter(s => s.description?.startsWith('Cygnus_'));

  log.info("═".repeat(52));
  log.info(`  ${cygnusSubs.length} Cygnus subscriptions active`);
  log.info("  Data archiving to PostgreSQL:");
  log.info("  Host: localhost:5433");
  log.info("  DB:   irfane_archive");
  log.info("  User: cygnus / cygnus");
  log.info("");
  log.info("  Query archive data:");
  log.info("  docker exec idt-postgres psql -U cygnus -d irfane_archive");
  log.info("  SELECT * FROM irfane_smartcity.trafficflowobserved LIMIT 10;");
  log.info("═".repeat(52));
}

main().catch(e => { log.error(`Fatal: ${e.message}`); process.exit(1); });
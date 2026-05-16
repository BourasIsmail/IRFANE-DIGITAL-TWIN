'use strict';

/**
 * setup_scorpio_bridge.js
 * =======================
 * Creates Orion v2 subscriptions that forward all entity updates
 * to a bridge endpoint which converts NGSI-v2 → NGSI-LD and
 * upserts into Scorpio in real-time.
 *
 * Architecture:
 *   Orion v2 → (subscription) → webhook /bridge → Scorpio NGSI-LD
 *
 * Run once: docker exec idt-webhook node /app/setup_scorpio_bridge.js
 */

const axios = require('axios');

const ORION   = process.env.ORION_URL    || 'http://orion:1026';
const WEBHOOK = process.env.WEBHOOK_URL  || 'http://webhook:5050';
const SERVICE = process.env.FIWARE_SERVICE     || 'irfane';
const SPATH   = process.env.FIWARE_SERVICEPATH || '/smartcity';

const H_GET  = { 'Fiware-Service': SERVICE, 'Fiware-ServicePath': SPATH };
const H_POST = { ...H_GET, 'Content-Type': 'application/json' };

function ts() { return new Date().toTimeString().slice(0, 8); }
const log = {
  info:  (...a) => console.log(`[${ts()}] INFO `, ...a),
  ok:    (...a) => console.log(`[${ts()}] OK   `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
  warn:  (...a) => console.warn(`[${ts()}] WARN `, ...a),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const ENTITY_TYPES = [
  'TrafficFlowObserved', 'Vehicle', 'WeatherObserved', 'GreenSpaceRecord',
  'OffStreetParking', 'AirQualityObserved', 'NoisePollutionObserved', 'StreetlightControlCabinet',
];

async function deleteOldBridgeSubs() {
  try {
    const r = await axios.get(`${ORION}/v2/subscriptions`, { headers: H_GET, timeout: 10000 });
    const old = r.data.filter(s => s.description?.startsWith('Bridge_'));
    for (const sub of old) {
      await axios.delete(`${ORION}/v2/subscriptions/${sub.id}`, { headers: H_GET, timeout: 5000 });
      log.info(`Deleted old bridge subscription: ${sub.id}`);
    }
  } catch (e) {
    log.warn(`Could not clean old subscriptions: ${e.message}`);
  }
}

async function createBridgeSubscription(entityType) {
  const desc = `Bridge_${entityType}`;

  // Check if exists
  try {
    const r = await axios.get(`${ORION}/v2/subscriptions`, { headers: H_GET, timeout: 10000 });
    if (r.data.some(s => s.description === desc)) {
      log.info(`Bridge subscription already exists: ${desc}`);
      return;
    }
  } catch (_) {}

  const sub = {
    description: desc,
    subject: {
      entities: [{ idPattern: '.*', type: entityType }],
      condition: { attrs: [] },
    },
    notification: {
      http: { url: `${WEBHOOK}/scorpio-bridge` },
      attrsFormat: 'normalized',
      metadata: ['dateCreated', 'dateModified'],
    },
    throttling: 5,
  };

  try {
    const r = await axios.post(`${ORION}/v2/subscriptions`, sub, { headers: H_POST, timeout: 10000 });
    log.ok(`Bridge subscription created for ${entityType}: ${r.headers.location}`);
  } catch (e) {
    log.error(`Failed ${entityType}: ${e.response?.status} ${e.message}`);
  }
}

async function main() {
  log.info('═'.repeat(55));
  log.info('  Irfane Smart City — Orion→Scorpio Bridge Setup');
  log.info('═'.repeat(55));

  // Wait for Orion
  for (let i = 1; i <= 15; i++) {
    try {
      await axios.get(`${ORION}/version`, { timeout: 5000 });
      log.info('Orion is ready');
      break;
    } catch (_) {
      log.warn(`Orion not ready (${i}/15)`);
      await sleep(3000);
    }
  }

  log.info('Cleaning old bridge subscriptions...');
  await deleteOldBridgeSubs();

  log.info(`Creating bridge subscriptions for ${ENTITY_TYPES.length} entity types...`);
  for (const type of ENTITY_TYPES) {
    await createBridgeSubscription(type);
    await sleep(300);
  }

  // Summary
  const r = await axios.get(`${ORION}/v2/subscriptions`, { headers: H_GET, timeout: 10000 });
  const bridgeSubs = r.data.filter(s => s.description?.startsWith('Bridge_'));

  log.info('═'.repeat(55));
  log.ok(`${bridgeSubs.length} bridge subscriptions active`);
  log.info('');
  log.info('Data flow:');
  log.info('  Sensor → MQTT → IoT Agent → Orion v2');
  log.info('  Orion v2 → /bridge → Scorpio NGSI-LD');
  log.info('');
  log.info('Scorpio stays in sync automatically every 5s per sensor');
  log.info('Query live NGSI-LD: http://localhost:9095/ngsi-ld/v1/entities/?type=TrafficFlowObserved');
  log.info('═'.repeat(55));
}

main().catch(e => { log.error('Fatal:', e.message); process.exit(1); });
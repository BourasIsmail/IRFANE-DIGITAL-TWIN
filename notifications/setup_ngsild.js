#!/usr/bin/env node
/**
 * setup_ngsild.js
 * ===============
 * Migrates Irfane smart city entities from NGSI-v2 (Orion) to NGSI-LD (Scorpio).
 *
 * NGSI-LD adds:
 *   - Linked data context (@context) for semantic interoperability
 *   - Relationships between entities (tram stop → route → city)
 *   - Property of property (observation metadata)
 *   - EU DTPR / FIWARE data space compliance
 *
 * Run: docker exec idt-webhook node /app/setup_ngsild.js
 */

'use strict';

const axios = require('axios');

const ORION_V2   = process.env.ORION_URL    || 'http://orion:1026';
const SCORPIO    = process.env.SCORPIO_URL  || 'http://scorpio:9090';
const SERVICE    = process.env.FIWARE_SERVICE     || 'irfane';
const SPATH      = process.env.FIWARE_SERVICEPATH || '/smartcity';

const V2_HEADERS = { 'Fiware-Service': SERVICE, 'Fiware-ServicePath': SPATH };
const LD_HEADERS = {
  'Content-Type': 'application/ld+json',
  'Accept':       'application/ld+json',
};

// Smart Data Models @context — semantic definitions for all entity types
const CONTEXT = [
  'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld',
  'https://smartdatamodels.org/context.jsonld',
];

function ts() { return new Date().toTimeString().slice(0, 8); }
const log = {
  info:  (...a) => console.log(`[${ts()}] INFO `, ...a),
  ok:    (...a) => console.log(`[${ts()}] OK   `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
  warn:  (...a) => console.warn(`[${ts()}] WARN `, ...a),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Convert NGSI-v2 entity to NGSI-LD format ─────────────────────────────────

function v2ToLD(entity) {
  const ld = {
    '@context': CONTEXT,
    id: `urn:ngsi-ld:${entity.type}:${entity.id.replace(/:/g, '-')}`,
    type: entity.type,
  };

  for (const [key, val] of Object.entries(entity)) {
    if (['id', 'type'].includes(key)) continue;

    if (typeof val === 'object' && val !== null) {
      // Already NGSI-v2 attribute object
      const attrVal = val.value ?? val;
      const attrType = val.type ?? 'Property';

      if (attrType === 'geo:point') {
        // Convert geo:point "lat,lon" to GeoJSON
        const [lat, lon] = String(attrVal).split(',').map(Number);
        ld[key] = {
          type: 'GeoProperty',
          value: { type: 'Point', coordinates: [lon, lat] },
        };
      } else if (typeof attrVal === 'number') {
        ld[key] = {
          type: 'Property',
          value: attrVal,
          observedAt: entity.dateObserved?.value || new Date().toISOString(),
        };
      } else if (typeof attrVal === 'boolean') {
        ld[key] = { type: 'Property', value: attrVal };
      } else {
        ld[key] = { type: 'Property', value: String(attrVal) };
      }
    } else {
      ld[key] = { type: 'Property', value: val };
    }
  }

  return ld;
}

// ── Add semantic relationships ────────────────────────────────────────────────

function addRelationships(ldEntity, entityType) {
  const districtId = 'urn:ngsi-ld:District:Irfane-Rabat';

  // All entities belong to the Irfane district
  ldEntity.locatedIn = {
    type: 'Relationship',
    object: districtId,
  };

  if (entityType === 'Vehicle') {
    ldEntity.operatedBy = {
      type: 'Relationship',
      object: 'urn:ngsi-ld:TransportOperator:STAREO-Rabat',
    };
    ldEntity.hasRoute = {
      type: 'Relationship',
      object: 'urn:ngsi-ld:TransportRoute:T1-Rabat',
    };
  }

  if (entityType === 'TrafficFlowObserved') {
    ldEntity.monitoredArea = {
      type: 'Relationship',
      object: districtId,
    };
  }

  if (entityType === 'GreenSpaceRecord') {
    ldEntity.managedBy = {
      type: 'Relationship',
      object: 'urn:ngsi-ld:Organization:Commune-Rabat',
    };
  }

  return ldEntity;
}

// ── Create District entity ────────────────────────────────────────────────────

async function createDistrictEntity() {
  const district = {
    '@context': CONTEXT,
    id: 'urn:ngsi-ld:District:Irfane-Rabat',
    type: 'District',
    name: { type: 'Property', value: 'Irfane' },
    description: { type: 'Property', value: 'Quartier Irfane, Rabat, Morocco' },
    location: {
      type: 'GeoProperty',
      value: {
        type: 'Polygon',
        coordinates: [[
          [-6.845, 33.980], [-6.860, 33.980],
          [-6.860, 33.995], [-6.845, 33.995],
          [-6.845, 33.980],
        ]],
      },
    },
    population: { type: 'Property', value: 45000 },
    area: { type: 'Property', value: 4.2, unitCode: 'KMK' },
    country: { type: 'Property', value: 'Morocco' },
    city: { type: 'Property', value: 'Rabat' },
  };

  try {
    await axios.post(`${SCORPIO}/ngsi-ld/v1/entities/`, district, {
      headers: LD_HEADERS, timeout: 10000
    });
    log.ok('Created District entity: Irfane-Rabat');
  } catch (e) {
    if (e.response?.status === 409) {
      log.info('District entity already exists');
    } else {
      log.warn(`District entity: ${e.response?.status || e.message}`);
    }
  }
}

// ── Migrate entities ──────────────────────────────────────────────────────────

async function migrateEntityType(entityType) {
  log.info(`Migrating ${entityType}...`);

  let entities = [];
  try {
    const r = await axios.get(
      `${ORION_V2}/v2/entities?type=${entityType}&limit=100`,
      { headers: V2_HEADERS, timeout: 10000 }
    );
    entities = r.data;
  } catch (e) {
    log.error(`Could not fetch ${entityType} from Orion: ${e.message}`);
    return 0;
  }

  let created = 0;
  for (const entity of entities) {
    let ldEntity = v2ToLD(entity);
    ldEntity = addRelationships(ldEntity, entityType);

    try {
      await axios.post(`${SCORPIO}/ngsi-ld/v1/entities/`, ldEntity, {
        headers: LD_HEADERS, timeout: 10000
      });
      created++;
    } catch (e) {
      if (e.response?.status === 409) {
        // Update existing
        try {
          const { '@context': ctx, id, type, ...attrs } = ldEntity;
          await axios.patch(
            `${SCORPIO}/ngsi-ld/v1/entities/${encodeURIComponent(ldEntity.id)}/attrs/`,
            { '@context': ctx, ...attrs },
            { headers: LD_HEADERS, timeout: 10000 }
          );
          created++;
        } catch (e2) {
          log.warn(`Update failed for ${entity.id}: ${e2.message}`);
        }
      } else {
        log.warn(`Failed ${entity.id}: ${e.response?.status} ${e.response?.data?.title || e.message}`);
      }
    }
    await sleep(100);
  }

  log.ok(`${entityType}: ${created}/${entities.length} entities migrated`);
  return created;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  'TrafficFlowObserved', 'Vehicle', 'WeatherObserved', 'GreenSpaceRecord',
  'OffStreetParking', 'AirQualityObserved', 'NoisePollutionObserved', 'StreetlightControlCabinet',
];

async function waitFor(url, name, retries = 20) {
  for (let i = 1; i <= retries; i++) {
    try {
      await axios.get(url, { timeout: 5000 });
      log.info(`${name} is ready`);
      return;
    } catch (_) {
      log.warn(`${name} not ready (${i}/${retries})`);
      if (i < retries) await sleep(5000);
    }
  }
  throw new Error(`${name} failed to become ready`);
}

async function main() {
  log.info('═'.repeat(55));
  log.info('  Irfane Smart City — NGSI-LD Migration');
  log.info('  Orion v2 → Scorpio (NGSI-LD)');
  log.info('═'.repeat(55));

  await waitFor(`${ORION_V2}/version`,               'Orion v2');
  await waitFor(`${SCORPIO}/q/health`,                 'Scorpio NGSI-LD');

  log.info('Creating district entity...');
  await createDistrictEntity();

  log.info(`Migrating ${ENTITY_TYPES.length} entity types...`);
  let total = 0;
  for (const type of ENTITY_TYPES) {
    total += await migrateEntityType(type);
  }

  log.info('═'.repeat(55));
  log.ok(`Migration complete: ${total} entities in Scorpio`);
  log.info('');
  log.info('Query NGSI-LD entities:');
  log.info('  curl http://localhost:9095/ngsi-ld/v1/entities/');
  log.info('');
  log.info('Query with context:');
  log.info('  curl -H "Accept: application/ld+json" \\');
  log.info('       http://localhost:9095/ngsi-ld/v1/entities/?type=TrafficFlowObserved');
  log.info('');
  log.info('Semantic relationships:');
  log.info('  All entities → linked to District: Irfane-Rabat');
  log.info('  Vehicles     → linked to Route: T1-Rabat');
  log.info('  Green spaces → linked to Organization: Commune-Rabat');
  log.info('═'.repeat(55));
}

main().catch(e => { log.error('Fatal:', e.message); process.exit(1); });
"use strict";

/**
 * Irfane Smart City -- Alert Webhook + Scorpio Bridge
 * ====================================================
 * Endpoints:
 *   POST   /alert            receive alert from Perseo
 *   GET    /alerts           list alerts
 *   GET    /alerts/latest    last 20 alerts
 *   GET    /alerts/summary   counts by type and severity
 *   DELETE /alerts           clear all alerts
 *   GET    /health           health check
 *   POST   /scorpio-bridge   Orion v2 → Scorpio NGSI-LD bridge
 */

const express = require("express");
const axios   = require("axios");
const app     = express();
app.use(express.json({ limit: '10mb' }));

// ── Config ────────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT        || 5050;
const SCORPIO_URL = process.env.SCORPIO_URL || 'http://scorpio:9090';
const MAX_ALERTS  = 1000;

// ── Logger ────────────────────────────────────────────────────────────────────
function ts() { return new Date().toTimeString().slice(0, 8); }
const log = {
  info:  (...a) => console.log(`[${ts()}] INFO `, ...a),
  warn:  (...a) => console.warn(`[${ts()}] WARN `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
};

// ── Alert metadata ────────────────────────────────────────────────────────────
const ALERT_META = {
  traffic_congestion:   { severity: "warning",  icon: "traffic"   },
  traffic_high_flow:    { severity: "warning",  icon: "traffic"   },
  high_temperature:     { severity: "warning",  icon: "weather"   },
  low_humidity:         { severity: "info",     icon: "weather"   },
  irrigation_needed:    { severity: "warning",  icon: "green"     },
  grass_poor:           { severity: "critical", icon: "green"     },
  tram_stopped:         { severity: "critical", icon: "transport" },
  parking_full:         { severity: "warning",  icon: "parking"   },
  parking_almost_full:  { severity: "info",     icon: "parking"   },
  high_pm25:            { severity: "warning",  icon: "air"       },
  high_no2:             { severity: "warning",  icon: "air"       },
  high_noise:           { severity: "info",     icon: "noise"     },
  high_wind:            { severity: "warning",  icon: "weather"   },
};

// ── In-memory alert store ─────────────────────────────────────────────────────
let alerts = [];
let nextId  = 1;

function storeAlert(data) {
  const alertType = data.alert_type || "unknown";
  const meta      = ALERT_META[alertType] || { severity: "info", icon: "general" };
  const alert = {
    id:          nextId++,
    timestamp:   new Date().toISOString(),
    alert_type:  alertType,
    entity_id:   data.entity_id   || "unknown",
    entity_type: data.entity_type || "unknown",
    value:       data.value       ?? null,
    message:     data.message     || "Alert triggered",
    severity:    meta.severity,
    icon:        meta.icon,
  };
  alerts.unshift(alert);
  if (alerts.length > MAX_ALERTS) alerts.pop();
  log.warn(`ALERT [${alert.severity.toUpperCase()}] ${alert.alert_type} | ${alert.entity_id} | value=${alert.value}`);
  return alert;
}

// ── Alert routes ──────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", alert_count: alerts.length, uptime_s: process.uptime() | 0 });
});

app.post("/alert", (req, res) => {
  const alert = storeAlert(req.body || {});
  res.status(200).json({ status: "received", id: alert.id });
});

app.get("/alerts", (req, res) => {
  const { type, entity, severity, limit = "100" } = req.query;
  const max = Math.min(parseInt(limit, 10) || 100, MAX_ALERTS);
  let result = [...alerts];
  if (type)     result = result.filter(a => a.alert_type === type);
  if (entity)   result = result.filter(a => a.entity_id  === entity);
  if (severity) result = result.filter(a => a.severity   === severity);
  res.json({ count: result.slice(0, max).length, total: result.length, alerts: result.slice(0, max) });
});

app.get("/alerts/latest", (req, res) => {
  res.json({ count: Math.min(20, alerts.length), alerts: alerts.slice(0, 20) });
});

app.get("/alerts/summary", (req, res) => {
  const byType = {}, bySeverity = {};
  for (const a of alerts) {
    byType[a.alert_type]   = (byType[a.alert_type]   || 0) + 1;
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
  }
  res.json({ total: alerts.length, by_type: byType, by_severity: bySeverity });
});

app.delete("/alerts", (req, res) => {
  const count = alerts.length;
  alerts = [];
  log.info(`Cleared ${count} alerts.`);
  res.json({ status: "cleared", count });
});

// ── NGSI-LD helpers ───────────────────────────────────────────────────────────

const LD_CONTEXT = [
  'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld',
  'https://smartdatamodels.org/context.jsonld',
];

function v2ToLD(entity) {
  const ld = {
    '@context': LD_CONTEXT,
    id:   `urn:ngsi-ld:${entity.type}:${entity.id.replace(/:/g, '-')}`,
    type: entity.type,
  };

  for (const [key, attr] of Object.entries(entity)) {
    if (['id', 'type'].includes(key)) continue;
    if (!attr || typeof attr !== 'object') continue;

    const val  = attr.value;
    const type = attr.type ?? 'Text';

    if (type === 'geo:point' && typeof val === 'string') {
      const [lat, lon] = val.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lon))
        ld[key] = { type: 'GeoProperty', value: { type: 'Point', coordinates: [lon, lat] } };
    } else if (type === 'Number'  || typeof val === 'number') {
      ld[key] = { type: 'Property', value: Number(val) };
    } else if (type === 'Boolean' || typeof val === 'boolean') {
      ld[key] = { type: 'Property', value: Boolean(val) };
    } else if (type === 'DateTime' && val) {
      ld[key] = { type: 'Property', value: { '@type': 'DateTime', '@value': val } };
    } else if (val !== undefined && val !== null) {
      ld[key] = { type: 'Property', value: String(val) };
    }
  }

  ld.locatedIn = { type: 'Relationship', object: 'urn:ngsi-ld:District:Irfane-Rabat' };
  if (entity.type === 'Vehicle')
    ld.hasRoute = { type: 'Relationship', object: 'urn:ngsi-ld:TransportRoute:T1-Rabat' };

  return ld;
}

// ── Scorpio bridge endpoint ───────────────────────────────────────────────────

app.post('/scorpio-bridge', async (req, res) => {
  res.status(200).send('OK'); // Ack Orion immediately

  const data = req.body?.data ?? [];
  for (const entity of data) {
    try {
      const ldEntity = v2ToLD(entity);
      const { '@context': ctx, id, type, ...attrs } = ldEntity;
      const patchUrl = `${SCORPIO_URL}/ngsi-ld/v1/entities/${encodeURIComponent(ldEntity.id)}/attrs/`;

      try {
        await axios.patch(patchUrl, { '@context': ctx, ...attrs }, {
          headers: { 'Content-Type': 'application/ld+json' },
          timeout: 8000,
        });
      } catch (e) {
        if (e.response?.status === 404) {
          await axios.post(`${SCORPIO_URL}/ngsi-ld/v1/entities/`, ldEntity, {
            headers: { 'Content-Type': 'application/ld+json' },
            timeout: 8000,
          });
        }
      }
    } catch (e) {
      log.warn(`Bridge failed for ${entity.id}: ${e.message}`);
    }
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log.info("═".repeat(52));
  log.info("  Irfane Smart City -- Webhook + Scorpio Bridge");
  log.info(`  Listening on http://0.0.0.0:${PORT}`);
  log.info("  POST /alert           receive Perseo alert");
  log.info("  GET  /alerts          list alerts");
  log.info("  GET  /alerts/summary  counts by type");
  log.info("  POST /scorpio-bridge  Orion v2 → NGSI-LD");
  log.info("═".repeat(52));
});
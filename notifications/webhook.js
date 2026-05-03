"use strict";

/**
 * Irfane Smart City -- Alert Webhook Receiver
 * ============================================
 * Receives POST notifications from Perseo CEP when alert rules fire.
 * Stores alerts in a capped in-memory array and exposes a REST API.
 *
 * Endpoints:
 *   POST   /alert            receive alert from Perseo
 *   GET    /alerts           list alerts (filter: type, entity, severity, limit)
 *   GET    /alerts/latest    last 20 alerts
 *   GET    /alerts/summary   counts by type and severity
 *   DELETE /alerts           clear all alerts
 *   GET    /health           health check
 */

const express = require("express");
const app = express();
app.use(express.json());

// ── config ────────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT       || 5050;
const LOG_LEVEL  = process.env.LOG_LEVEL  || "info";
const MAX_ALERTS = 1000;

// ── logger ────────────────────────────────────────────────────────────────────
const log = {
  info:    (...a) => console.log(`[${ts()}] INFO `, ...a),
  warn:    (...a) => console.warn(`[${ts()}] WARN `, ...a),
  error:   (...a) => console.error(`[${ts()}] ERROR`, ...a),
};
function ts() { return new Date().toTimeString().slice(0, 8); }

// ── alert metadata ────────────────────────────────────────────────────────────
const ALERT_META = {
  traffic_congestion:  { severity: "warning",  icon: "traffic"   },
  traffic_high_flow:   { severity: "warning",  icon: "traffic"   },
  high_temperature:    { severity: "warning",  icon: "weather"   },
  low_humidity:        { severity: "info",     icon: "weather"   },
  irrigation_needed:   { severity: "warning",  icon: "green"     },
  grass_poor:          { severity: "critical", icon: "green"     },
  tram_stopped:        { severity: "critical", icon: "transport" },
};

// ── in-memory store ───────────────────────────────────────────────────────────
let alerts = [];   // newest first
let nextId = 1;

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

  alerts.unshift(alert);                     // prepend — newest first
  if (alerts.length > MAX_ALERTS) alerts.pop(); // cap at MAX_ALERTS

  log.warn(
    `ALERT [${alert.severity.toUpperCase()}] ${alert.alert_type} | ` +
    `${alert.entity_id} | ${alert.message} | value=${alert.value}`
  );

  return alert;
}

// ── routes ────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", alert_count: alerts.length, uptime_s: process.uptime() | 0 });
});

// Receive alert from Perseo
app.post("/alert", (req, res) => {
  const data  = req.body || {};
  const alert = storeAlert(data);
  res.status(200).json({ status: "received", id: alert.id });
});

// List alerts with optional filters
app.get("/alerts", (req, res) => {
  const { type, entity, severity, limit = "100" } = req.query;
  const max = Math.min(parseInt(limit, 10) || 100, MAX_ALERTS);

  let result = [...alerts];
  if (type)     result = result.filter(a => a.alert_type  === type);
  if (entity)   result = result.filter(a => a.entity_id   === entity);
  if (severity) result = result.filter(a => a.severity    === severity);

  res.json({ count: result.slice(0, max).length, total: result.length, alerts: result.slice(0, max) });
});

// Latest 20 alerts
app.get("/alerts/latest", (req, res) => {
  res.json({ count: Math.min(20, alerts.length), alerts: alerts.slice(0, 20) });
});

// Summary counts
app.get("/alerts/summary", (req, res) => {
  const byType     = {};
  const bySeverity = {};
  for (const a of alerts) {
    byType[a.alert_type] = (byType[a.alert_type] || 0) + 1;
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
  }
  res.json({ total: alerts.length, by_type: byType, by_severity: bySeverity });
});

// Clear all alerts
app.delete("/alerts", (req, res) => {
  const count = alerts.length;
  alerts = [];
  log.info(`Cleared ${count} alerts.`);
  res.json({ status: "cleared", count });
});

// ── start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log.info("═".repeat(52));
  log.info("  Irfane Smart City -- Alert Webhook Receiver");
  log.info(`  Listening on http://0.0.0.0:${PORT}`);
  log.info("  POST   /alert          receive Perseo alert");
  log.info("  GET    /alerts         list all alerts");
  log.info("  GET    /alerts/latest  last 20 alerts");
  log.info("  GET    /alerts/summary counts by type");
  log.info("  DELETE /alerts         clear all");
  log.info("═".repeat(52));
});
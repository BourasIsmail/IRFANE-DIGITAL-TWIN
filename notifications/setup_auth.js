"use strict";

/**
 * setup_auth.js
 * =============
 * Configures Keyrock IDM for the Irfane Smart City Digital Twin:
 *   1. Creates the Orion application in Keyrock
 *   2. Creates roles: admin, operator, viewer
 *   3. Creates demo users and assigns roles
 *   4. Registers the PEP Proxy (Wilma) credentials
 *   5. Prints tokens for testing
 *
 * Run once after stack is up:
 *   docker exec idt-webhook node /app/setup_auth.js
 */

const axios = require("axios");

const KEYROCK_URL = process.env.KEYROCK_URL || "http://keyrock:3005";
const ADMIN_EMAIL = process.env.IDM_ADMIN_EMAIL || "admin@irfane.ma";
const ADMIN_PASS  = process.env.IDM_ADMIN_PASS  || "admin1234";

function ts() { return new Date().toTimeString().slice(0, 8); }
const log = {
  info:  (...a) => console.log(`[${ts()}] INFO `, ...a),
  ok:    (...a) => console.log(`[${ts()}] OK   `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
  warn:  (...a) => console.warn(`[${ts()}] WARN `, ...a),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForKeyrock(retries = 20, delay = 4000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await axios.get(`${KEYROCK_URL}/version`, { timeout: 5000 });
      log.info("Keyrock is ready.");
      return;
    } catch (e) {
      log.warn(`Keyrock not ready (${i}/${retries}): ${e.message}`);
      if (i < retries) await sleep(delay);
    }
  }
  throw new Error("Keyrock did not become ready.");
}

// ── get admin token ────────────────────────────────────────────────────────────

async function getAdminToken() {
  const r = await axios.post(
    `${KEYROCK_URL}/v1/auth/tokens`,
    { name: ADMIN_EMAIL, password: ADMIN_PASS },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );
  const token = r.headers["x-subject-token"];
  log.info(`Admin token obtained: ${token.slice(0, 16)}...`);
  return token;
}

function headers(token) {
  return { "X-Auth-Token": token, "Content-Type": "application/json" };
}

// ── application ───────────────────────────────────────────────────────────────

async function createApplication(token) {
  // Check if already exists
  const list = await axios.get(`${KEYROCK_URL}/v1/applications`, { headers: headers(token) });
  const existing = list.data.applications?.find(a => a.name === "Irfane Smart City");
  if (existing) {
    log.info(`Application already exists: ${existing.id}`);
    return existing.id;
  }

  const r = await axios.post(
    `${KEYROCK_URL}/v1/applications`,
    {
      application: {
        name:         "Irfane Smart City",
        description:  "Smart city digital twin for Irfane district, Rabat",
        redirect_uri: "http://localhost:3000/callback",
        url:          "http://localhost:3000",
        grant_type:   ["authorization_code", "password", "client_credentials"],
        token_types:  ["permanent"],
      }
    },
    { headers: headers(token) }
  );
  const appId = r.data.application.id;
  log.ok(`Application created: ${appId}`);
  return appId;
}

// ── roles ─────────────────────────────────────────────────────────────────────

async function createRole(token, appId, roleName) {
  // Check if already exists
  const list = await axios.get(
    `${KEYROCK_URL}/v1/applications/${appId}/roles`,
    { headers: headers(token) }
  );
  const existing = list.data.roles?.find(r => r.name === roleName);
  if (existing) {
    log.info(`Role already exists: ${roleName} (${existing.id})`);
    return existing.id;
  }

  const r = await axios.post(
    `${KEYROCK_URL}/v1/applications/${appId}/roles`,
    { role: { name: roleName } },
    { headers: headers(token) }
  );
  const roleId = r.data.role.id;
  log.ok(`Role created: ${roleName} (${roleId})`);
  return roleId;
}

// ── users ─────────────────────────────────────────────────────────────────────

async function createUser(token, username, email, password) {
  // Check if already exists
  try {
    const list = await axios.get(`${KEYROCK_URL}/v1/users`, { headers: headers(token) });
    const existing = list.data.users?.find(u => u.email === email);
    if (existing) {
      log.info(`User already exists: ${email} (${existing.id})`);
      return existing.id;
    }
  } catch (_) {}

  const r = await axios.post(
    `${KEYROCK_URL}/v1/users`,
    { user: { username, email, password } },
    { headers: headers(token) }
  );
  const userId = r.data.user.id;
  log.ok(`User created: ${email} (${userId})`);
  return userId;
}

async function assignRole(token, appId, userId, roleId) {
  try {
    await axios.post(
      `${KEYROCK_URL}/v1/applications/${appId}/users/${userId}/roles/${roleId}`,
      {},
      { headers: headers(token) }
    );
    log.ok(`Role assigned to user ${userId}`);
  } catch (e) {
    if (e.response?.status === 409) {
      log.info("Role already assigned.");
    } else {
      log.error(`Role assignment failed: ${e.message}`);
    }
  }
}

// ── PEP Proxy credentials ─────────────────────────────────────────────────────

async function createPepProxy(token, appId) {
  try {
    const r = await axios.post(
      `${KEYROCK_URL}/v1/applications/${appId}/pep_proxies`,
      {},
      { headers: headers(token) }
    );
    const pep = r.data.pep_proxy;
    log.ok(`PEP Proxy created: ${pep.id}`);
    return { id: pep.id, password: pep.password };
  } catch (e) {
    if (e.response?.status === 409) {
      log.info("PEP Proxy already exists for this app.");
      // Get existing
      const r = await axios.get(
        `${KEYROCK_URL}/v1/applications/${appId}/pep_proxies`,
        { headers: headers(token) }
      );
      const pep = r.data.pep_proxy;
      return { id: pep.id, password: "pep1234" }; // use configured password
    }
    throw e;
  }
}

// ── get user token (for testing) ──────────────────────────────────────────────

async function getUserToken(email, password) {
  try {
    const r = await axios.post(
      `${KEYROCK_URL}/v1/auth/tokens`,
      { name: email, password },
      { headers: { "Content-Type": "application/json" }, timeout: 5000 }
    );
    return r.headers["x-subject-token"];
  } catch (e) {
    log.error(`Could not get token for ${email}: ${e.message}`);
    return null;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  log.info("═".repeat(52));
  log.info("  Irfane Smart City -- Keyrock Auth Setup");
  log.info("═".repeat(52));

  await waitForKeyrock();
  const token = await getAdminToken();

  // 1. Create application
  const appId = await createApplication(token);

  // 2. Create roles
  const adminRoleId    = await createRole(token, appId, "admin");
  const operatorRoleId = await createRole(token, appId, "operator");
  const viewerRoleId   = await createRole(token, appId, "viewer");

  // 3. Create users
  const operatorId = await createUser(token, "operator", "operator@irfane.ma", "operator1234");
  const viewerId   = await createUser(token, "viewer",   "viewer@irfane.ma",   "viewer1234");

  // Assign admin role to the main admin user
  const adminList = await axios.get(`${KEYROCK_URL}/v1/users`, { headers: headers(token) });
  const adminUser = adminList.data.users?.find(u => u.email === ADMIN_EMAIL);
  if (adminUser) {
    await assignRole(token, appId, adminUser.id, adminRoleId);
  }
  await assignRole(token, appId, operatorId, operatorRoleId);
  await assignRole(token, appId, viewerId,   viewerRoleId);

  // 4. Create PEP Proxy
  const pep = await createPepProxy(token, appId);

  // 5. Print test tokens
  log.info("─".repeat(52));
  log.info("  Test tokens (valid for 1 hour by default):");
  log.info("─".repeat(52));

  const adminToken    = await getUserToken(ADMIN_EMAIL, ADMIN_PASS);
  const operatorToken = await getUserToken("operator@irfane.ma", "operator1234");
  const viewerToken   = await getUserToken("viewer@irfane.ma", "viewer1234");

  log.ok(`Admin token:    ${adminToken?.slice(0, 32)}...`);
  log.ok(`Operator token: ${operatorToken?.slice(0, 32)}...`);
  log.ok(`Viewer token:   ${viewerToken?.slice(0, 32)}...`);

  log.info("═".repeat(52));
  log.info("  Summary");
  log.info("═".repeat(52));
  log.info(`  Keyrock UI:     http://localhost:3005`);
  log.info(`  Application ID: ${appId}`);
  log.info(`  PEP Proxy ID:   ${pep.id}`);
  log.info(`  Orion (direct): http://localhost:1026  (internal)`);
  log.info(`  Orion (via PEP):http://localhost:1027  (external)`);
  log.info("");
  log.info("  Users created:");
  log.info(`    admin@irfane.ma    / admin1234    [admin]`);
  log.info(`    operator@irfane.ma / operator1234 [operator]`);
  log.info(`    viewer@irfane.ma   / viewer1234   [viewer]`);
  log.info("");
  log.info("  Usage (X-Auth-Token header on port 1027):");
  log.info(`    curl -H "X-Auth-Token: <token>" http://localhost:1027/v2/entities`);
  log.info("═".repeat(52));
}

main().catch(e => { log.error(`Fatal: ${e.message}`); process.exit(1); });